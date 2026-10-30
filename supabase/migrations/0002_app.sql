-- RepLog v2.0: the real app (PRD-app.md section 9).
--
-- Security model:
--   * Every user-owned row has user_id; RLS limits users to their own rows.
--   * All workout reads/writes from the app use the user's own session, so RLS
--     is always the last line of defence.
--   * The demo account (profiles.is_demo) is read-only, enforced by RLS.
--   * Admins never read workout data; they get aggregates from get_admin_stats().
--   * Triggers cap abuse by signed-in users calling the REST API directly
--     (100 sets per session, 20 sessions per 24 hours).
--
-- Adjustments to the PRD SQL (security intent unchanged, see docs/REPORT.md):
--   * SECURITY DEFINER functions use `set search_path = ''` with qualified names.
--   * Explicit REVOKE/GRANT, including column-level INSERT/UPDATE grants, so users
--     cannot set user_id, is_demo, performed_at, started_at, or created_at themselves.
--   * auth.uid() and helper calls are wrapped in (select ...) for RLS performance.
--   * Personal records and progress come from views with security_invoker = true.
--   * Existing auth users get a profile row (backfill), since the trigger only
--     covers new sign-ups.

-- ---------------------------------------------------------------------------
-- 9.1 Remove the waitlist
-- ---------------------------------------------------------------------------

drop function if exists public.get_waitlist_count();
drop table if exists public.waitlist;

-- ---------------------------------------------------------------------------
-- 9.2 Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  notes text check (notes is null or char_length(notes) <= 500),
  started_at timestamptz not null default now(),
  ended_at timestamptz check (ended_at is null or ended_at >= started_at),
  created_at timestamptz not null default now()
);

-- Only one active session per user
create unique index workout_sessions_one_active_per_user
  on public.workout_sessions (user_id) where ended_at is null;

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create index workout_sessions_user_created_idx
  on public.workout_sessions (user_id, created_at);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_name text not null check (char_length(btrim(exercise_name)) between 1 and 40),
  exercise_key text generated always as (lower(btrim(exercise_name))) stored,
  weight_kg numeric(5,1) not null
    check (weight_kg >= 0 and weight_kg <= 1000 and mod(weight_kg * 2, 1) = 0),
  reps integer not null check (reps between 1 and 100),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index workout_sets_session_idx on public.workout_sets (session_id, performed_at);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_key, performed_at);
create index workout_sets_user_performed_idx on public.workout_sets (user_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- 9.4 Functions (defined before the policies that use them)
-- ---------------------------------------------------------------------------

-- Is the signed-in user the demo account?
create or replace function public.is_demo()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.is_demo from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- Landing page counter: total sets by non-demo users.
create or replace function public.get_total_sets_logged()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select count(*)
  from public.workout_sets s
  join public.profiles p on p.id = s.user_id
  where p.is_demo = false;
$$;

-- Admin dashboard: aggregates only, never rows. The demo account is excluded.
create or replace function public.get_admin_stats()
returns table (
  total_users bigint,
  new_users_7d bigint,
  total_sessions bigint,
  total_sets bigint,
  feedback_feature bigint,
  feedback_critique bigint,
  feedback_bug bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles p where not p.is_demo),
    (select count(*) from public.profiles p
       where not p.is_demo and p.created_at > pg_catalog.now() - interval '7 days'),
    (select count(*) from public.workout_sessions s
       join public.profiles p on p.id = s.user_id where not p.is_demo),
    (select count(*) from public.workout_sets s
       join public.profiles p on p.id = s.user_id where not p.is_demo),
    (select count(*) from public.feedback f where f.category = 'feature'),
    (select count(*) from public.feedback f where f.category = 'critique'),
    (select count(*) from public.feedback f where f.category = 'bug');
end;
$$;

-- ---------------------------------------------------------------------------
-- 9.3 Triggers
-- ---------------------------------------------------------------------------

-- Profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Lifter'
      ),
      40
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- At most 20 sessions created per user in any 24 hours.
create or replace function public.enforce_session_rate()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Serialize concurrent inserts for the same user so the count is exact.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text));
  if (
    select count(*) from public.workout_sessions s
    where s.user_id = new.user_id and s.created_at > pg_catalog.now() - interval '24 hours'
  ) >= 20 then
    raise exception 'session_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger workout_sessions_rate
  before insert on public.workout_sessions
  for each row execute function public.enforce_session_rate();

-- Sets must belong to the session owner; at most 100 sets per session.
create or replace function public.enforce_set_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid;
begin
  -- Lock the parent session so concurrent inserts cannot exceed the cap.
  select s.user_id into v_owner
  from public.workout_sessions s
  where s.id = new.session_id
  for update;

  if v_owner is null or v_owner <> new.user_id then
    raise exception 'session_owner_mismatch' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' and (
    select count(*) from public.workout_sets ws where ws.session_id = new.session_id
  ) >= 100 then
    raise exception 'set_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger workout_sets_rules
  before insert or update of session_id, user_id on public.workout_sets
  for each row execute function public.enforce_set_rules();

-- Profiles for users that existed before this migration (e.g. the admin).
insert into public.profiles (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Lifter'
    ),
    40
  )
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Views for records and progress (FR26, FR28). security_invoker = true means
-- they run with the caller's privileges, so RLS on the base tables applies.
-- ---------------------------------------------------------------------------

