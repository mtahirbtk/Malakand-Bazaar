-- 0013 — listing detail page reads (§2.3 #18-20).
--
-- All three return the same listing item shape fn_search_listings uses (so
-- the service layer has one row mapper), plus #18 additionally embeds the
-- seller card. Written as SQL functions rather than plain PostgREST embeds
-- because `coordinates` is a PostGIS geography column — selected raw through
-- PostgREST it comes back as WKB hex, not { lat, lng }, so every read that
-- needs coordinates goes through SQL like fn_search_listings already does.

create or replace function public.fn_listing_item(l public.listings)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'id', l.id, 'slug', l.slug, 'title', l.title,
    'description', left(l.description, 240),
    'price', l.price, 'compareAtPrice', l.compare_at_price,
    'categorySlug', l.category_slug, 'subcategorySlug', l.subcategory_slug,
    'tehsilSlug', l.tehsil_slug, 'localitySlug', l.locality_slug, 'localityLabel', l.locality_label,
    'images', coalesce(
      (select jsonb_agg(li.path order by li.sort, li.created_at)
         from public.listing_images li where li.listing_id = l.id),
      '[]'::jsonb
    ),
    'contactPhone', l.contact_phone, 'sellerId', l.seller_id, 'status', l.status,
    'createdAt', l.published_at,
    'coordinates', case when st_x(l.coordinates::geometry) is null then null
      else jsonb_build_object('lat', st_y(l.coordinates::geometry), 'lng', st_x(l.coordinates::geometry))
    end
  );
$$;

create or replace function public.fn_get_listing_by_slug(p_slug citext)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'listing', jsonb_build_object(
      'id', l.id, 'slug', l.slug, 'title', l.title, 'description', l.description,
      'price', l.price, 'compareAtPrice', l.compare_at_price,
      'categorySlug', l.category_slug, 'subcategorySlug', l.subcategory_slug,
      'tehsilSlug', l.tehsil_slug, 'localitySlug', l.locality_slug, 'localityLabel', l.locality_label,
      'images', coalesce(
        (select jsonb_agg(li.path order by li.sort, li.created_at)
           from public.listing_images li where li.listing_id = l.id),
        '[]'::jsonb
      ),
      'contactPhone', l.contact_phone, 'sellerId', l.seller_id, 'status', l.status,
      'createdAt', l.published_at,
      'coordinates', case when st_x(l.coordinates::geometry) is null then null
        else jsonb_build_object('lat', st_y(l.coordinates::geometry), 'lng', st_x(l.coordinates::geometry))
      end
    ),
    'seller', jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'name', s.name, 'phone', s.phone,
      'tehsilSlug', s.tehsil_slug, 'localityLabel', s.locality_label,
      'coordinates', case when st_x(s.coordinates::geometry) is null then null
        else jsonb_build_object('lat', st_y(s.coordinates::geometry), 'lng', st_x(s.coordinates::geometry))
      end,
      'avatarPath', s.avatar_path, 'bannerPath', s.banner_path,
      'verified', s.verified, 'ratingAvg', s.rating_avg, 'ratingCount', s.rating_count,
      'responseMinutes', s.response_minutes, 'listingCount', s.listing_count
    )
  )
  from public.listings l
  join public.sellers s on s.id = l.seller_id
  where l.slug = p_slug
    and l.deleted_at is null
    and l.moderation_status = 'approved'
  limit 1;
$$;

comment on function public.fn_get_listing_by_slug is
  'Listing detail: GET /api/listings/:slug — listing + seller card in one round trip.';

-- #19 — related: same subcategory, else same category, else same tehsil.
-- Excludes self, live listings only, best-ranked first.
create or replace function public.fn_related_listings(p_listing_id uuid, p_limit int default 6)
returns jsonb
language plpgsql
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_category citext;
  v_subcategory citext;
  v_tehsil citext;
  v_result jsonb;
begin
  select category_slug, subcategory_slug, tehsil_slug
    into v_category, v_subcategory, v_tehsil
    from public.listings
   where id = p_listing_id and deleted_at is null;

  if not found then
    return '[]'::jsonb;
  end if;

  -- `l` carries only the listings columns (the tier/rn bookkeeping lives on
  -- the subquery alias `t`, not mixed into the row) so it still matches the
  -- public.listings composite type fn_listing_item expects.
  select coalesce(jsonb_agg(public.fn_listing_item(t.l) order by t.rn), '[]'::jsonb) into v_result
  from (
    select l, row_number() over (
      order by
        case
          when l.subcategory_slug = v_subcategory then 0
          when l.category_slug = v_category then 1
          else 2
        end,
        l.rank_score desc, l.id desc
    ) as rn
    from public.listings l
    where l.id <> p_listing_id
      and l.deleted_at is null
      and l.status = 'active'
      and l.moderation_status = 'approved'
      and (l.subcategory_slug = v_subcategory or l.category_slug = v_category or l.tehsil_slug = v_tehsil)
  ) t
  where t.rn <= greatest(p_limit, 1);

  return v_result;
end;
$$;

comment on function public.fn_related_listings is
  'GET /api/listings/:slug/related — same subcategory, then category, then tehsil.';

-- #20 — other live listings from the same seller.
create or replace function public.fn_seller_other_listings(
  p_seller_id uuid, p_exclude_id uuid default null, p_limit int default 5
)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select coalesce(jsonb_agg(public.fn_listing_item(l)), '[]'::jsonb)
  from (
    select * from public.listings l
    where l.seller_id = p_seller_id
      and (p_exclude_id is null or l.id <> p_exclude_id)
      and l.deleted_at is null
      and l.status = 'active'
      and l.moderation_status = 'approved'
    order by l.rank_score desc, l.id desc
    limit greatest(p_limit, 1)
  ) l;
$$;

comment on function public.fn_seller_other_listings is
  'GET /api/listings/:slug/seller-others — the seller''s other live listings.';
