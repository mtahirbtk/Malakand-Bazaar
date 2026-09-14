-- 0004 — the marketplace itself: sellers, listings, images, reviews, favourites.

create table if not exists public.sellers (
  id             uuid primary key default extensions.gen_random_uuid(),
  user_id        uuid not null unique references public.users(id) on delete cascade,

  -- Immutable after creation: storefront URLs must not rot.
  slug           citext not null unique,

  name           text not null,
  description    text,

  -- The shop's public number. Deliberately separate from the login phone —
  -- a seller may publish a different number (docs/decisions.md).
  phone          text not null,

  tehsil_slug    citext references public.tehsils(slug),
  locality_slug  citext references public.localities(slug),
  locality_label text,
  coordinates    extensions.geography(Point, 4326),

  -- Supabase Storage object paths, not URLs.
  avatar_path    text,
  banner_path    text,

  verified       boolean not null default false,
  verified_at    timestamptz,

  -- Maintained by trigger from public.reviews. Never written by application code.
  rating_avg     numeric(3,2) not null default 0,
  rating_count   int          not null default 0,
  -- Bayesian-smoothed sort key; see fn_rating_score in 0007.
  rating_score   double precision not null default 0,

  listing_count  int    not null default 0,
  view_count     bigint not null default 0,
  contact_count  bigint not null default 0,

  response_minutes int not null default 30,

  status         public.seller_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint sellers_name_len_chk check (char_length(name) between 2 and 80),
  constraint sellers_description_len_chk check (description is null or char_length(description) <= 2000),
  constraint sellers_phone_e164_chk check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint sellers_rating_avg_chk check (rating_avg >= 0 and rating_avg <= 5)
);

create index if not exists sellers_rank_idx
  on public.sellers (rating_score desc, rating_count desc, created_at desc)
  where status = 'active';
create index if not exists sellers_tehsil_idx
  on public.sellers (tehsil_slug) where status = 'active';
create index if not exists sellers_verified_idx
  on public.sellers (verified) where status = 'active' and verified;
create index if not exists sellers_coordinates_idx
  on public.sellers using gist (coordinates);
create index if not exists sellers_name_trgm_idx
  on public.sellers using gin (name extensions.gin_trgm_ops);

drop trigger if exists trg_sellers_touch on public.sellers;
create trigger trg_sellers_touch before update on public.sellers
  for each row execute function public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id                uuid primary key default extensions.gen_random_uuid(),
  slug              citext not null unique,
  seller_id         uuid not null references public.sellers(id) on delete cascade,

  title             text not null,
  description       text not null,

  price             numeric(12,2) not null,
  compare_at_price  numeric(12,2),

  category_slug     citext not null references public.categories(slug),
  subcategory_slug  citext references public.categories(slug),

  tehsil_slug       citext references public.tehsils(slug),
  locality_slug     citext references public.localities(slug),
  locality_label    text,
  coordinates       extensions.geography(Point, 4326),

  -- Listing contact number, prefilled from the seller's but independently set.
  contact_phone     text not null,

  status            public.listing_status    not null default 'active',
  moderation_status public.moderation_status not null default 'approved',
  rejection_reason  text,

  -- Maintained by fn_bump_view / fn_bump_contact. Never written directly.
  view_count        bigint not null default 0,
  contact_count     bigint not null default 0,
  -- Default browse sort key: views lifted, age decayed. See fn_rank_score.
  rank_score        double precision not null default 0,

  -- Ships unused (docs/decisions.md): no per-category attribute schema, but the
  -- column costs nothing now and avoids a migration if structured fields land.
  attributes        jsonb not null default '{}'::jsonb,

  -- 'simple' rather than 'english': listings mix English, transliterated Pashto
  -- and Urdu, so stemming an English dictionary over them does more harm
  -- than good. Trigram search on title covers the fuzzy half.
  search_vector     tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(locality_label, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,

  published_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  constraint listings_title_len_chk check (char_length(title) between 4 and 140),
  constraint listings_description_len_chk check (char_length(description) between 10 and 5000),
  constraint listings_price_chk check (price > 0 and price <= 9999999999),
  constraint listings_compare_at_chk check (compare_at_price is null or compare_at_price > price),
  constraint listings_contact_phone_chk check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- A subcategory must not be a top-level slug; enforced properly by trigger below.
  constraint listings_subcategory_distinct_chk check (subcategory_slug is distinct from category_slug)
);

