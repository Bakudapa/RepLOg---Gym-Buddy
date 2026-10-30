-- RepLog: initial schema (PRD section 10).
--
-- Security model:
--   * anon has no table privileges and no policies. Visitors never write directly;
--     inserts go through Next.js Route Handlers using the service role.
--   * anon may only call get_waitlist_count(), which returns a number.
--   * Admins read through their own session (authenticated role); RLS checks is_admin().
--   * check_rate_limit() is callable by service_role only.
--
-- Adjustments to the PRD SQL (security intent unchanged, see docs/REPORT.md):
--   * SECURITY DEFINER functions use `set search_path = ''` with fully-qualified names,
--     as recommended by Supabase's database linter.
--   * Explicit REVOKE/GRANT on tables, because Supabase grants table privileges to
--     anon/authenticated by default. RLS still applies on top.
--   * auth.uid() is wrapped in (select ...) so it is evaluated once per query.
--   * Extra index on rate_limits(window_start) for the daily cleanup.
--   * pg_cron cleanup is scheduled only if the extension is available.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) <= 254 and email = lower(email)),
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('feature', 'critique', 'bug')),
  message text not null check (char_length(message) between 10 and 1000),
  email text check (email is null or char_length(email) <= 254),
  created_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);

create index feedback_category_created_at_idx on public.feedback (category, created_at desc);
create index feedback_created_at_idx on public.feedback (created_at desc);
create index waitlist_created_at_idx on public.waitlist (created_at desc);
create index rate_limits_window_start_idx on public.rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Is the signed-in user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Number of waitlist sign-ups (the only thing anon may call).
create or replace function public.get_waitlist_count()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select count(*) from public.waitlist;
$$;

-- Fixed-window rate limit, atomic thanks to INSERT ... ON CONFLICT DO UPDATE.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_window_start timestamptz :=
    pg_catalog.to_timestamp(
      floor(extract(epoch from pg_catalog.now()) / p_window_seconds) * p_window_seconds
    );
  v_count integer;
begin
  if p_key is null or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = rl.count + 1
  returning rl.count into v_count;

  allowed := v_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from (
        v_window_start + make_interval(secs => p_window_seconds) - pg_catalog.now()
      )))::integer
    )
  end;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

alter table public.waitlist    enable row level security;
alter table public.feedback    enable row level security;
alter table public.admins      enable row level security;
alter table public.rate_limits enable row level security;

-- No table privileges for anon at all. authenticated may only SELECT, and RLS
-- decides which rows. service_role (server only) bypasses RLS.
revoke all on table public.waitlist, public.feedback, public.admins, public.rate_limits
  from public, anon, authenticated;

grant select on table public.waitlist, public.feedback, public.admins to authenticated;

grant select, insert on table public.waitlist, public.feedback to service_role;
grant select on table public.admins to service_role;
grant select, insert, update, delete on table public.rate_limits to service_role;

-- No policy for anon on any table.
-- Inserts from visitors only happen through Route Handlers with the service role.

create policy "admins can read waitlist"
  on public.waitlist for select to authenticated
  using ((select public.is_admin()));

create policy "admins can read feedback"
  on public.feedback for select to authenticated
  using ((select public.is_admin()));

create policy "users can read their own admin row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- rate_limits: no policy (service role only).

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant  execute on function public.check_rate_limit(text, integer, integer) to service_role;

revoke execute on function public.get_waitlist_count() from public;
grant  execute on function public.get_waitlist_count() to anon, authenticated, service_role;

revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Cleanup of old rate limit rows (PRD 8.4)
-- ---------------------------------------------------------------------------
-- Scheduled daily with pg_cron when available. Otherwise run manually:
--   delete from public.rate_limits where window_start < now() - interval '24 hours';

do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'replog-rate-limits-cleanup',
      '17 3 * * *',
      $$delete from public.rate_limits where window_start < now() - interval '24 hours'$$
    );
  else
    raise notice 'pg_cron not available; clean up rate_limits manually (see README).';
  end if;
exception
  when others then
    raise notice 'Could not schedule pg_cron cleanup: %. Clean up rate_limits manually (see README).', sqlerrm;
end
$do$;
