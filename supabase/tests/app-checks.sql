-- Assertions for 0002_app.sql. Every check prints "PASS <label>" or aborts with "FAIL <label>".
-- Run after supabase-stub.sql, 0001_init.sql and 0002_app.sql (see run-local.sh).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema t;
grant usage on schema t to public;

create function t.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if coalesce(cond, false) then raise notice 'PASS %', label;
  else raise exception 'FAIL %', label;
  end if;
end $$;

-- Act as a signed-in user for the rest of the current transaction.
create function t.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.sub', uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function t.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;

grant execute on all functions in schema t to public;

-- Users: A and B are regular, D is the demo account, M is an admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@example.com', '{"display_name":"Alice"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@example.com', '{}'),
  ('dddddddd-0000-0000-0000-000000000004', 'demo@example.com', '{"display_name":"Demo"}'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'admin@example.com', '{}');
update public.profiles set is_demo = true where id = 'dddddddd-0000-0000-0000-000000000004';
insert into public.admins (user_id) values ('eeeeeeee-0000-0000-0000-000000000005');

do $$ begin
  perform t.ok((select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Alice', 'profile trigger uses display_name');
  perform t.ok((select display_name from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'bob', 'profile trigger falls back to email prefix');
  perform t.ok(to_regclass('public.waitlist') is null, 'waitlist table dropped');
  perform t.ok(to_regprocedure('public.get_waitlist_count()') is null, 'get_waitlist_count dropped');
end $$;

-- A: start a session, user_id defaults to auth.uid()
do $$ declare v_id uuid; begin
  perform t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  insert into public.workout_sessions (name) values ('Push') returning id into v_id;
  perform t.ok((select user_id from public.workout_sessions where id = v_id) = 'aaaaaaaa-0000-0000-0000-000000000001', 'session user_id defaults to auth.uid()');
end $$;

do $$ begin
  perform t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  begin
    insert into public.workout_sessions (name) values ('Second');
    perform t.ok(false, 'second active session rejected');
  exception when unique_violation then perform t.ok(true, 'second active session rejected');
  end;
end $$;

do $$ declare v_session uuid; v_key text; begin
  perform t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  select id into v_session from public.workout_sessions where ended_at is null;
  insert into public.workout_sets (session_id, exercise_name, weight_kg, reps)
  values (v_session, '  Bench Press ', 80, 8) returning exercise_key into v_key;
  perform t.ok(v_key = 'bench press', 'exercise_key generated (trim + lower)');
  begin
    insert into public.workout_sets (session_id, exercise_name, weight_kg, reps) values (v_session, 'Bench Press', 80.3, 8);
    perform t.ok(false, 'weight not multiple of 0.5 rejected');
  exception when check_violation then perform t.ok(true, 'weight not multiple of 0.5 rejected');
  end;
  begin
    insert into public.workout_sets (session_id, exercise_name, weight_kg, reps) values (v_session, 'Bench Press', 80, 101);
    perform t.ok(false, 'reps over 100 rejected');
  exception when check_violation then perform t.ok(true, 'reps over 100 rejected');
  end;
  begin
    insert into public.workout_sets (session_id, user_id, exercise_name, weight_kg, reps)
    values (v_session, 'bbbbbbbb-0000-0000-0000-000000000002', 'Bench Press', 80, 8);
    perform t.ok(false, 'user cannot set user_id column');
  exception when insufficient_privilege then perform t.ok(true, 'user cannot set user_id column');
  end;
  begin
    update public.profiles set is_demo = true where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    perform t.ok(false, 'user cannot change is_demo');
  exception when insufficient_privilege then perform t.ok(true, 'user cannot change is_demo');
  end;
  update public.profiles set display_name = 'Alice B' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  perform t.ok((select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Alice B', 'user can change display_name');
end $$;

-- B cannot see or touch A's data
do $$ declare v_session uuid; v_count int; begin
  select id into v_session from public.workout_sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  perform t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
  perform t.ok((select count(*) from public.workout_sessions) = 0, 'B sees none of A''s sessions');
  perform t.ok((select count(*) from public.workout_sets) = 0, 'B sees none of A''s sets');
  perform t.ok((select count(*) from public.workout_set_records) = 0, 'B sees none of A''s rows in records view');
  perform t.ok((select count(*) from public.workout_session_summaries) = 0, 'B sees none of A''s rows in summaries view');
  perform t.ok((select count(*) from public.profiles) = 1, 'B sees only own profile');
  begin
    insert into public.workout_sets (session_id, exercise_name, weight_kg, reps) values (v_session, 'Squat', 100, 5);
    perform t.ok(false, 'B cannot add a set to A''s session');
  exception when others then perform t.ok(sqlstate in ('42501', 'P0001'), 'B cannot add a set to A''s session');
  end;
  update public.workout_sets set reps = 1;
  get diagnostics v_count = row_count;
  perform t.ok(v_count = 0, 'B cannot update A''s sets');
  delete from public.workout_sessions;
  get diagnostics v_count = row_count;
  perform t.ok(v_count = 0, 'B cannot delete A''s sessions');
end $$;
do $$ begin
  perform t.ok((select count(*) from public.workout_sets where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, 'A''s set still there after B''s attempts');
end $$;

-- Demo account is read-only
insert into public.workout_sessions (id, user_id, name, started_at, ended_at, created_at)
values ('dddddddd-1111-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000004', 'Demo push', now() - interval '3 days', now() - interval '3 days' + interval '1 hour', now() - interval '3 days');
insert into public.workout_sets (session_id, user_id, exercise_name, weight_kg, reps, performed_at)
values ('dddddddd-1111-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000004', 'Squat', 100, 5, now() - interval '3 days');

do $$ declare v_count int; begin
  perform t.as_user('dddddddd-0000-0000-0000-000000000004');
  perform t.ok(public.is_demo(), 'is_demo() true for demo');
  perform t.ok((select count(*) from public.workout_sets) = 1, 'demo can read own data');
  begin
    insert into public.workout_sessions (name) values ('Hack');
    perform t.ok(false, 'demo cannot insert sessions');
  exception when insufficient_privilege then perform t.ok(true, 'demo cannot insert sessions');
  end;
  begin
    insert into public.workout_sets (session_id, exercise_name, weight_kg, reps) values ('dddddddd-1111-0000-0000-000000000001', 'Squat', 200, 5);
    perform t.ok(false, 'demo cannot insert sets');
  exception when insufficient_privilege then perform t.ok(true, 'demo cannot insert sets');
  end;
  begin
    update public.workout_sets set reps = 6;
    perform t.ok(false, 'demo cannot update sets');
  exception when insufficient_privilege then perform t.ok(true, 'demo cannot update sets');
  end;
  begin
    update public.profiles set display_name = 'Renamed';
    perform t.ok(false, 'demo cannot rename');
  exception when insufficient_privilege then perform t.ok(true, 'demo cannot rename');
  end;
  delete from public.workout_sets;
  get diagnostics v_count = row_count;
  perform t.ok(v_count = 0, 'demo cannot delete sets');
  delete from public.workout_sessions;
  get diagnostics v_count = row_count;
  perform t.ok(v_count = 0, 'demo cannot delete sessions');
end $$;

-- Personal records (FR26): first set is not a PR, equal is not a PR, higher is.
insert into public.workout_sessions (id, user_id, name, started_at, ended_at, created_at) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Old 1', now() - interval '10 days', now() - interval '10 days' + interval '1 hour', now() - interval '10 days'),
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Old 2', now() - interval '8 days', now() - interval '8 days' + interval '1 hour', now() - interval '8 days');
insert into public.workout_sets (id, session_id, user_id, exercise_name, weight_kg, reps, performed_at) values
  ('aaaaaaaa-3333-0000-0000-000000000001', 'aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Deadlift', 100, 5, now() - interval '10 days'),
  ('aaaaaaaa-3333-0000-0000-000000000002', 'aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'deadlift', 100, 5, now() - interval '10 days' + interval '5 minutes'),
  ('aaaaaaaa-3333-0000-0000-000000000003', 'aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Deadlift', 105, 5, now() - interval '8 days'),
  ('aaaaaaaa-3333-0000-0000-000000000004', 'aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Deadlift', 90, 10, now() - interval '8 days' + interval '5 minutes'),
  ('aaaaaaaa-3333-0000-0000-000000000005', 'aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Deadlift', 140, 1, now() - interval '8 days' + interval '10 minutes');

do $$ declare r record; begin
  perform t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  select * into r from public.workout_set_records where id = 'aaaaaaaa-3333-0000-0000-000000000001';
  perform t.ok(not r.is_e1rm_pr and not r.is_weight_pr and r.e1rm = 116.5, 'first set: not a PR, e1rm 116.5');
  select * into r from public.workout_set_records where id = 'aaaaaaaa-3333-0000-0000-000000000002';
  perform t.ok(not r.is_e1rm_pr and not r.is_weight_pr, 'equal set (different case name): not a PR');
  select * into r from public.workout_set_records where id = 'aaaaaaaa-3333-0000-0000-000000000003';
  perform t.ok(r.is_e1rm_pr and r.is_weight_pr and r.e1rm = 122.5, 'heavier set: both PRs');
  select * into r from public.workout_set_records where id = 'aaaaaaaa-3333-0000-0000-000000000004';
  perform t.ok(not r.is_e1rm_pr and not r.is_weight_pr and r.e1rm = 120, '90x10: e1rm 120 is below 122.5, not a PR');
  select * into r from public.workout_set_records where id = 'aaaaaaaa-3333-0000-0000-000000000005';
  perform t.ok(r.is_e1rm_pr and r.is_weight_pr and r.e1rm = 140, '140x1: single rep counts as its own 1RM, both PRs');
  perform t.ok((select pr_count from public.workout_session_summaries where id = 'aaaaaaaa-2222-0000-0000-000000000002') = 2, 'session summary counts 2 PR sets');
  perform t.ok((select volume_kg from public.workout_session_summaries where id = 'aaaaaaaa-2222-0000-0000-000000000002') = 105*5 + 90*10 + 140, 'session summary volume');
  perform t.ok((select best_e1rm from public.exercise_summaries where exercise_key = 'deadlift') = 140, 'exercise summary best e1rm');
  perform t.ok((select count(*) from public.exercise_session_bests where exercise_key = 'deadlift') = 2, 'one chart point per session');
end $$;

-- Abuse limits: 100 sets per session, 20 sessions per 24 hours.
do $$ declare v_session uuid; begin
  select id into v_session from public.workout_sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and ended_at is null;
  insert into public.workout_sets (session_id, user_id, exercise_name, weight_kg, reps)
  select v_session, 'aaaaaaaa-0000-0000-0000-000000000001', 'Curl', 10, 10 from generate_series(1, 99);
  perform t.ok((select count(*) from public.workout_sets where session_id = v_session) = 100, '100 sets allowed');
  begin
    insert into public.workout_sets (session_id, user_id, exercise_name, weight_kg, reps) values (v_session, 'aaaaaaaa-0000-0000-0000-000000000001', 'Curl', 10, 10);
    perform t.ok(false, '101st set rejected');
  exception when raise_exception then perform t.ok(sqlerrm = 'set_limit_reached', '101st set rejected');
  end;
end $$;

do $$ begin
  insert into public.workout_sessions (user_id, name, ended_at)
  select 'bbbbbbbb-0000-0000-0000-000000000002', 'S' || g, now() from generate_series(1, 20) g;
  begin
    insert into public.workout_sessions (user_id, name, ended_at) values ('bbbbbbbb-0000-0000-0000-000000000002', 'S21', now());
    perform t.ok(false, '21st session in 24h rejected');
  exception when raise_exception then perform t.ok(sqlerrm = 'session_limit_reached', '21st session in 24h rejected');
  end;
end $$;

-- Owner consistency even for privileged inserts
do $$ begin
  begin
    insert into public.workout_sets (session_id, user_id, exercise_name, weight_kg, reps)
    values ('aaaaaaaa-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Row', 50, 5);
    perform t.ok(false, 'set user_id must match session owner');
  exception when raise_exception then perform t.ok(sqlerrm = 'session_owner_mismatch', 'set user_id must match session owner');
  end;
end $$;

-- anon
do $$ begin
  perform t.as_anon();
  perform t.ok(public.get_total_sets_logged() = 100 + 5, 'counter callable by anon and excludes demo');
  begin
    perform count(*) from public.workout_sets;
    perform t.ok(false, 'anon cannot read sets');
  exception when insufficient_privilege then perform t.ok(true, 'anon cannot read sets');
  end;
  begin
    perform count(*) from public.workout_set_records;
    perform t.ok(false, 'anon cannot read records view');
  exception when insufficient_privilege then perform t.ok(true, 'anon cannot read records view');
  end;
  begin
    perform public.is_demo();
    perform t.ok(false, 'anon cannot call is_demo');
  exception when insufficient_privilege then perform t.ok(true, 'anon cannot call is_demo');
  end;
  begin
    perform * from public.get_admin_stats();
    perform t.ok(false, 'anon cannot call get_admin_stats');
  exception when insufficient_privilege then perform t.ok(true, 'anon cannot call get_admin_stats');
  end;
end $$;

-- Admin: aggregates only
insert into public.feedback (category, message) values ('bug', 'Something broke here'), ('feature', 'Please add plates');
do $$ declare s record; begin
  perform t.as_user('eeeeeeee-0000-0000-0000-000000000005');
  select * into s from public.get_admin_stats();
  -- 2 users from rls-checks.sql + Alice, Bob, admin; the demo user is excluded.
  perform t.ok(s.total_users = 5 and s.new_users_7d = 5, 'admin stats: users exclude demo');
  perform t.ok((select count(*) from public.profiles) = 1, 'admin reads only own profile row');
  -- One bug report already comes from rls-checks.sql.
  perform t.ok(s.total_sets = 105 and s.feedback_bug = 2 and s.feedback_feature = 1 and s.feedback_critique = 0, 'admin stats: sets and feedback');
  perform t.ok((select count(*) from public.workout_sessions) = 0, 'admin cannot read users'' sessions');
  perform t.ok((select count(*) from public.workout_sets) = 0, 'admin cannot read users'' sets');
end $$;
do $$ begin
  perform t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  begin
    perform * from public.get_admin_stats();
    perform t.ok(false, 'non-admin cannot call get_admin_stats');
  exception when insufficient_privilege then perform t.ok(true, 'non-admin cannot call get_admin_stats');
  end;
end $$;

-- Deleting the auth user removes everything they own
do $$ begin
  delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  perform t.ok((select count(*) from public.workout_sets where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0
    and (select count(*) from public.workout_sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0
    and (select count(*) from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0, 'account deletion cascades');
end $$;

select 'ALL APP CHECKS PASSED';
