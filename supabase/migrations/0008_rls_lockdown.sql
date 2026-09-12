-- 0008 — Row Level Security lockdown.
--
-- The browser never talks to Supabase: every read and write goes through our
-- own API, which authenticates with the service-role key. So RLS is enabled
-- with ZERO policies on every table — a deny-all posture.
--
-- This is defence in depth, not the primary control. If the anon or
-- publishable key ever leaks (it is designed to be public), it reads nothing
-- and writes nothing. The service role bypasses RLS, which is exactly the
-- trusted-backend pattern this app uses.

do $$
declare
  t record;
begin
  for t in
    select tablename
      from pg_tables
     where schemaname = 'public'
       and tablename not like 'pg_%'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
  end loop;
end $$;

-- Belt and braces: strip table privileges from the public-facing roles so a
-- future policy added by accident still cannot expose anything.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges in schema public
  revoke all on functions from anon, authenticated;

comment on schema public is
  'Deny-all under RLS. Reached only by the service role via the application API. See docs/backend-plan.md section 1.2.';
