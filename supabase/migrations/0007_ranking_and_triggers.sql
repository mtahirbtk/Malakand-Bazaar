-- 0007 — ranking maths, counter bumps, aggregate triggers, slug generation.

-- ---------------------------------------------------------------------------
-- Ranking
--
--   rank_score = (views + 1) / (hours_since_published + offset) ^ exponent
--
-- Views lift a listing; age pulls it back down. The consequence the product
-- wants: nothing sits at the top merely because it was posted last. A brand
-- new listing starts near 0.4 and has to earn attention to hold position.
--
-- Constants live in public.settings so they are tunable without a deploy.
-- ---------------------------------------------------------------------------

create or replace function public.fn_rank_score(
  p_views        bigint,
  p_published_at timestamptz
)
returns double precision
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select (p_views + 1)::double precision
       / power(
           greatest(extract(epoch from (now() - p_published_at)) / 3600.0, 0)
             + public.fn_setting_numeric('ranking.gravity_offset_hours', 2)::double precision,
           public.fn_setting_numeric('ranking.gravity_exponent', 1.4)::double precision
         );
$$;

-- Bayesian-smoothed seller rating. A single five-star review scores below a
-- 4.6 average over forty reviews, which is both fairer and removes the
-- incentive to farm one rating.
create or replace function public.fn_rating_score(p_sum numeric, p_count int)
returns double precision
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select case when p_count = 0 then 0::double precision else
    ((public.fn_setting_numeric('ranking.rating_prior_weight', 5)
      * public.fn_setting_numeric('ranking.rating_prior_mean', 4.0)
      + p_sum)
     / (public.fn_setting_numeric('ranking.rating_prior_weight', 5) + p_count)
    )::double precision
  end;
$$;

-- Recomputes rank_score for every live listing. Scheduled by pg_cron (0009) so
-- age decay actually moves between views.
create or replace function public.fn_refresh_rank_scores()
returns int
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_rows int;
begin
  update public.listings
     set rank_score = public.fn_rank_score(view_count, published_at)
   where deleted_at is null
     and status = 'active'
     and moderation_status = 'approved';
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- ---------------------------------------------------------------------------
-- Counter bumps
--
-- One statement each, no read-modify-write, no transaction held across a
-- network round trip — so a listing going viral cannot serialise on its row.
-- ---------------------------------------------------------------------------

create or replace function public.fn_bump_view(p_listing_id uuid)
returns void
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
begin
  update public.listings
     set view_count = view_count + 1,
         rank_score = public.fn_rank_score(view_count + 1, published_at)
   where id = p_listing_id and deleted_at is null;

  if not found then
    return;
  end if;

  insert into public.listing_view_daily (listing_id, day, views)
       values (p_listing_id, current_date, 1)
  on conflict (listing_id, day) do update
     set views = public.listing_view_daily.views + 1;
end;
$$;

comment on function public.fn_bump_view is
  'Counts one listing view. Stores nothing about the viewer, by design.';

create or replace function public.fn_bump_contact(
  p_listing_id uuid,
  p_channel    public.contact_channel
)
returns void
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_seller_id uuid;
begin
  update public.listings
     set contact_count = contact_count + 1
   where id = p_listing_id and deleted_at is null
  returning seller_id into v_seller_id;

  if v_seller_id is null then
    return;
  end if;

  insert into public.listing_contact_daily (listing_id, day, channel, count)
       values (p_listing_id, current_date, p_channel, 1)
  on conflict (listing_id, day, channel) do update
     set count = public.listing_contact_daily.count + 1;

  update public.sellers set contact_count = contact_count + 1 where id = v_seller_id;
end;
$$;

create or replace function public.fn_bump_seller_view(p_seller_id uuid)
returns void
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
begin
  update public.sellers set view_count = view_count + 1 where id = p_seller_id;

  if not found then
    return;
  end if;

  insert into public.seller_view_daily (seller_id, day, views)
       values (p_seller_id, current_date, 1)
  on conflict (seller_id, day) do update
     set views = public.seller_view_daily.views + 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aggregate maintenance. Application code never writes rating_avg,
-- rating_count, rating_score or listing_count — these triggers own them.
-- ---------------------------------------------------------------------------

create or replace function public.fn_recalc_seller_rating(p_seller_id uuid)
returns void
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_sum   numeric := 0;
  v_count int     := 0;
begin
  select coalesce(sum(rating), 0), count(*)
    into v_sum, v_count
    from public.reviews
   where seller_id = p_seller_id and status = 'visible';

  update public.sellers
     set rating_count = v_count,
         rating_avg   = case when v_count = 0 then 0
                             else round(v_sum::numeric / v_count, 2) end,
         rating_score = public.fn_rating_score(v_sum, v_count)
   where id = p_seller_id;
end;
$$;

