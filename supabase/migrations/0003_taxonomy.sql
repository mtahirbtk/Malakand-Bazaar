-- 0003 — reference data: categories, tehsils, localities.
--
-- Authored in docs/taxonomy.md and src/data/tehsils.ts; the seed file is
-- generated from those by scripts/generate-taxonomy-seed.mjs. This is
-- reference data, not sample content.

-- Two levels in one self-referencing table: a top-level category has
-- parent_slug null, a subcategory points at its parent. 26 → 444 rows.
create table if not exists public.categories (
  slug        citext primary key,
  parent_slug citext references public.categories(slug) on delete cascade,
  name_en     text not null,
  name_ur     text not null,
  -- Material Symbols Outlined glyph; only top-level rows carry one.
  icon        text,
  sort        int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- A subcategory cannot be its own parent, and nesting stops at two levels
  -- (enforced by fn_categories_depth_chk below).
  constraint categories_not_self_parent_chk check (parent_slug is distinct from slug)
);

create index if not exists categories_parent_sort_idx
  on public.categories (parent_slug, sort) where is_active;
create index if not exists categories_toplevel_sort_idx
  on public.categories (sort) where parent_slug is null and is_active;

drop trigger if exists trg_categories_touch on public.categories;
create trigger trg_categories_touch before update on public.categories
  for each row execute function public.fn_touch_updated_at();

-- Hard stop at two levels: a row whose parent already has a parent is rejected.
create or replace function public.fn_categories_depth_chk()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if new.parent_slug is not null then
    if exists (
      select 1 from public.categories
       where slug = new.parent_slug and parent_slug is not null
    ) then
      raise exception 'category taxonomy is two levels deep; % cannot nest under %',
        new.slug, new.parent_slug;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_categories_depth on public.categories;
create trigger trg_categories_depth before insert or update on public.categories
  for each row execute function public.fn_categories_depth_chk();

-- ---------------------------------------------------------------------------
-- Geography. Three tehsil local governments per the KP Local Government
-- Department; localities are the second-level market lookup.
-- ---------------------------------------------------------------------------

create table if not exists public.tehsils (
  slug           citext primary key,
  name_en        text not null,
  name_ur        text not null,
  -- The revenue tehsil the local government corresponds to.
  revenue_tehsil text,
  sort           int  not null default 0,
  is_active      boolean not null default true
);

create table if not exists public.localities (
  slug        citext primary key,
  tehsil_slug citext not null references public.tehsils(slug) on delete cascade,
  name_en     text not null,
  name_ur     text not null,
  sort        int  not null default 0,
  is_active   boolean not null default true
);

create index if not exists localities_tehsil_sort_idx
  on public.localities (tehsil_slug, sort) where is_active;
