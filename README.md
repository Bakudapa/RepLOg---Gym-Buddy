# RepLog

Landing page for RepLog, a (fictional) free gym log for sets, reps, and weight.

## Admin setup

Admin accounts are created by hand. There is no sign-up page.

1. Supabase Dashboard → **Authentication → Sign In / Providers** → turn off **Allow new users to sign up**.
2. **Authentication → Users → Add user**: create the admin with an email and a strong password.
   Copy the new user's UUID.
3. **SQL Editor**:

   ```sql
   insert into public.admins (user_id) values ('<uuid of the admin user>');
   ```

A signed-in user without a row in `public.admins` sees a 403 page and gets 403 from `/api/admin/*`.
