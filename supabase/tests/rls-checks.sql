-- Expected results: service_role writes succeed; every anon write/read and every
-- authenticated write fails with "permission denied"; a non-admin sees 0 rows; an admin sees rows.
\set ON_ERROR_STOP 0
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');
set role service_role;
insert into public.waitlist (email) values ('a@example.com');
insert into public.feedback (category, message) values ('bug', 'Something is broken here');
select 'svc rl', * from public.check_rate_limit('waitlist:abc', 2, 3600);
select 'svc rl', * from public.check_rate_limit('waitlist:abc', 2, 3600);
select 'svc rl 3rd', * from public.check_rate_limit('waitlist:abc', 2, 3600);
insert into public.waitlist (email) values ('a@example.com'); -- expect 23505
insert into public.waitlist (email) values ('Upper@Example.com'); -- expect check violation
reset role;
set role anon;
select 'anon count', public.get_waitlist_count();
insert into public.waitlist (email) values ('x@example.com'); -- expect permission denied
insert into public.feedback (category, message) values ('bug', 'anon direct insert'); -- denied
select 'anon select', count(*) from public.waitlist; -- denied
select public.check_rate_limit('x', 1, 60); -- denied
select public.is_admin(); -- denied
reset role;
set role authenticated; set request.jwt.sub = '22222222-2222-2222-2222-222222222222';
select 'nonadmin is_admin', public.is_admin();
select 'nonadmin waitlist rows', count(*) from public.waitlist;
select 'nonadmin admins rows', count(*) from public.admins;
insert into public.waitlist (email) values ('y@example.com'); -- denied
select public.check_rate_limit('x', 1, 60); -- denied
reset role;
set role authenticated; set request.jwt.sub = '11111111-1111-1111-1111-111111111111';
select 'admin is_admin', public.is_admin();
select 'admin waitlist rows', count(*) from public.waitlist;
select 'admin feedback rows', count(*) from public.feedback;
delete from public.waitlist; -- denied
update public.feedback set message = 'hacked hacked'; -- denied
