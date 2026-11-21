-- Privacy test: can one person reach another's data?
--
-- Paste into the Supabase SQL editor and run. It makes two throwaway users, acts as each of
-- them (and as a signed-out visitor), then deliberately ends with an error so that everything
-- it did is rolled back. The results are the text of that error. Nothing is kept.
--
-- Expected: every line reads as below, and nothing is marked (BAD).
--   profiles made by trigger: 2 | free plans made: 2 | A sees own edited task: 1 | A renames self: 1
--   A sees subscriptions: 1 | A changes own plan: refused | B sees tasks: 0 | B sees goals: 0
--   B sees profiles: 1 | B edits A task, rows: 0 | B deletes A task, rows: 0 | B writes as A: refused
--   B overwrites A task: refused | B renames A, rows: 0 | B sees routines: 0 | B sees content: 0
--   B edits A idea, rows: 0 | signed-out read: refused | signed-out reads ideas: refused
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  r text := ''; n int; t uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a-' || a || '@example.test', '{"name":"Person A"}', now(), now()),
         (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b-' || b || '@example.test', '{"name":"Person B"}', now(), now());
  select count(*) into n from public.profiles where id in (a, b) and name like 'Person %'; r := r || ' | profiles made by trigger: ' || n;
  select count(*) into n from public.subscriptions where user_id in (a, b) and plan = 'free'; r := r || ' | free plans made: ' || n;

  -- As person A: their own data works, and their plan is not theirs to change.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.tasks (date, title) values ('2026-11-17', 'A task') returning id into t;
  insert into public.goals (scope, period, title) values ('year', '2026', 'A goal');
  insert into public.routines (title, every, starts) values ('A routine', 'day', '2026-11-17');
  insert into public.content_categories (id, name) values (t, 'A channel');
  insert into public.content_ideas (category_id, text) values (t, 'A idea');
  insert into public.tasks (id, date, title, note, status, created_at) values (t, '2026-11-17', 'A task edited', 'n', 'done', now())
    on conflict (id) do update set title = excluded.title, note = excluded.note, status = excluded.status;
  select count(*) into n from public.tasks where user_id = a and title = 'A task edited'; r := r || ' | A sees own edited task: ' || n;
  update public.profiles set name = 'A renamed' where id = a; get diagnostics n = row_count; r := r || ' | A renames self: ' || n;
  select count(*) into n from public.subscriptions; r := r || ' | A sees subscriptions: ' || n;
  begin update public.subscriptions set plan = 'pro' where user_id = a; r := r || ' | A UPGRADED OWN PLAN (BAD)'; exception when insufficient_privilege then r := r || ' | A changes own plan: refused'; end;

  -- As person B: none of A's data can be seen, changed, removed, planted or overwritten.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.tasks; r := r || ' | B sees tasks: ' || n;
  select count(*) into n from public.goals; r := r || ' | B sees goals: ' || n;
  select count(*) into n from public.profiles; r := r || ' | B sees profiles: ' || n;
  update public.tasks set title = 'hacked' where id = t; get diagnostics n = row_count; r := r || ' | B edits A task, rows: ' || n;
  delete from public.tasks where id = t; get diagnostics n = row_count; r := r || ' | B deletes A task, rows: ' || n;
  begin insert into public.tasks (user_id, date, title) values (a, '2026-11-17', 'planted'); r := r || ' | B PLANTED ROW FOR A (BAD)'; exception when insufficient_privilege then r := r || ' | B writes as A: refused'; end;
  begin insert into public.tasks (id, date, title) values (t, '2026-11-17', 'overwrite') on conflict (id) do update set title = excluded.title; r := r || ' | B OVERWROTE A TASK (BAD)'; exception when others then r := r || ' | B overwrites A task: refused'; end;
  update public.profiles set name = 'x' where id = a; get diagnostics n = row_count; r := r || ' | B renames A, rows: ' || n;
  select count(*) into n from public.routines; r := r || ' | B sees routines: ' || n;
  select (select count(*) from public.content_categories) + (select count(*) from public.content_ideas) into n; r := r || ' | B sees content: ' || n;
  update public.content_ideas set text = 'hacked' where category_id = t; get diagnostics n = row_count; r := r || ' | B edits A idea, rows: ' || n;

  -- Signed out: nothing at all.
  reset role; set local role anon;
  begin select count(*) into n from public.tasks; r := r || ' | SIGNED-OUT READ TASKS (BAD)'; exception when insufficient_privilege then r := r || ' | signed-out read: refused'; end;
  begin select count(*) into n from public.content_ideas; r := r || ' | SIGNED-OUT READ IDEAS (BAD)'; exception when insufficient_privilege then r := r || ' | signed-out reads ideas: refused'; end;

  reset role;
  raise exception 'TEST RESULTS (rolled back, nothing kept)%', r;
end $$;
