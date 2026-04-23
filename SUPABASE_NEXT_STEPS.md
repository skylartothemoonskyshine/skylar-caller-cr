# Skylar Caller CRM — Supabase Migration Next Steps

**Status: Steps 1–4 landed.** Schema + RLS are live, [data.js](data.js) is Supabase-backed, magic-link auth gates the app, and a `reps` row auto-upserts on first sign-in. Remaining work: realtime subscriptions, server-side webhook writes, and tightening the per-owner RLS policies. See "What's left" at the bottom.

Goal: replace the `localStorage`-backed `store` in [data.js](data.js) with a Supabase Postgres backend so **every caller sees the same leads, calls, tasks, notes, and SMS history from any device**, not just their own browser.

Project ref: `ukojlspznrrjnoeuxacw`
Project URL: `https://ukojlspznrrjnoeuxacw.supabase.co`
Publishable key: `sb_publishable_BybfTFm4CWDjcV2USxgvgQ__7bIxoTZ`

MCP is wired up so Claude runs SQL directly against the project — you do **not** need to paste SQL into the Supabase dashboard manually. All migrations below will be applied via `mcp__claude_ai_Supabase__apply_migration`.

---

## Current state (why we're doing this)

- Data layer is a single `store` object in [data.js](data.js) that reads/writes `localStorage` keys: `skylar:leads`, `skylar:call_logs`, `skylar:tasks`, `skylar:notes`, `skylar:messages`, `skylar:me`.
- Each browser has its own CRM. Two callers on two laptops = two parallel universes.
- Twilio calls, SMS, and recordings already go through real API endpoints ([api/](api/)) and are shared — only the CRM state around them is siloed.
- Vercel deploy is live; repo is public.

## Target state

- Postgres tables: `reps`, `leads`, `call_logs`, `tasks`, `notes`, `messages`.
- Row-Level Security on from day 1. Auth via Supabase Auth (magic-link email).
- Realtime subscriptions so when one rep moves a lead from `contacted` → `interested`, the other rep's kanban updates live.
- Twilio webhooks ([api/recording.js](api/recording.js), incoming SMS) write through the Supabase service-role key, not a browser.

---

## Step 1 — Schema (applied via MCP, no manual SQL)

