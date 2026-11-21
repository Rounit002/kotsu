-- A priority on goals and on repeating goals. Only adds nullable columns, so installed apps keep syncing.
alter table public.tasks    add column priority text check (priority in ('high', 'medium', 'low'));
alter table public.routines add column priority text check (priority in ('high', 'medium', 'low'));
