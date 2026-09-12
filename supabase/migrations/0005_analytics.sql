-- 0005 — analytics aggregates.
--
-- Requirement: count a view every time someone lands on a listing page, and
-- store nothing about the viewer. There is deliberately no viewer column
-- anywhere in this file — no user id, no IP, no cookie, no fingerprint.
-- The only rows produced are (subject, day, count) tuples.

create table if not exists public.listing_view_daily (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day        date not null,
  views      int  not null default 0,
  primary key (listing_id, day)
);

create index if not exists listing_view_daily_day_idx
  on public.listing_view_daily (day desc);

-- Supports "trending": total views per listing over a recent window.
create index if not exists listing_view_daily_recent_idx
  on public.listing_view_daily (listing_id, day desc);

create table if not exists public.listing_contact_daily (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day        date not null,
  channel    public.contact_channel not null,
  count      int  not null default 0,
  primary key (listing_id, day, channel)
);

create index if not exists listing_contact_daily_day_idx
  on public.listing_contact_daily (day desc);

create table if not exists public.seller_view_daily (
  seller_id uuid not null references public.sellers(id) on delete cascade,
  day       date not null,
  views     int  not null default 0,
  primary key (seller_id, day)
);

create index if not exists seller_view_daily_day_idx
  on public.seller_view_daily (day desc);

comment on table public.listing_view_daily is
  'Per-day view counts. Contains no viewer-identifying data by design; see docs/backend-plan.md section 5.';
