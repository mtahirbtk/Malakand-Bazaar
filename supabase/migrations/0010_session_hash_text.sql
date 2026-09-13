-- 0010 — store the refresh-token hash as text rather than bytea.
--
-- The value is a hex digest either way. bytea round-trips through PostgREST as
-- a `\x…` escaped string, which means every read and write needs encoding
-- glue on the application side for no benefit. text is the same 64 characters
-- with none of that.
--
-- Safe to run unconditionally: at this point no session rows exist.

alter table public.sessions
  alter column refresh_hash type text using encode(refresh_hash, 'hex');

comment on column public.sessions.refresh_hash is
  'sha256(refresh_token || AUTH_TOKEN_PEPPER), hex. The plaintext token exists only in the client cookie.';

-- Records the reason a session ended, for the "active devices" screen and for
-- spotting token theft in the audit trail.
alter table public.sessions
  add column if not exists last_ip_hash text;
