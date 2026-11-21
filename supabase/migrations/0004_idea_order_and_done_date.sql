-- Ideas can be put in order, and remember when they were done.
-- Only adds nullable columns, so installed apps that do not know them keep syncing.
alter table public.content_ideas
  add column if not exists position double precision, -- lowest first within a category
  add column if not exists done_at  timestamptz;      -- when it was marked done
