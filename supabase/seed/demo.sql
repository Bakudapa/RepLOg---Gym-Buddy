-- RepLog demo data (PRD-app FR30).
--
-- About six weeks of realistic training for the read-only demo account:
-- 4 sessions a week rotating Push / Pull / Legs, weights creeping up so there are
-- personal records and the progress charts have a shape, plus a lighter week.
--
-- How to use (Supabase SQL Editor, runs as postgres so RLS does not apply):
--   1. Create the demo user in Authentication → Users and copy its UUID.
--   2. Replace 00000000-0000-0000-0000-000000000000 below with that UUID.
--   3. Run this file. It is safe to run again: it replaces the demo's workouts.
--
-- Dates are relative to now(), so re-running refreshes the demo.

do $$
declare
  demo_uid constant uuid := '00000000-0000-0000-0000-000000000000';

  -- Training days within each week (0 = six weeks ago, Monday-ish)
  week_days constant int[] := array[0, 2, 4, 5];
  -- Push / Pull / Legs rotation
  templates constant text[] := array['Push', 'Pull', 'Legs'];

  v_week int;
  v_day int;
  v_index int := 0;
  v_template text;
  v_session uuid;
  v_start timestamptz;
  v_minute int;
  v_occurrence int;
  v_lighter boolean;
  ex record;
  v_weight numeric;
  v_set int;
  v_reps int;
begin
  -- Written in two parts so replacing the placeholder above does not change it.
  if demo_uid = ('00000000-0000-0000-0000-' || '000000000000')::uuid then
    raise exception 'Replace demo_uid with the UUID of the demo user first.';
  end if;
  if not exists (select 1 from auth.users where id = demo_uid) then
    raise exception 'No auth user with id %', demo_uid;
  end if;

  insert into public.profiles (id, display_name, is_demo)
  values (demo_uid, 'Demo lifter', true)
  on conflict (id) do update set is_demo = true, display_name = 'Demo lifter';

  -- Start over (sets go with their sessions).
  delete from public.workout_sessions where user_id = demo_uid;

  for v_week in 0..5 loop
    foreach v_day in array week_days loop
      v_template := templates[(v_index % 3) + 1];
      v_occurrence := v_index / 3;           -- how many times this template came up before
      v_lighter := v_week = 4;               -- a lighter week: fewer PRs, more realistic chart
      v_start := date_trunc('day', now())
        - make_interval(days => 42 - (v_week * 7 + v_day))
        + interval '17 hours 30 minutes';

      insert into public.workout_sessions (user_id, name, started_at, ended_at, created_at)
      values (
        demo_uid,
        v_template || ' day',
        v_start,
        v_start + make_interval(mins => 58 + (v_index * 7) % 20),
        v_start
      )
      returning id into v_session;

      v_minute := 0;
      for ex in
        select * from (values
          -- template, order, name, start weight, kg per occurrence, working reps, sets, warm-up
          ('Push', 1, 'Bench Press',            70.0, 2.5,  5, 3, true),
          ('Push', 2, 'Overhead Press',         40.0, 1.25, 6, 3, false),
          ('Push', 3, 'Incline Dumbbell Press', 22.0, 1.0, 10, 3, false),
          ('Push', 4, 'Triceps Pushdown',       25.0, 1.25, 12, 3, false),
          ('Push', 5, 'Lateral Raise',           8.0, 0.5, 15, 3, false),
          ('Pull', 1, 'Deadlift',              110.0, 5.0,  5, 2, true),
          ('Pull', 2, 'Barbell Row',            60.0, 2.5,  8, 3, false),
          ('Pull', 3, 'Lat Pulldown',           50.0, 2.5, 10, 3, false),
          ('Pull', 4, 'Barbell Curl',           25.0, 1.25, 10, 3, false),
          ('Pull', 5, 'Face Pull',              20.0, 1.25, 15, 2, false),
          ('Legs', 1, 'Squat',                  90.0, 2.5,  5, 3, true),
          ('Legs', 2, 'Romanian Deadlift',      80.0, 2.5,  8, 3, false),
          ('Legs', 3, 'Leg Press',             140.0, 5.0, 10, 3, false),
          ('Legs', 4, 'Leg Curl',               35.0, 1.25, 12, 3, false),
          ('Legs', 5, 'Calf Raise',             60.0, 2.5, 15, 3, false)
        ) as t(template, sort, name, base, step, reps, sets, warmup)
        where t.template = v_template
        order by t.sort
      loop
        v_weight := ex.base + ex.step * v_occurrence;
        if v_lighter then
          v_weight := v_weight * 0.9;
        end if;
        v_weight := round(v_weight * 2) / 2;

        if ex.warmup then
          insert into public.workout_sets (session_id, user_id, exercise_name, weight_kg, reps, performed_at, created_at)
          values (v_session, demo_uid, ex.name, round(v_weight * 0.6 * 2) / 2, 8,
                  v_start + make_interval(mins => v_minute), v_start + make_interval(mins => v_minute));
          v_minute := v_minute + 3;
        end if;

        for v_set in 1..ex.sets loop
          -- Last set a rep short now and then, an extra rep on good days.
          v_reps := ex.reps
            - case when v_set = ex.sets and (v_index + v_set) % 3 = 0 then 1 else 0 end
            + case when v_set = 1 and v_index % 5 = 2 then 1 else 0 end;
          insert into public.workout_sets (session_id, user_id, exercise_name, weight_kg, reps, performed_at, created_at)
          values (v_session, demo_uid, ex.name, v_weight, v_reps,
                  v_start + make_interval(mins => v_minute), v_start + make_interval(mins => v_minute));
          v_minute := v_minute + 3;
        end loop;
      end loop;

      v_index := v_index + 1;
    end loop;
  end loop;

  raise notice 'Demo data: % workouts, % sets.',
    (select count(*) from public.workout_sessions where user_id = demo_uid),
    (select count(*) from public.workout_sets where user_id = demo_uid);
end
$$;
