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
  -- A carry links two tasks to each other, so the checks wait until the whole write is in.
  carried_from_id   uuid references public.tasks on delete set null deferrable initially deferred,
  carried_from_date date,
  carried_to_id     uuid references public.tasks on delete set null deferrable initially deferred,
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

-- ── Lessons ──────────────────────────────────────────────────────────────────
-- App content, the same for everyone: readable by all, writable only by the server.
-- A scheduled function can keep adding to it; the app shows whatever is active.
create table public.lessons (
  id           uuid primary key default gen_random_uuid(),
  text         text not null,
  learned_from text not null,
  source       text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ── Row-level security: you only ever see your own rows ──────────────────────
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tasks         enable row level security;
alter table public.goals         enable row level security;
alter table public.lessons       enable row level security;

create policy "Own tasks" on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Own goals" on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Anyone may read active lessons (the home page works signed out). No write policy exists.
create policy "Read lessons" on public.lessons for select to anon, authenticated
  using (active);

create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Read-only for the owner. No insert/update/delete policy exists, so clients cannot change a plan.
create policy "Read own subscription" on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

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