-- Every set with its Epley estimate (FR5, rounded to 0.5 kg) and whether it beat
-- every earlier set of the same exercise. The first set of an exercise is never a
-- record, and equal values are not records.
create view public.workout_set_records
with (security_invoker = true)
as
with base as (
  select
    s.*,
    case
      when s.reps = 1 then s.weight_kg
      else round(s.weight_kg * (1 + s.reps / 30.0) * 2) / 2
    end::numeric(6,1) as e1rm
  from public.workout_sets s
),
ranked as (
  select
    b.*,
    max(b.e1rm) over earlier as prev_best_e1rm,
    max(b.weight_kg) over earlier as prev_best_weight
  from base b
  window earlier as (
    partition by b.user_id, b.exercise_key
    order by b.performed_at, b.created_at, b.id
    rows between unbounded preceding and 1 preceding
  )
)
select
  r.id,
  r.session_id,
  r.user_id,
  r.exercise_name,
  r.exercise_key,
  r.weight_kg,
  r.reps,
  r.performed_at,
  r.created_at,
  r.e1rm,
  coalesce(r.e1rm > r.prev_best_e1rm, false) as is_e1rm_pr,
  coalesce(r.weight_kg > r.prev_best_weight, false) as is_weight_pr
from ranked r;

-- One row per session with totals (history list, dashboard).
create view public.workout_session_summaries
with (security_invoker = true)
as
select
  s.id,
  s.user_id,
  s.name,
  s.notes,
  s.started_at,
  s.ended_at,
  count(r.id) as set_count,
  count(distinct r.exercise_key) as exercise_count,
  coalesce(sum(r.weight_kg * r.reps), 0)::numeric(12,1) as volume_kg,
  count(r.id) filter (where r.is_e1rm_pr or r.is_weight_pr) as pr_count
from public.workout_sessions s
left join public.workout_set_records r on r.session_id = s.id
group by s.id;

-- One row per exercise the user has logged (exercise list).
create view public.exercise_summaries
with (security_invoker = true)
as
select
  r.user_id,
  r.exercise_key,
  (array_agg(r.exercise_name order by r.performed_at desc))[1] as exercise_name,
  max(r.performed_at) as last_performed_at,
  max(r.e1rm) as best_e1rm,
  max(r.weight_kg) as best_weight_kg,
  count(*) as set_count
from public.workout_set_records r
group by r.user_id, r.exercise_key;

-- Best estimate per exercise per session (progress chart).
create view public.exercise_session_bests
with (security_invoker = true)
as
select
  r.user_id,
  r.exercise_key,
  r.session_id,
  s.started_at,
  max(r.e1rm) as best_e1rm,
  bool_or(r.is_e1rm_pr) as has_e1rm_pr
from public.workout_set_records r
join public.workout_sessions s on s.id = r.session_id
group by r.user_id, r.exercise_key, r.session_id, s.started_at;

-- ---------------------------------------------------------------------------
-- 9.5 Privileges and RLS
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets     enable row level security;

revoke all on table public.profiles, public.workout_sessions, public.workout_sets
  from public, anon, authenticated;
revoke all on table public.workout_set_records, public.workout_session_summaries,
  public.exercise_summaries, public.exercise_session_bests
  from public, anon, authenticated;

-- Column-level grants: users can only write the columns they own the meaning of.
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

grant select, delete on table public.workout_sessions to authenticated;
grant insert (name, notes) on table public.workout_sessions to authenticated;
grant update (name, notes, ended_at) on table public.workout_sessions to authenticated;

grant select, delete on table public.workout_sets to authenticated;
grant insert (session_id, exercise_name, weight_kg, reps) on table public.workout_sets to authenticated;
grant update (exercise_name, weight_kg, reps) on table public.workout_sets to authenticated;

grant select on table public.workout_set_records, public.workout_session_summaries,
  public.exercise_summaries, public.exercise_session_bests to authenticated;

grant all on table public.profiles, public.workout_sessions, public.workout_sets to service_role;
grant select on table public.workout_set_records, public.workout_session_summaries,
  public.exercise_summaries, public.exercise_session_bests to service_role;

-- profiles
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and not (select public.is_demo()));

-- workout_sessions
create policy "read own sessions" on public.workout_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own sessions" on public.workout_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and not (select public.is_demo()));
create policy "update own sessions" on public.workout_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and not (select public.is_demo()));
create policy "delete own sessions" on public.workout_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()) and not (select public.is_demo()));

-- workout_sets
create policy "read own sets" on public.workout_sets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own sets" on public.workout_sets
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not (select public.is_demo())
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );
create policy "update own sets" on public.workout_sets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and not (select public.is_demo())
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );
create policy "delete own sets" on public.workout_sets
  for delete to authenticated
  using (user_id = (select auth.uid()) and not (select public.is_demo()));

-- No policy for anon on any of these tables.

revoke execute on function public.get_total_sets_logged() from public;
grant  execute on function public.get_total_sets_logged() to anon, authenticated, service_role;

revoke execute on function public.is_demo() from public, anon;
grant  execute on function public.is_demo() to authenticated, service_role;

revoke execute on function public.get_admin_stats() from public, anon;
grant  execute on function public.get_admin_stats() to authenticated;

-- Trigger functions are never called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_session_rate() from public, anon, authenticated;
revoke execute on function public.enforce_set_rules() from public, anon, authenticated;
