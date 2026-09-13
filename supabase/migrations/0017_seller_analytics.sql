-- 0017 — seller analytics (§2.8 #50).
--
-- One RPC for the whole dashboard analytics tab: a daily views+contacts
-- series (zero-filled, so a quiet day is a real zero, not a missing point),
-- a per-listing table, and totals — for the caller's own listings only.
-- Pure aggregates over listing_view_daily / listing_contact_daily /
-- seller_view_daily, which by design (migration 0005) carry no viewer
-- identity — there is nothing here to leak even in principle.

create or replace function public.fn_seller_analytics(p_seller_id uuid, p_days int)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with own_listings as (
    select id, slug, title from public.listings where seller_id = p_seller_id
  ),
  days as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  ),
  daily_views as (
    select lvd.day, sum(lvd.views) as views
    from public.listing_view_daily lvd
    join own_listings ol on ol.id = lvd.listing_id
    where lvd.day >= current_date - (p_days - 1)
    group by lvd.day
  ),
  daily_contacts as (
    select lcd.day, sum(lcd.count) as contacts
    from public.listing_contact_daily lcd
    join own_listings ol on ol.id = lcd.listing_id
    where lcd.day >= current_date - (p_days - 1)
    group by lcd.day
  ),
  daily as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'views', coalesce(dv.views, 0),
        'contacts', coalesce(dc.contacts, 0)
      ) order by d.day
    ), '[]'::jsonb) as arr
    from days d
    left join daily_views dv on dv.day = d.day
    left join daily_contacts dc on dc.day = d.day
  ),
  per_listing_views as (
    select lvd.listing_id, sum(lvd.views) as views
    from public.listing_view_daily lvd
    join own_listings ol on ol.id = lvd.listing_id
    where lvd.day >= current_date - (p_days - 1)
    group by lvd.listing_id
  ),
  per_listing_contacts as (
    select lcd.listing_id, sum(lcd.count) as contacts
    from public.listing_contact_daily lcd
    join own_listings ol on ol.id = lcd.listing_id
    where lcd.day >= current_date - (p_days - 1)
    group by lcd.listing_id
  ),
  per_listing as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'listingId', ol.id,
        'slug', ol.slug,
        'title', ol.title,
        'views', coalesce(plv.views, 0),
        'contacts', coalesce(plc.contacts, 0)
      ) order by coalesce(plv.views, 0) desc, ol.title
    ), '[]'::jsonb) as arr
    from own_listings ol
    left join per_listing_views plv on plv.listing_id = ol.id
    left join per_listing_contacts plc on plc.listing_id = ol.id
    where coalesce(plv.views, 0) > 0 or coalesce(plc.contacts, 0) > 0
  ),
  seller_views as (
    select coalesce(sum(views), 0) as views
    from public.seller_view_daily
    where seller_id = p_seller_id and day >= current_date - (p_days - 1)
  ),
  seller_totals as (
    select view_count, listing_count from public.sellers where id = p_seller_id
  )
  select jsonb_build_object(
    'days', p_days,
    'daily', (select arr from daily),
    'perListing', (select arr from per_listing),
    'totals', jsonb_build_object(
      'periodViews', (select coalesce(sum(dv.views), 0) from daily_views dv),
      'periodContacts', (select coalesce(sum(dc.contacts), 0) from daily_contacts dc),
      'storefrontViews', (select views from seller_views),
      'allTimeSellerViews', (select coalesce(view_count, 0) from seller_totals),
      'listingCount', (select coalesce(listing_count, 0) from seller_totals)
    )
  );
$$;

comment on function public.fn_seller_analytics is
  'Seller-scoped views/contacts analytics for the dashboard. Zero buyer identity anywhere in the source tables. See docs/backend-plan.md §2.8 #50.';
