-- 0016 — pending_uploads: tracks every signed upload URL we issue.
--
-- Deleting a Supabase Storage object requires the Storage JS API, not SQL, so
-- pg_cron cannot sweep orphans by itself (see 0009's fallback note for the
-- same limitation on rank refresh). This table is the ledger a Node-side
-- sweep route (guarded by CRON_SECRET, same pattern as the rank-refresh
-- fallback) reads to find objects to delete:
--
--   committed_at is null   → a signed URL was issued but the browser never
--                             PUT anything (or the PUT failed). Swept quickly.
--   committed_at is set    → POST /api/uploads/commit verified the object and
--                             recorded its real dimensions, but it was never
--                             attached to a listing/profile field (the seller
--                             abandoned the form). Swept after a longer grace
--                             window so an in-progress "new listing" draft
--                             with photos already added isn't punished.
--
-- A row is deleted (not just marked) the moment it IS attached — the same
-- request that inserts the listing_images row or updates
-- sellers.avatar_path/banner_path also deletes this row, so an attached
-- upload can never be swept out from under a live reference.

create table if not exists public.pending_uploads (
  path         text primary key,
  seller_id    uuid not null references public.sellers(id) on delete cascade,
  kind         text not null,
  content_type text not null,
  width        int,
  height       int,
  bytes        int,
  committed_at timestamptz,
  created_at   timestamptz not null default now(),

  constraint pending_uploads_kind_chk check (kind in ('listing', 'avatar', 'banner'))
);

create index if not exists pending_uploads_sweep_uncommitted_idx
  on public.pending_uploads (created_at) where committed_at is null;
create index if not exists pending_uploads_sweep_committed_idx
  on public.pending_uploads (committed_at) where committed_at is not null;
create index if not exists pending_uploads_seller_idx
  on public.pending_uploads (seller_id);

alter table public.pending_uploads enable row level security;
alter table public.pending_uploads force row level security;

comment on table public.pending_uploads is
  'Ledger of signed Storage upload URLs, read by the Node sweep route to delete orphaned objects. See docs/backend-plan.md Phase 6.';
