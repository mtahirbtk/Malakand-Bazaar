-- 0012 — fn_search_listings: include a description snippet.
--
-- The `Listing` type the front end already renders everywhere requires
-- `description`; the search result cards don't show the full 5000-char body,
-- so this carries a bounded snippet rather than the whole column.

create or replace function public.fn_search_listings(
  p_q             text    default null,
  p_category      citext  default null,
  p_subcategory   citext  default null,
  p_tehsils       citext[] default null,
  p_locality      citext  default null,
  p_min_price     numeric default null,
  p_max_price     numeric default null,
  p_verified_only boolean default false,
  p_availability  text    default 'active',
  p_seller_id     uuid    default null,
  p_sort          text    default 'relevant',
  p_page          int     default 1,
  p_limit         int     default 24
)
returns jsonb
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with q as (
    select nullif(trim(p_q), '') as text
  ),
  filtered as (
    select
      l.id, l.slug, l.title, l.description, l.price, l.compare_at_price, l.category_slug,
      l.subcategory_slug, l.tehsil_slug, l.locality_slug, l.locality_label,
      l.contact_phone, l.status, l.seller_id, l.rank_score, l.published_at,
      case when st_x(l.coordinates::geometry) is null then null
           else jsonb_build_object('lat', st_y(l.coordinates::geometry), 'lng', st_x(l.coordinates::geometry))
      end as coordinates,
      coalesce(
        (select jsonb_agg(li.path order by li.sort, li.created_at)
           from public.listing_images li where li.listing_id = l.id),
        '[]'::jsonb
      ) as images,
      case when (select text from q) is null then 0::real
           else ts_rank(l.search_vector, websearch_to_tsquery('simple', (select text from q)))
      end as text_rank
    from public.listings l
    join public.sellers s on s.id = l.seller_id
    where l.deleted_at is null
      and l.moderation_status = 'approved'
      and (p_availability = 'all' or l.status = 'active')
      and (p_seller_id is null or l.seller_id = p_seller_id)
      and (p_category is null or l.category_slug = p_category)
      and (p_subcategory is null or l.subcategory_slug = p_subcategory)
      and (p_tehsils is null or array_length(p_tehsils, 1) is null or l.tehsil_slug = any(p_tehsils))
      and (p_locality is null or l.locality_slug = p_locality)
      and (p_min_price is null or l.price >= p_min_price)
      and (p_max_price is null or l.price <= p_max_price)
      and (not p_verified_only or s.verified)
      and (
        (select text from q) is null
        or l.search_vector @@ websearch_to_tsquery('simple', (select text from q))
      )
  ),
  ordered as (
    select *, row_number() over (
      order by
        case when p_sort = 'price_low' then price end asc nulls last,
        case when p_sort = 'price_high' then price end desc nulls last,
        case when p_sort = 'date_new' then published_at end desc nulls last,
        case when p_sort = 'date_old' then published_at end asc nulls last,
        case when p_sort in ('relevant', 'featured') then text_rank end desc nulls last,
        rank_score desc,
        id desc
    ) as rn
    from filtered
  ),
  paged as (
    select * from ordered
    where rn > greatest(p_page - 1, 0) * p_limit
      and rn <= greatest(p_page - 1, 0) * p_limit + p_limit
  ),
  items as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id, 'slug', slug, 'title', title,
        'description', left(description, 240),
        'price', price, 'compareAtPrice', compare_at_price,
        'categorySlug', category_slug, 'subcategorySlug', subcategory_slug,
        'tehsilSlug', tehsil_slug, 'localitySlug', locality_slug, 'localityLabel', locality_label,
        'images', images, 'contactPhone', contact_phone, 'sellerId', seller_id,
        'status', status, 'createdAt', published_at, 'coordinates', coordinates
      ) order by rn
    ), '[]'::jsonb) as arr
    from paged
  ),
  category_facets as (
    select coalesce(jsonb_object_agg(category_slug, cnt), '{}'::jsonb) as obj
    from (select category_slug, count(*) as cnt from filtered group by category_slug) c
  ),
  tehsil_facets as (
    select coalesce(jsonb_object_agg(tehsil_slug, cnt), '{}'::jsonb) as obj
    from (select tehsil_slug, count(*) as cnt from filtered where tehsil_slug is not null group by tehsil_slug) t
  ),
  totals as (
    select count(*) as total, min(price) as min_price, max(price) as max_price from filtered
  )
  select jsonb_build_object(
    'items', (select arr from items),
    'facets', jsonb_build_object(
      'category', (select obj from category_facets),
      'tehsil', (select obj from tehsil_facets),
      'minPrice', (select min_price from totals),
      'maxPrice', (select max_price from totals)
    ),
    'total', (select total from totals),
    'page', greatest(p_page, 1),
    'limit', p_limit
  );
$$;