create or replace function public.trg_reviews_aggregate()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recalc_seller_rating(old.seller_id);
    return old;
  end if;

  perform public.fn_recalc_seller_rating(new.seller_id);
  -- A moved review (shouldn't happen, but the trigger must be total).
  if tg_op = 'UPDATE' and old.seller_id <> new.seller_id then
    perform public.fn_recalc_seller_rating(old.seller_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_aggregate on public.reviews;
create trigger trg_reviews_aggregate
  after insert or update or delete on public.reviews
  for each row execute function public.trg_reviews_aggregate();

-- A seller cannot review their own storefront. Cross-table, so it is a trigger
-- rather than a check constraint.
create or replace function public.fn_reviews_no_self()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if exists (
    select 1 from public.sellers
     where id = new.seller_id and user_id = new.buyer_id
  ) then
    raise exception 'a seller cannot review their own storefront'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_no_self on public.reviews;
create trigger trg_reviews_no_self before insert or update on public.reviews
  for each row execute function public.fn_reviews_no_self();

-- listing_count tracks what a visitor actually sees on the storefront.
create or replace function public.fn_recalc_seller_listing_count(p_seller_id uuid)
returns void
language sql
volatile
set search_path = public, extensions, pg_temp
as $$
  update public.sellers s
     set listing_count = (
       select count(*) from public.listings l
        where l.seller_id = p_seller_id
          and l.deleted_at is null
          and l.status = 'active'
          and l.moderation_status = 'approved'
     )
   where s.id = p_seller_id;
$$;

create or replace function public.trg_listings_count()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recalc_seller_listing_count(old.seller_id);
    return old;
  end if;
  perform public.fn_recalc_seller_listing_count(new.seller_id);
  if tg_op = 'UPDATE' and old.seller_id <> new.seller_id then
    perform public.fn_recalc_seller_listing_count(old.seller_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_listings_count on public.listings;
create trigger trg_listings_count
  after insert or delete or update of status, moderation_status, deleted_at, seller_id
  on public.listings
  for each row execute function public.trg_listings_count();

-- New listings get their initial rank_score without waiting for the cron.
create or replace function public.fn_listings_initial_rank()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.rank_score := public.fn_rank_score(coalesce(new.view_count, 0), coalesce(new.published_at, now()));
  return new;
end;
$$;

drop trigger if exists trg_listings_initial_rank on public.listings;
create trigger trg_listings_initial_rank before insert on public.listings
  for each row execute function public.fn_listings_initial_rank();

-- ---------------------------------------------------------------------------
-- Slug generation. Server-side so two concurrent posts cannot agree on a slug
-- and one lose to the unique index after passing an application-level check.
-- ---------------------------------------------------------------------------

create or replace function public.fn_unique_listing_slug(p_title text)
returns citext
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_base text := public.fn_slugify(p_title, 'listing');
  v_try  text;
  v_n    int := 1;
begin
  -- Leave room for the numeric suffix inside a sane URL length.
  v_base := left(v_base, 72);
  v_try  := v_base;
  while exists (select 1 from public.listings where slug = v_try::citext) loop
    v_n := v_n + 1;
    v_try := v_base || '-' || v_n;
    if v_n > 5000 then
      v_try := v_base || '-' || replace(extensions.gen_random_uuid()::text, '-', '');
      exit;
    end if;
  end loop;
  return v_try::citext;
end;
$$;

create or replace function public.fn_unique_seller_slug(p_name text)
returns citext
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_base text := public.fn_slugify(p_name, 'store');
  v_try  text;
  v_n    int := 1;
begin
  v_base := left(v_base, 60);
  v_try  := v_base;
  while exists (select 1 from public.sellers where slug = v_try::citext) loop
    v_n := v_n + 1;
    v_try := v_base || '-' || v_n;
    if v_n > 5000 then
      v_try := v_base || '-' || replace(extensions.gen_random_uuid()::text, '-', '');
      exit;
    end if;
  end loop;
  return v_try::citext;
end;
$$;

-- ---------------------------------------------------------------------------
-- Nightly housekeeping.
-- ---------------------------------------------------------------------------

create or replace function public.fn_sweep()
returns jsonb
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_sessions int;
  v_limits   int;
  v_views    int;
begin
  delete from public.sessions
   where expires_at < now() - interval '7 days'
      or (revoked_at is not null and revoked_at < now() - interval '30 days');
  get diagnostics v_sessions = row_count;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_limits = row_count;

  delete from public.listing_view_daily where day < current_date - 400;
  get diagnostics v_views = row_count;

  delete from public.listing_contact_daily where day < current_date - 400;
  delete from public.seller_view_daily where day < current_date - 400;

  return jsonb_build_object(
    'sessions_deleted', v_sessions,
    'rate_limits_deleted', v_limits,
    'view_rows_deleted', v_views
  );
end;
$$;
