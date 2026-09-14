-- 0001 — extensions, enum types, shared helpers.
--
-- Extensions live in the `extensions` schema, which is Supabase's convention
-- and is already on the default search_path for every role we use.

create extension if not exists citext    with schema extensions;
create extension if not exists pg_trgm   with schema extensions;
create extension if not exists pgcrypto  with schema extensions;
create extension if not exists postgis   with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerated domains. Kept as real enums, not text + check, so a typo in
-- application code fails at the database boundary.
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('customer', 'seller', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('active', 'suspended', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.seller_status as enum ('active', 'suspended', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_status as enum ('active', 'reserved', 'sold', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.moderation_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('visible', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contact_channel as enum ('whatsapp', 'call', 'copy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_target as enum ('listing', 'seller', 'review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- Reasons mirror the "Prohibited" list in docs/taxonomy.md plus the ordinary
-- marketplace complaints.
do $$ begin
  create type public.report_reason as enum (
    'prohibited_item', 'counterfeit', 'fraud_or_scam', 'spam',
    'wrong_category', 'offensive_content', 'misleading_price',
    'duplicate_listing', 'sold_elsewhere', 'other'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Stamps updated_at on every UPDATE. Attached by each table that has the column.
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Slugify: lowercase, ASCII-ish, hyphen-separated. Non-Latin input (Urdu store
-- names) collapses to empty, so callers pass a fallback.
create or replace function public.fn_slugify(input text, fallback text default 'item')
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    fallback
  );
$$;

comment on function public.fn_slugify is
  'URL slug from free text; returns the fallback when input has no Latin characters.';
