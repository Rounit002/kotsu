-- Kotsu schema for Supabase (Postgres).
--
-- The privacy rule, enforced by the database itself:
--   every row has an owner, and row-level security only ever shows you your own rows.
-- The app never sends `user_id` — the database fills it in from the signed-in session,
-- so one person cannot read, change or create rows for another, even with a modified client.
--
-- Columns mirror src/domain/types.ts one-to-one (snake_case here, camelCase there).

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null default '',
  created_at timestamptz not null default now()
);

-- ── Subscriptions ────────────────────────────────────────────────────────────
-- Kept apart from profiles on purpose: people may read their plan but never write it.
-- Only the server (payment webhook, using the service role) changes these rows.
create table public.subscriptions (
  user_id              uuid primary key references auth.users on delete cascade,
  plan                 text not null default 'free' check (plan in ('free', 'pro')),
  status               text not null default 'active',
  current_period_end   timestamptz,
  provider_customer_id text,
  updated_at           timestamptz not null default now()
);

-- ── Tasks ────────────────────────────────────────────────────────────────────
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users on delete cascade,
  date              date not null,
  title             text not null,
  note              text not null default '',
  status            text not null default 'open' check (status in ('open', 'done', 'missed')),
  -- A carry links two tasks to each other. The app keeps both ends in step (see planner/store.ts);
  -- they are plain ids rather than foreign keys so that rows can arrive in any order when syncing.
  carried_from_id   uuid,
  carried_from_date date,
  carried_to_id     uuid,
  carried_to_date   date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index tasks_owner_date on public.tasks (user_id, date);

-- ── Goals ────────────────────────────────────────────────────────────────────
create table public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  scope      text not null check (scope in ('year', 'month', 'week')),
  period     text not null, -- '2026' · '2026-11' · the week's Monday, '2026-11-16'
  title      text not null,
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_owner_period on public.goals (user_id, scope, period);

-- ── Row-level security: you only ever see your own rows ──────────────────────
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tasks         enable row level security;
alter table public.goals         enable row level security;

create policy "Own tasks" on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Own goals" on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Read-only for the owner. No insert/update/delete policy exists, so clients cannot change a plan.
create policy "Read own subscription" on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

-- What a signed-in person may do at all; row-level security then narrows it to their own rows.
-- Supabase grants everything on new tables by default, so that is taken away first.
-- Nobody who is signed out is granted anything.
revoke all on public.profiles, public.subscriptions, public.tasks, public.goals from anon, authenticated;
grant select, insert, update, delete on public.tasks, public.goals to authenticated;
grant select, update (name) on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;

-- ── Housekeeping ─────────────────────────────────────────────────────────────
-- Every new sign-up (email, phone or Google) gets a profile and a free plan.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- It runs with the owner's rights, so nobody may call it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Keep updated_at honest, so the newest edit wins when two devices sync.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_touch before update on public.tasks for each row execute function public.touch_updated_at();
create trigger goals_touch before update on public.goals for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();
