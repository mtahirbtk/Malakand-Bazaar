-- 0020 — homepage simplification: one "Top Listings" shelf, no thresholds.
--
-- Replaces the category-shelves / trending / top-sellers gating from 0014
-- with a single ranked list: highest lifetime view_count first, most
-- recently published as the tiebreak, capped at `home.top_listings_size`.
-- No minimum-count gate — the shelf renders as soon as there's one listing.

create or replace function public.fn_home_payload()
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with settings as (
    select public.fn_setting_numeric('home.top_listings_size', 12)::int as top_size
  ),
  live_listings as (
    select * from public.listings
    where deleted_at is null and status = 'active' and moderation_status = 'approved'
  ),
  top_listings as (
    select coalesce(jsonb_agg(public.fn_listing_item(l) order by l.view_count desc, l.published_at desc, l.id desc), '[]'::jsonb) as arr
    from (
      select * from live_listings
      order by view_count desc, published_at desc, id desc
      limit (select top_size from settings)
    ) l
  )
  select jsonb_build_object(
    'topListings', (select arr from top_listings),
    'counters', jsonb_build_object(
      'totalActiveListings', (select count(*) from live_listings),
      'totalSellers', (select count(*) from public.sellers where status = 'active')
    )
  );
$$;

comment on function public.fn_home_payload is
  'GET /api/home: top listings (view_count desc, published_at desc, no minimum) + counters, one round trip.';
