-- 0019 — fn_seller_private: GET/PATCH /api/seller/me needs the seller's own
-- coordinates, and a plain PostgREST `select coordinates` returns raw WKB hex
-- (`0101000020E61...`), not something a client can use. Every other place
-- that reads a lat/lng back out of `geography(Point,4326)` already goes
-- through a SQL function (fn_get_listing_by_slug, 0013) for the same reason;
-- this is that function's sellers-table counterpart.

create or replace function public.fn_seller_private(p_seller_id uuid)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'name', s.name,
    'description', s.description,
    'phone', s.phone,
    'tehsilSlug', s.tehsil_slug,
    'localitySlug', s.locality_slug,
    'localityLabel', s.locality_label,
    'coordinates', case when s.coordinates is null then null
      else jsonb_build_object('lat', ST_Y(s.coordinates::geometry), 'lng', ST_X(s.coordinates::geometry)) end,
    'verified', s.verified,
    'ratingAvg', s.rating_avg,
    'ratingCount', s.rating_count,
    'listingCount', s.listing_count,
    'avatarPath', s.avatar_path,
    'bannerPath', s.banner_path,
    'createdAt', s.created_at
  )
  from public.sellers s
  where s.id = p_seller_id;
$$;

comment on function public.fn_seller_private is
  'The seller''s own profile, coordinates included as {lat,lng} — see GET/PATCH /api/seller/me.';