Tables below reflect the fields already in the `store` in [data.js:200-532](data.js#L200-L532). `text[]` for enums is deliberate — cheaper than extra lookup tables for 8 stages / ~10 niches.

```sql
-- reps: maps to Supabase auth.users 1:1 via id
create table reps (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  initials text not null,
  role text not null default 'Caller'
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  initials text,
  business text,
  phone text,
  email text,
  website text,
  niche text,
  location text,
  street text, city text, state text, country text,
  rating numeric, reviews int, maps_url text,
  stage text not null default 'new',
  owner_id uuid references reps(id) on delete set null,
  source text,
  last_call_at timestamptz,
  next_followup_at timestamptz,
  call_attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index leads_stage_idx on leads(stage);
create index leads_owner_idx on leads(owner_id);

create table call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  lead_name text, business text, phone text,
  disposition text,
  duration text,
  at timestamptz not null default now(),
  by_rep uuid references reps(id) on delete set null,
  outcome text,
  call_sid text unique,
  recording_sid text,
  recording_url text
);
create index call_logs_lead_idx on call_logs(lead_id);
create index call_logs_at_idx   on call_logs(at desc);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'Call follow-up',
  lead_id uuid references leads(id) on delete cascade,
  due timestamptz not null,
  done boolean not null default false,
  owner_id uuid references reps(id) on delete set null
);
create index tasks_due_idx on tasks(due) where done = false;

create table notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  at timestamptz not null default now(),
  by_rep uuid references reps(id) on delete set null,
  body text not null
);
create index notes_lead_idx on notes(lead_id, at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  body text not null,
  at timestamptz not null default now(),
  sid text unique,
  status text
);
create index messages_lead_idx on messages(lead_id, at);
```

## Step 2 — RLS policies (also applied via MCP)

MVP: any authenticated rep can read/write everything (small team, shared pipeline). Tighten to per-owner later.

```sql
alter table leads      enable row level security;
alter table call_logs  enable row level security;
alter table tasks      enable row level security;
alter table notes      enable row level security;
alter table messages   enable row level security;
alter table reps       enable row level security;

create policy "authed reps read all"  on leads     for select to authenticated using (true);
create policy "authed reps write all" on leads     for all    to authenticated using (true) with check (true);
-- repeat for call_logs, tasks, notes, messages, reps
```

## Step 3 — Frontend: swap localStorage for Supabase client

1. Add `@supabase/supabase-js` via CDN in [index.html](index.html) (keeps the zero-build setup):
   ```html
   <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
   ```
2. In [data.js](data.js), replace the `store.load` / `store.save` / `dirty` plumbing with async Supabase calls. Keep the exact same public shape (`store.addLead`, `store.updateLead`, etc.) so [dashboard.jsx](dashboard.jsx), [lead-detail.jsx](lead-detail.jsx), [leads-kanban.jsx](leads-kanban.jsx), [dialer-modals.jsx](dialer-modals.jsx), [calendar-calls.jsx](calendar-calls.jsx) don't need rewrites.
3. Replace the global `LEADS` / `CALL_LOGS` / `TASKS` arrays with reactive caches hydrated from Supabase + kept in sync by a `.channel()` subscription. The existing `skylar-change` event already drives re-renders — we just fire it from the realtime callback.
4. `store.importLeads(rows)` → batch `insert` chunked to 500 rows (current biggest Apify export is ~300, headroom is fine).

## Step 4 — Auth

- Enable Email (magic link) provider in Supabase dashboard → Auth → Providers. No password flow — callers click a link in Gmail.
- Add a minimal login screen gated before `<Dashboard />` renders. One `supabase.auth.onAuthStateChange` listener + a sign-out button in the header.
- On first sign-in, upsert into `reps` using the user's `id`, email, a derived name and initials. The existing `REPS` constant goes away.

## Step 5 — Server-side writes (Twilio webhooks)

[api/recording.js](api/recording.js), inbound SMS, and eventually Twilio status callbacks must write to Postgres. These run server-side, so use the **service-role key** (bypasses RLS) from env:

```
SUPABASE_URL=https://ukojlspznrrjnoeuxacw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from dashboard → Settings → API>
SUPABASE_ANON_KEY=sb_publishable_BybfTFm4CWDjcV2USxgvgQ__7bIxoTZ
```

Add those to Vercel via `vercel env add …`. Update [.env.example](.env.example) with the three new vars.

The current recording SSE stream (`/api/recording/stream`) becomes a Supabase realtime subscription on `call_logs` — simpler and works across serverless invocations.

## Step 6 — One-time data move

If any real leads live in a browser's `localStorage` today:

1. In DevTools: `copy(JSON.stringify({leads: localStorage.getItem('skylar:leads'), calls: localStorage.getItem('skylar:call_logs'), tasks: localStorage.getItem('skylar:tasks'), notes: localStorage.getItem('skylar:notes'), messages: localStorage.getItem('skylar:messages')}))`
2. Paste in a chat here — Claude runs the SQL inserts via MCP.

If everything is still demo data, skip this and let the seed loader run once against the empty DB.

## Step 7 — Cleanup

- Drop the demo-data functions (`demoLeads`, `demoCallLogs`, `demoNotes`, `demoTasks` in [data.js](data.js)) or gate them behind a `?seed=1` query param so production never regenerates fake rows.
- Remove `store.resetDemo` from the UI (or make it an admin-only confirm dialog that calls a server endpoint).
- Update [SETUP.md](SETUP.md) and [DEPLOY.md](DEPLOY.md) with the three Supabase env vars and the magic-link login step.

---

## What's left

- **Step 3.3 — realtime subscriptions.** Not wired yet. Today, when one rep moves a lead, other reps see the change only after a refresh (or after their own next mutation triggers a re-render). Add `sb.channel('public:leads').on('postgres_changes', ...).subscribe()` in [data.js](data.js) `bootstrap()`, and on each event splice into `LEADS`/`CALL_LOGS`/`TASKS`/`notes`/`messages` then fire `skylar-change`.
- **Step 5 — server-side writes.** [api/recording.js](api/recording.js) and inbound SMS still post into the SSE stream / nothing. They should write directly to `call_logs` / `messages` via the service-role key. Needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` added to Vercel env.
- **Tighten RLS.** Current policies allow any authenticated rep to read/write everything (the advisor flagged 6 `rls_policy_always_true` warnings — expected per the MVP plan). Once you're past the small-team phase, scope writes to `owner_id = auth.uid()`.
- **Email provider check.** Magic link uses Supabase's default Email provider. If sign-in emails don't arrive, enable Email provider explicitly in Dashboard → Auth → Providers (and consider configuring SMTP for production rate limits).

## What landed

- Schema (`reps`, `leads`, `call_logs`, `tasks`, `notes`, `messages`) with indexes — migration `init_crm_schema`.
- RLS on all six tables, `authenticated` role read/write — migration `enable_rls_authed_full_access`.
- [data.js](data.js) is a full Supabase client now: hydrates from Postgres after sign-in, mutations apply optimistically + write through. Dropped demo seed and all `localStorage` reads/writes.
- [index.html](index.html) loads `@supabase/supabase-js@2`, gates the app with a magic-link login, and replaces the rep-switch button with a sign-out confirm.
- `REPS`/`REP_OF` are now hydrated from the `reps` table after sign-in, not hardcoded `u1`/`u2`.
- `store.importLeads(rows)` semantics changed: appends instead of wiping (previous behavior would erase the team's pipeline). Use Tweaks → "Clear all" for an explicit wipe.
- `store.resetDemo()` is a no-op; the "Reset demo data" button is removed.
