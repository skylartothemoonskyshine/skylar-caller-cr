-- Skylar CRM — owner + 2 sub-accounts setup
-- ==========================================
-- Run this ONCE in the Supabase SQL Editor (project ukojlspznrrjnoeuxacw),
-- AFTER creating the 3 auth users in Dashboard → Authentication → Users.
--
-- The app asks for a USERNAME on login, not an email. Under the hood we map
-- `username` -> `username@skylar.local` before calling Supabase. So the emails
-- you create below are really just "usernames with a suffix" — the local-part
-- (before @) IS what users will type in the login form.
--
-- Steps:
--   1. Dashboard → Authentication → Users → "Add user" → Create new user,
--      with "Auto Confirm User" ON, for each of your 3 emails below.
--      Example usernames: anes (owner), caller1, caller2.
--   2. Replace the three email strings at the bottom of this file if yours differ.
--      Keep the `@skylar.local` suffix unless you also change USERNAME_DOMAIN
--      in data.js.
--   3. Run this whole file in SQL Editor.
--
-- Idempotent — safe to re-run.

-- Widen reps.role to the two values this app uses.
alter table reps drop constraint if exists reps_role_check;
alter table reps add constraint reps_role_check
  check (role in ('owner', 'caller'));

-- Seed/upgrade reps rows from auth.users. Initials/name derived from the email
-- local-part; edit them later in the dashboard if you want nicer display names.
-- ON CONFLICT (id) DO UPDATE so re-running after the app has auto-inserted a
-- default 'caller' row correctly promotes the owner.
insert into reps (id, name, initials, role)
select u.id,
       split_part(u.email, '@', 1)                                              as name,
       upper(substring(split_part(u.email, '@', 1) from 1 for 2))               as initials,
       case when u.email = 'anes@skylar.local'    then 'owner'
            else 'caller'
       end                                                                      as role
  from auth.users u
 where u.email in (
   'anes@skylar.local',     -- owner (you)
   'caller1@skylar.local',  -- sub-account 1
   'caller2@skylar.local'   -- sub-account 2
 )
on conflict (id) do update
  set role = excluded.role;

-- Sanity check — should return 3 rows, one with role='owner', two with 'caller'.
select id, name, initials, role from reps order by role desc, name;
