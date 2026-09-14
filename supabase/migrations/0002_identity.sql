-- 0002 — identity: users and refresh-token sessions.
--
-- Authentication is ours, not Supabase Auth: the phone provider cannot be
-- enabled without a paid SMS vendor, and docs/decisions.md requires phone-only
-- signup with no SMS. See docs/backend-plan.md §1.2.

create table if not exists public.users (
  id                 uuid primary key default extensions.gen_random_uuid(),

  -- E.164, normalised server-side by src/lib/phone.ts before every read/write.
  -- citext so lookups never miss on case (irrelevant for digits, but the column
  -- also guards against a future alphanumeric identity).
  phone              citext not null,

  -- Argon2id (PHC string). Never a plaintext or reversible value.
  password_hash      text   not null,

  role               public.user_role   not null default 'customer',
  status             public.user_status not null default 'active',
  display_name       text   not null,

  -- Optional, unverified. The only possible password-reset channel later;
  -- never asked for at signup (docs/decisions.md).
  recovery_email     citext,

  -- Login throttling. Reset on any successful login.
  failed_login_count int    not null default 0,
  locked_until       timestamptz,

  last_login_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,

  constraint users_phone_e164_chk check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint users_display_name_len_chk check (char_length(display_name) between 1 and 80),
  constraint users_recovery_email_chk check (
    recovery_email is null or recovery_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

-- One live account per phone. Soft-deleted accounts release the number.
create unique index if not exists users_phone_unique_idx
  on public.users (phone) where deleted_at is null;

create index if not exists users_role_idx on public.users (role) where deleted_at is null;
create index if not exists users_created_at_idx on public.users (created_at desc);

drop trigger if exists trg_users_touch on public.users;
create trigger trg_users_touch before update on public.users
  for each row execute function public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Sessions — one row per refresh token.
--
-- The plaintext refresh token is never stored. `refresh_hash` is
-- sha256(token || pepper), so a database leak does not yield usable tokens.
--
-- Rotation: using a token sets replaced_by and issues a new row in the same
-- family. Presenting an already-replaced token means the token leaked, so the
-- whole family is revoked (see fn_revoke_session_family).
-- ---------------------------------------------------------------------------

create table if not exists public.sessions (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,

  -- Groups every token descended from one login.
  family_id     uuid not null,

  refresh_hash  bytea not null,

  -- Truncated UA string for the "active devices" list. No fingerprinting.
  user_agent    text,
  -- sha256(ip || daily rotating salt). Never the address itself.
  ip_hash       text,

  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  revoked_reason text,
  replaced_by   uuid references public.sessions(id) on delete set null
);

create unique index if not exists sessions_refresh_hash_unique_idx
  on public.sessions (refresh_hash);
create index if not exists sessions_user_active_idx
  on public.sessions (user_id, last_used_at desc) where revoked_at is null;
create index if not exists sessions_family_idx on public.sessions (family_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

comment on column public.sessions.refresh_hash is
  'sha256(refresh_token || AUTH_TOKEN_PEPPER). The plaintext token exists only in the client cookie.';

-- Revokes every token descended from one login. Called on refresh-token reuse.
create or replace function public.fn_revoke_session_family(p_family_id uuid, p_reason text)
returns int
language sql
volatile
set search_path = public, extensions, pg_temp
as $$
  with revoked as (
    update public.sessions
       set revoked_at = now(), revoked_reason = p_reason
     where family_id = p_family_id and revoked_at is null
    returning 1
  )
  select count(*)::int from revoked;
$$;
