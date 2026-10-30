-- Checks for supabase/seed/demo.sql. Run after app-checks.sql (uses the t schema).
\set ON_ERROR_STOP 1

do $$ declare v_pr int; v_points int; v_counter_before bigint; begin
  perform t.ok((select is_demo from public.profiles where id = 'd0d0d0d0-0000-4000-8000-000000000001'), 'seed marks the demo profile');
  perform t.ok((select count(*) from public.workout_sessions where user_id = 'd0d0d0d0-0000-4000-8000-000000000001') = 24, 'seed: 24 workouts over 6 weeks');
  perform t.ok((select count(*) from public.workout_sessions where user_id = 'd0d0d0d0-0000-4000-8000-000000000001' and ended_at is null) = 0, 'seed: no active workout');
  perform t.ok((select max(started_at) from public.workout_sessions where user_id = 'd0d0d0d0-0000-4000-8000-000000000001') < now(), 'seed: nothing in the future');

  perform t.as_user('d0d0d0d0-0000-4000-8000-000000000001');
  select count(*) into v_pr from public.workout_set_records where is_e1rm_pr or is_weight_pr;
  perform t.ok(v_pr >= 20, 'seed produces personal records (' || v_pr || ')');
  select count(*) into v_points from public.exercise_session_bests where exercise_key = 'bench press';
  perform t.ok(v_points >= 7, 'seed gives the bench press chart enough points (' || v_points || ')');
  perform t.ok(exists (select 1 from public.exercise_session_bests where exercise_key = 'bench press' and not has_e1rm_pr), 'seed has non-record sessions too');
  perform t.ok((select count(distinct exercise_key) from public.exercise_summaries) = 15, 'seed covers 15 exercises');
end $$;

do $$ declare v_expected bigint; begin
  select count(*) into v_expected
  from public.workout_sets s join public.profiles p on p.id = s.user_id where not p.is_demo;
  perform t.as_anon();
  perform t.ok(public.get_total_sets_logged() = v_expected, 'counter still excludes the demo account');
end $$;

select 'ALL DEMO CHECKS PASSED';
