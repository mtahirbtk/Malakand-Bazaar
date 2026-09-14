-- 0015 — fn_home_payload: include the seller's tehsil in the top-sellers card.
--
-- The front end's `Seller` type carries tehsilSlug as a required field
-- (fixture data always had it) even though SellerCard doesn't render it —
-- carrying it through here avoids a type escape hatch for one column.

create or replace function public.fn_home_payload()
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with settings as (
    select
      public.fn_setting_numeric('home.min_listings_per_shelf', 8)::int as min_shelf,
      public.fn_setting_numeric('home.min_rated_sellers', 4)::int as min_sellers,
      public.fn_setting_numeric('home.min_trending_listings', 20)::int as min_trending,
      public.fn_setting_numeric('home.shelf_size', 5)::int as shelf_size
  ),
  live_listings as (
    select * from public.listings
    where deleted_at is null and status = 'active' and moderation_status = 'approved'
  ),
  category_counts as (
    select c.slug, c.name_en, c.sort, count(l.id) as listing_count
    from public.categories c
    join live_listings l on l.category_slug = c.slug
    where c.parent_slug is null
    group by c.slug, c.name_en, c.sort
  ),
  qualifying_categories as (
    select cc.slug, cc.name_en, cc.sort
    from category_counts cc, settings s
    where cc.listing_count >= s.min_shelf
  ),
  -- fn_listing_item takes a public.listings row. That composite type only
  -- survives a whole-row reference (`l`) when `l` is aliased directly off
  -- the real table — once a row passes through a CTE like `live_listings`
  -- it becomes a plain `record` Postgres can't cast back, so the two blocks
  -- below re-query public.listings directly (same predicate as
  -- live_listings) instead of selecting from that CTE.
  shelves as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'categorySlug', qc.slug,
        'categoryName', qc.name_en,
        'items', (
          select coalesce(jsonb_agg(public.fn_listing_item(l) order by l.rank_score desc, l.id desc), '[]'::jsonb)
          from (
            select * from public.listings l2
            where l2.category_slug = qc.slug
              and l2.deleted_at is null and l2.status = 'active' and l2.moderation_status = 'approved'
            order by l2.rank_score desc, l2.id desc
            limit (select shelf_size from settings)
          ) l
        )
      )
      order by qc.sort
    ), '[]'::jsonb) as arr
    from qualifying_categories qc
  ),
  trending_window as (
    select listing_id, sum(views) as views_7d
    from public.listing_view_daily
    where day >= current_date - 6
    group by listing_id
  ),
  trending_ranked as (
    select l, row_number() over (order by tw.views_7d desc, l.rank_score desc, l.id desc) as rn
    from public.listings l
    join trending_window tw on tw.listing_id = l.id
    where l.deleted_at is null and l.status = 'active' and l.moderation_status = 'approved'
      and tw.views_7d > 0
  ),
  trending as (
    select coalesce(jsonb_agg(public.fn_listing_item(t.l) order by t.rn), '[]'::jsonb) as arr
    from trending_ranked t, settings s
    where t.rn <= s.shelf_size
  ),
  rated_sellers as (
    select * from public.sellers where status = 'active' and rating_count >= 1
  ),
  top_sellers_ranked as (
    select rs.*, row_number() over (order by rating_score desc, rating_count desc, id desc) as rn
    from rated_sellers rs
  ),
  top_sellers as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', s.id, 'slug', s.slug, 'name', s.name, 'tehsilSlug', s.tehsil_slug,
        'localityLabel', s.locality_label,
        'verified', s.verified, 'ratingAvg', s.rating_avg, 'ratingCount', s.rating_count,
        'responseMinutes', s.response_minutes, 'listingCount', s.listing_count, 'phone', s.phone
      )
      order by s.rn
    ), '[]'::jsonb) as arr
    from top_sellers_ranked s, settings st
    where s.rn <= st.shelf_size
  )
  select jsonb_build_object(
    'readiness', jsonb_build_object(
      'showTrending', (select count(*) from trending_window) >= (select min_trending from settings),
      'showTopSellers', (select count(*) from rated_sellers) >= (select min_sellers from settings)
    ),
    'shelves', (select arr from shelves),
    'trending', (select arr from trending),
    'topSellers', (select arr from top_sellers),
    'counters', jsonb_build_object(
      'totalActiveListings', (select count(*) from live_listings),
      'totalSellers', (select count(*) from public.sellers where status = 'active')
    )
  );
$$;