-- The default browse path. One composite index answers
-- "live listings, best first, keyset-paginated".
create index if not exists listings_browse_idx
  on public.listings (rank_score desc, id desc)
  where deleted_at is null and status = 'active' and moderation_status = 'approved';

create index if not exists listings_category_browse_idx
  on public.listings (category_slug, rank_score desc, id desc)
  where deleted_at is null and status = 'active' and moderation_status = 'approved';

create index if not exists listings_subcategory_browse_idx
  on public.listings (subcategory_slug, rank_score desc, id desc)
  where deleted_at is null and status = 'active' and moderation_status = 'approved';

create index if not exists listings_tehsil_browse_idx
  on public.listings (tehsil_slug, rank_score desc, id desc)
  where deleted_at is null and status = 'active' and moderation_status = 'approved';

create index if not exists listings_price_idx
  on public.listings (price)
  where deleted_at is null and status = 'active' and moderation_status = 'approved';

create index if not exists listings_recent_idx
  on public.listings (published_at desc)
  where deleted_at is null and status = 'active' and moderation_status = 'approved';

-- Seller dashboard: every status, newest first.
create index if not exists listings_seller_idx
  on public.listings (seller_id, created_at desc) where deleted_at is null;

-- Moderation queue.
create index if not exists listings_moderation_idx
  on public.listings (moderation_status, created_at)
  where deleted_at is null and moderation_status = 'pending';

create index if not exists listings_search_idx on public.listings using gin (search_vector);
create index if not exists listings_title_trgm_idx
  on public.listings using gin (title extensions.gin_trgm_ops);
create index if not exists listings_coordinates_idx
  on public.listings using gist (coordinates);

drop trigger if exists trg_listings_touch on public.listings;
create trigger trg_listings_touch before update on public.listings
  for each row execute function public.fn_touch_updated_at();

-- Referential integrity the FK cannot express: category_slug must be top level,
-- subcategory_slug must be a child of it.
create or replace function public.fn_listings_category_chk()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_parent citext;
begin
  if exists (select 1 from public.categories
              where slug = new.category_slug and parent_slug is not null) then
    raise exception '% is a subcategory and cannot be used as category_slug', new.category_slug;
  end if;

  if new.subcategory_slug is not null then
    select parent_slug into v_parent from public.categories where slug = new.subcategory_slug;
    if v_parent is null then
      raise exception '% is a top-level category and cannot be used as subcategory_slug',
        new.subcategory_slug;
    end if;
    if v_parent <> new.category_slug then
      raise exception 'subcategory % belongs to % , not %',
        new.subcategory_slug, v_parent, new.category_slug;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listings_category on public.listings;
create trigger trg_listings_category before insert or update of category_slug, subcategory_slug
  on public.listings
  for each row execute function public.fn_listings_category_chk();

-- ---------------------------------------------------------------------------

create table if not exists public.listing_images (
  id         uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  -- Supabase Storage object path within SUPABASE_STORAGE_BUCKET.
  path       text not null,
  width      int,
  height     int,
  bytes      int,
  sort       int  not null default 0,
  created_at timestamptz not null default now(),

  constraint listing_images_sort_chk check (sort >= 0 and sort < 12)
);

create index if not exists listing_images_listing_idx
  on public.listing_images (listing_id, sort);
create unique index if not exists listing_images_path_unique_idx
  on public.listing_images (path);

-- ---------------------------------------------------------------------------

create table if not exists public.reviews (
  id         uuid primary key default extensions.gen_random_uuid(),
  seller_id  uuid not null references public.sellers(id) on delete cascade,
  buyer_id   uuid not null references public.users(id) on delete cascade,
  rating     smallint not null,
  comment    text,
  status     public.review_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_rating_chk check (rating between 1 and 5),
  constraint reviews_comment_len_chk check (comment is null or char_length(comment) <= 1500),
  -- One review per buyer per seller. Editing replaces, it does not accumulate.
  constraint reviews_one_per_buyer_uniq unique (seller_id, buyer_id)
);

create index if not exists reviews_seller_recent_idx
  on public.reviews (seller_id, created_at desc) where status = 'visible';
create index if not exists reviews_buyer_idx on public.reviews (buyer_id, created_at desc);

drop trigger if exists trg_reviews_touch on public.reviews;
create trigger trg_reviews_touch before update on public.reviews
  for each row execute function public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.favorites (
  user_id    uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists favorites_user_recent_idx
  on public.favorites (user_id, created_at desc);
