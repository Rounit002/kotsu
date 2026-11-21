-- Repeating goals, durations, and the Content Planner.
-- Only adds: nothing existing is changed or removed, so apps already installed keep syncing.
-- Every new table follows 0001's privacy rule: an owner filled in by the database, and
-- row-level security that only ever shows you your own rows.

-- ── Tasks: how long, and which repeating goal a day belongs to ────────────────
alter table public.tasks
  add column minutes    int check (minutes between 1 and 1440),
  add column routine_id uuid; -- a plain id, like the carry links, so rows can sync in any order

-- ── Repeating goals ──────────────────────────────────────────────────────────
-- Days are not stored ahead of time: the app shows them, and saves one only once it is touched.
create table public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  title      text not null,
  every      text not null check (every in ('day', 'week')),
  minutes    int check (minutes between 1 and 1440),
  starts     date not null,
  ends       date,                         -- the first day it no longer appears
  skipped    date[] not null default '{}', -- days taken off one at a time
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_owner on public.routines (user_id);

-- ── Content Planner ──────────────────────────────────────────────────────────
create table public.content_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_categories_owner on public.content_categories (user_id);

create table public.content_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid not null, -- plain id: the app removes a category's ideas with it
  text        text not null,
  done        boolean not null default false, -- made and posted
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index content_ideas_owner on public.content_ideas (user_id, category_id);

-- ── Privacy ──────────────────────────────────────────────────────────────────
alter table public.routines           enable row level security;
alter table public.content_categories enable row level security;
alter table public.content_ideas      enable row level security;

create policy "Own routines" on public.routines for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own content categories" on public.content_categories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own content ideas" on public.content_ideas for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.routines, public.content_categories, public.content_ideas from anon, authenticated;
grant select, insert, update, delete on public.routines, public.content_categories, public.content_ideas to authenticated;

create trigger routines_touch before update on public.routines for each row execute function public.touch_updated_at();
create trigger content_categories_touch before update on public.content_categories for each row execute function public.touch_updated_at();
create trigger content_ideas_touch before update on public.content_ideas for each row execute function public.touch_updated_at();
