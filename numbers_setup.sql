-- Skylar CRM — selectable caller IDs + per-rep number access
-- ===========================================================
-- Run this ONCE in the Supabase SQL Editor (project ukojlspznrrjnoeuxacw).
-- Idempotent — safe to re-run.
--
-- What it does:
--   1. Adds reps.username (email local-part) so the API can map a Twilio
--      client identity back to a reps row.
--   2. Creates caller_numbers   — the pool of Twilio numbers you own.
--   3. Creates rep_numbers      — which numbers each rep may call from.
--      Owners bypass this table (they can always use every number).
--      A rep with NO rows here falls back to the default env number.
--   4. Seeds your 3 Twilio numbers and mirrors today's env-based routing
--      (rayan -> Montreal, caller2 -> QC).
--   5. RLS: every signed-in rep can read both tables; only the owner
--      can change number assignments.

-- 1. Username column, backfilled from auth emails.
alter table reps add column if not exists username text;
update reps r
   set username = split_part(u.email, '@', 1)
  from auth.users u
 where u.id = r.id
   and (r.username is null or r.username = '');

-- 2. Pool of Twilio numbers.
create table if not exists caller_numbers (
  phone text primary key,        -- E.164, must match a number on the Twilio account
  label text not null default ''
);

-- 3. Per-rep allowlist.
create table if not exists rep_numbers (
  rep_id uuid not null references reps(id) on delete cascade,
  phone  text not null references caller_numbers(phone) on delete cascade,
  primary key (rep_id, phone)
);

-- 4. Seed numbers + mirror current env-var routing as starting assignments.
insert into caller_numbers (phone, label) values
  ('+14385335193', 'Montreal, QC'),
  ('+18392743154', 'US (default)'),
  ('+14388393631', 'Quebec, CA')
on conflict (phone) do nothing;

insert into rep_numbers (rep_id, phone)
select r.id, '+14385335193' from reps r where r.username = 'rayan'
on conflict do nothing;

insert into rep_numbers (rep_id, phone)
select r.id, '+14388393631' from reps r where r.username = 'caller2'
on conflict do nothing;

-- 5. RLS.
alter table caller_numbers enable row level security;
alter table rep_numbers    enable row level security;

drop policy if exists "authenticated read caller_numbers" on caller_numbers;
create policy "authenticated read caller_numbers" on caller_numbers
  for select to authenticated using (true);

drop policy if exists "owner writes caller_numbers" on caller_numbers;
create policy "owner writes caller_numbers" on caller_numbers
  for all to authenticated
  using  (exists (select 1 from reps where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from reps where id = auth.uid() and role = 'owner'));

drop policy if exists "authenticated read rep_numbers" on rep_numbers;
create policy "authenticated read rep_numbers" on rep_numbers
  for select to authenticated using (true);

drop policy if exists "owner writes rep_numbers" on rep_numbers;
create policy "owner writes rep_numbers" on rep_numbers
  for all to authenticated
  using  (exists (select 1 from reps where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from reps where id = auth.uid() and role = 'owner'));

-- Sanity check — numbers, then who's assigned what.
select phone, label from caller_numbers order by phone;
select r.username, r.role, rn.phone
  from reps r
  left join rep_numbers rn on rn.rep_id = r.id
 order by r.role desc, r.username;
