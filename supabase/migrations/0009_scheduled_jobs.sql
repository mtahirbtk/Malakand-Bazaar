-- 0009 — scheduled jobs.
--
-- Two jobs: refresh rank scores so age decay keeps moving between views, and
-- a nightly sweep of expired sessions, stale rate-limit rows and old
-- analytics rows.
--
-- pg_cron may be unavailable depending on Supabase plan or region. This
-- migration therefore records whether it succeeded in public.settings rather
-- than failing the whole migration run: when 'cron.enabled' is false the app
-- falls back to an authenticated /api/internal/refresh-ranks route driven by a
-- platform scheduler (Vercel Cron), guarded by CRON_SECRET.

do $$
declare
  v_enabled boolean := false;
begin
  begin
    create extension if not exists pg_cron;
    v_enabled := true;
  exception when others then
    raise warning 'pg_cron unavailable (%): falling back to an external scheduler', sqlerrm;
  end;

  if v_enabled then
    -- cron.schedule is idempotent on job name in pg_cron >= 1.4.
    perform cron.schedule(
      'refresh-rank-scores',
      '*/10 * * * *',
      $job$ select public.fn_refresh_rank_scores(); $job$
    );

    perform cron.schedule(
      'nightly-sweep',
      '17 2 * * *',
      $job$ select public.fn_sweep(); $job$
    );
  end if;

  insert into public.settings (key, value)
       values ('cron.enabled', to_jsonb(v_enabled))
  on conflict (key) do update set value = to_jsonb(v_enabled), updated_at = now();
end $$;
