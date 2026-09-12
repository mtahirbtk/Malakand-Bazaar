-- 0006 — operations: reports, rate limiting, audit log, tunable settings.

create table if not exists public.reports (
  id          uuid primary key default extensions.gen_random_uuid(),
  -- Null for an anonymous report. Reporting must not require an account:
  -- the person best placed to spot a scam is often not signed in.
  reporter_id uuid references public.users(id) on delete set null,
  target_type public.report_target not null,
  target_id   uuid not null,
  reason      public.report_reason not null,
  note        text,
  status      public.report_status not null default 'open',
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at  timestamptz not null default now(),

  constraint reports_note_len_chk check (note is null or char_length(note) <= 1000)
);

create index if not exists reports_open_idx
  on public.reports (created_at) where status in ('open', 'reviewing');
create index if not exists reports_target_idx on public.reports (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Rate limiting. A fixed-window counter in Postgres rather than Redis: one
-- upsert per check, no extra vendor, and the limits we need (tens per minute)
-- are far below where a counter row becomes a contention problem.
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        int not null default 0
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- Returns true when the caller is ALLOWED. Atomic: the upsert both resets an
-- expired window and increments the live one in a single statement.
create or replace function public.fn_rate_limit(
  p_key    text,
  p_limit  int,
  p_window interval
)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_count int;
  v_start timestamptz;
begin
  insert into public.rate_limits as rl (key, window_start, count)
       values (p_key, now(), 1)
  on conflict (key) do update
     set count        = case when rl.window_start < now() - p_window then 1
                             else rl.count + 1 end,
         window_start = case when rl.window_start < now() - p_window then now()
                             else rl.window_start end
  returning rl.count, rl.window_start into v_count, v_start;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_start + p_window;
end;
$$;

comment on function public.fn_rate_limit is
  'Fixed-window limiter. Returns allowed=false once count exceeds p_limit inside p_window.';

-- ---------------------------------------------------------------------------
-- Audit log. Append-only record of every privileged action. Deliberately has
-- no UPDATE or DELETE path in application code.
-- ---------------------------------------------------------------------------

create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.users(id) on delete set null,
  actor_role  public.user_role,
  action      text not null,
  target_type text,
  target_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_recent_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index if not exists audit_log_target_idx on public.audit_log (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Settings — runtime knobs that must be changeable without a deploy:
-- ranking constants and the homepage readiness thresholds.
-- ---------------------------------------------------------------------------

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_settings_touch on public.settings;
create trigger trg_settings_touch before update on public.settings
  for each row execute function public.fn_touch_updated_at();

insert into public.settings (key, value) values
  -- Ranking: score = (views + 1) / (hours + gravity_offset) ^ gravity_exponent
  ('ranking.gravity_exponent',      '1.4'::jsonb),
  ('ranking.gravity_offset_hours',  '2'::jsonb),
  -- Bayesian prior for seller ratings: C reviews' worth of the platform mean.
  ('ranking.rating_prior_weight',   '5'::jsonb),
  ('ranking.rating_prior_mean',     '4.0'::jsonb),

  -- Homepage readiness. Below these the section is not rendered at all —
  -- no placeholder cards, no skeletons pretending there is stock.
  ('home.min_listings_per_shelf',   '8'::jsonb),
  ('home.min_rated_sellers',        '4'::jsonb),
  ('home.min_trending_listings',    '20'::jsonb),
  ('home.shelf_size',               '5'::jsonb),

  -- Moderation posture. false = listings go live immediately (launch setting);
  -- flip to true to route everything through the queue.
  ('moderation.require_approval',   'false'::jsonb)
on conflict (key) do nothing;

-- Typed reader with a fallback, so a missing key can never break a query.
create or replace function public.fn_setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select coalesce((select value::text::numeric from public.settings where key = p_key), p_default);
$$;
