-- Minimal stand-in for the Supabase roles and auth schema, so the migration can be
-- checked on a plain local Postgres. Not part of the real migration.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role; grant execute on function auth.uid() to public;
grant usage on schema public to anon, authenticated, service_role;
-- emulate Supabase default privileges (tables auto-granted to API roles)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
