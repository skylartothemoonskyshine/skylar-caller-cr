// Skylar Caller CRM — Supabase-backed data layer.
// Hydrated from Postgres after sign-in. Mutations apply optimistically to the
// in-memory arrays (so the existing sync render path keeps working) and write
// through to Supabase in the background. The same `store.*` API + `skylar-change`
// event keep the .jsx files unchanged.

const STAGES = [
  { id: 'new', label: 'New', className: 'stage-new' },
  { id: 'attempted', label: 'Attempted', className: 'stage-attempted' },
  { id: 'contacted', label: 'Contacted', className: 'stage-contacted' },
  { id: 'followup', label: 'Follow-up', className: 'stage-followup' },
  { id: 'interested', label: 'Interested', className: 'stage-interested' },
  { id: 'booked', label: 'Booked', className: 'stage-booked' },
  { id: 'won', label: 'Closed Won', className: 'stage-won' },
  { id: 'lost', label: 'Closed Lost', className: 'stage-lost' },
];

const NICHES = ['HVAC', 'Roofing', 'Med Spa', 'Auto Body', 'Dental', 'Solar', 'Landscaping', 'Plumbing', 'Chiropractic', 'Law Firm', 'Accounting'];
const SOURCES = ['Apollo list', 'Referral', 'LinkedIn', 'Cold list', 'Inbound web', 'Trade show', 'Google Maps scrape', 'Imported'];

// REPS / REP_OF are now hydrated from the `reps` table after sign-in.
// Start empty so any access before bootstrap is a safe undefined.
const REPS = [];
const REP_OF = {};

// --- Date helpers ---
function relativeDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d;
}
function formatDate(d) {
  if (!(d instanceof Date)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDateTime(d) {
  if (!(d instanceof Date)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function formatTime(d) {
  if (!(d instanceof Date)) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function safeUrl(u) {
  if (!u) return '#';
  const s = String(u).trim();
  if (!s) return '#';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  return `https://${s}`;
}
function displayUrl(u) {
  if (!u) return '';
  return String(u).replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
function formatDurationSec(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function relativeString(d) {
  if (!(d instanceof Date)) return '—';
  const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < -1) return `${Math.abs(Math.round(diff))}d ago`;
  if (diff < 0) return 'Yesterday';
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Tomorrow';
  if (diff < 7) return `in ${Math.round(diff)}d`;
  return formatDate(d);
}

function deriveInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

// --- Supabase client ---
const SUPABASE_URL = 'https://ukojlspznrrjnoeuxacw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BybfTFm4CWDjcV2USxgvgQ__7bIxoTZ';
// Fake-email domain used to translate UI usernames -> Supabase auth emails.
// Must match the local-part of the emails you create in auth.users.
const USERNAME_DOMAIN = 'skylar.local';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// --- Row mappers (snake_case <-> camelCase) ---
function leadFromRow(r) {
  return {
    id: r.id,
    fullName: r.full_name || '',
    initials: r.initials || '',
    business: r.business || '',
    phone: r.phone || '',
    email: r.email || '',
    website: r.website || '',
    niche: r.niche || '',
    location: r.location || '',
    street: r.street || '',
    city: r.city || '',
    state: r.state || '',
    country: r.country || '',
    rating: r.rating,
    reviews: r.reviews,
    mapsUrl: r.maps_url || '',
    stage: r.stage || 'new',
    ownerId: r.owner_id,
    ownerName: REP_OF[r.owner_id]?.name || '',
    ownerInitials: REP_OF[r.owner_id]?.initials || '',
    source: r.source || '',
    lastCallAt: r.last_call_at ? new Date(r.last_call_at) : null,
    nextFollowupAt: r.next_followup_at ? new Date(r.next_followup_at) : null,
    callAttempts: r.call_attempts || 0,
    createdAt: r.created_at ? new Date(r.created_at) : null,
  };
}
function leadToRow(l) {
  return {
    id: l.id,
    full_name: l.fullName,
    initials: l.initials || null,
    business: l.business || null,
    phone: l.phone || null,
    email: l.email || null,
    website: l.website || null,
    niche: l.niche || null,
    location: l.location || null,
    street: l.street || null,
    city: l.city || null,
    state: l.state || null,
    country: l.country || null,
    rating: l.rating ?? null,
    reviews: l.reviews ?? null,
    maps_url: l.mapsUrl || null,
    stage: l.stage,
    owner_id: l.ownerId || null,
    source: l.source || null,
    last_call_at: l.lastCallAt ? l.lastCallAt.toISOString() : null,
    next_followup_at: l.nextFollowupAt ? l.nextFollowupAt.toISOString() : null,
    call_attempts: l.callAttempts || 0,
    created_at: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
  };
}

function callLogFromRow(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    leadName: r.lead_name || '',
    business: r.business || '',
    phone: r.phone || '',
    disposition: r.disposition || '',
    duration: r.duration || '0:00',
    at: new Date(r.at),
    by: REP_OF[r.by_rep]?.initials || '',
    outcome: r.outcome || '—',
    callSid: r.call_sid,
    recordingSid: r.recording_sid,
    recordingUrl: r.recording_url,
  };
}
function callLogToRow(c) {
  return {
    id: c.id,
    lead_id: c.leadId || null,
    lead_name: c.leadName || null,
    business: c.business || null,
    phone: c.phone || null,
    disposition: c.disposition || null,
    duration: c.duration || null,
    at: (c.at instanceof Date ? c.at : new Date()).toISOString(),
    by_rep: store.user?.id || null,
    outcome: c.outcome || null,
    call_sid: c.callSid || null,
    recording_sid: c.recordingSid || null,
    recording_url: c.recordingUrl || null,
  };
}

function taskFromRow(r) {
  const lead = LEAD_OF[r.lead_id];
  return {
    id: r.id,
    kind: r.kind,
    leadId: r.lead_id,
    leadName: lead?.fullName || '',
    business: lead?.business || '',
    phone: lead?.phone || '',
    due: new Date(r.due),
    done: !!r.done,
    owner: REP_OF[r.owner_id]?.initials || '',
  };
}
function taskToRow(t) {
  return {
    id: t.id,
    kind: t.kind,
    lead_id: t.leadId,
    due: t.due.toISOString(),
    done: !!t.done,
    owner_id: store.user?.id || null,
  };
}

function noteFromRow(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    at: new Date(r.at),
    by: REP_OF[r.by_rep]?.initials || '',
    body: r.body,
  };
}
function noteToRow(n) {
  return {
    id: n.id,
    lead_id: n.leadId,
    at: n.at.toISOString(),
    by_rep: store.user?.id || null,
    body: n.body,
  };
}

function messageFromRow(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    direction: r.direction,
    body: r.body,
    at: new Date(r.at),
    sid: r.sid,
    status: r.status,
  };
}
function messageToRow(m) {
  return {
    id: m.id,
    lead_id: m.leadId,
    direction: m.direction,
    body: m.body,
    at: (m.at instanceof Date ? m.at : new Date()).toISOString(),
    sid: m.sid || null,
    status: m.status || null,
  };
}

function logErr(label, error) {
  if (error) console.warn(`[supabase] ${label} failed`, error);
}

// --- CSV/TSV parser ---
function parseDelimited(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.length);
  if (!lines.length) return [];
  const delim = lines[0].includes('\t') && !lines[0].includes(',') ? '\t' : ',';
  const parseRow = (line) => {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === delim) { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map(line => {
    const cells = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()]));
  });
}
const parseCSV = parseDelimited;

// --- Store ---
const store = {
  user: null,           // Supabase auth user once signed in
  leads: [],
  callLogs: [],
  tasks: [],
  notes: {},
  messages: {},
  me: null,             // user.id (uuid) — real audit identity, never mutated during view-as
  viewingAs: null,      // rep uuid an owner has temporarily "stepped into"; null otherwise

  // --- Auth ---
  // Supabase's password provider requires an email. We expose usernames in the
  // UI and transparently map `username` -> `username@skylar.local` at the edge,
  // so workers never see or type an email. Change USERNAME_DOMAIN if you ever
  // rebrand — it must match the local-part of the auth.users emails you create.
  async signInWithUsername(username, password) {
    const uname = (username || '').trim().toLowerCase();
    if (!uname) return { error: { message: 'Username required.' } };
    const email = `${uname}@${USERNAME_DOMAIN}`;
    return await sb.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    await sb.auth.signOut();
    this.user = null;
    this.me = null;
    this.viewingAs = null;
    REPS.length = 0;
    Object.keys(REP_OF).forEach(k => delete REP_OF[k]);
    this.clearLocal();
    this.dirty();
  },
  // Subscribe to auth state. Calls cb(user|null) immediately with current session
  // and again on every change. Returns the supabase subscription handle.
  onAuthChange(cb) {
    sb.auth.getSession().then(({ data: { session } }) => cb(session?.user || null));
    return sb.auth.onAuthStateChange((_event, session) => cb(session?.user || null));
  },

  // Called after sign-in: ensure a `reps` row, load all reps, hydrate everything.
  async bootstrap(user) {
    this.user = user;
    this.me = user.id;

    const email = user.email || '';
    const name = user.user_metadata?.name || email.split('@')[0] || 'Caller';
    const initials = deriveInitials(name);
    {
      // Insert a reps row if missing, but don't overwrite an existing one —
      // the `role` ('owner'|'caller') is seeded by migration SQL and must stick.
      const { error } = await sb.from('reps')
        .upsert({ id: user.id, name, initials, role: 'caller' }, { onConflict: 'id', ignoreDuplicates: true });
      logErr('reps upsert', error);
    }

    const { data: reps, error: repsErr } = await sb.from('reps').select('*');
    logErr('reps select', repsErr);
    REPS.length = 0;
    REPS.push(...(reps || []));
    Object.keys(REP_OF).forEach(k => delete REP_OF[k]);
    for (const r of REPS) REP_OF[r.id] = r;

    await this.hydrate();
  },

  async hydrate() {
    const [leadsR, callsR, tasksR, notesR, msgsR] = await Promise.all([
      sb.from('leads').select('*').order('created_at', { ascending: false }),
      sb.from('call_logs').select('*').order('at', { ascending: false }),
      sb.from('tasks').select('*'),
      sb.from('notes').select('*').order('at', { ascending: false }),
      sb.from('messages').select('*').order('at'),
    ]);
    logErr('hydrate leads', leadsR.error);
    logErr('hydrate call_logs', callsR.error);
    logErr('hydrate tasks', tasksR.error);
    logErr('hydrate notes', notesR.error);
    logErr('hydrate messages', msgsR.error);

    this.leads.splice(0, this.leads.length, ...((leadsR.data) || []).map(leadFromRow));
    this.rebuildIndex();
    // tasks need LEAD_OF populated to denormalize lead name/business/phone.
    this.callLogs.splice(0, this.callLogs.length, ...((callsR.data) || []).map(callLogFromRow));
    this.tasks.splice(0, this.tasks.length, ...((tasksR.data) || []).map(taskFromRow));

    this.notes = {};
    for (const n of (notesR.data || [])) {
      const local = noteFromRow(n);
      (this.notes[local.leadId] ||= []).push(local);
    }
    this.messages = {};
    for (const m of (msgsR.data || [])) {
      const local = messageFromRow(m);
      (this.messages[local.leadId] ||= []).push(local);
    }
    this.dirty();
  },

  clearLocal() {
    this.leads.length = 0;
    this.callLogs.length = 0;
    this.tasks.length = 0;
    this.notes = {};
    this.messages = {};
    this.rebuildIndex();
  },

  rebuildIndex() {
    Object.keys(LEAD_OF).forEach(k => delete LEAD_OF[k]);
    for (const l of this.leads) LEAD_OF[l.id] = l;
  },

  dirty() { window.dispatchEvent(new Event('skylar-change')); },

  currentRep() {
    return REP_OF[this.me] || REPS[0] || { id: this.me, name: '', initials: '?', role: 'caller' };
  },

  // --- View-as (owner impersonation, client-side only) ---
  // `me` is the real signed-in uuid used for every INSERT's by_rep / owner_id.
  // `viewingAs` is what the UI should filter/display against.
  // Writes never use viewingAs — the audit trail stays honest.
  isOwner() {
    return REP_OF[this.me]?.role === 'owner';
  },
  effectiveMe() {
    return this.viewingAs || this.me;
  },
  setViewingAs(repId) {
    if (!this.isOwner()) return;
    if (!repId || repId === this.me) return;
    if (!REP_OF[repId]) return;
    this.viewingAs = repId;
    this.dirty();
  },
  clearViewingAs() {
    if (!this.viewingAs) return;
    this.viewingAs = null;
    this.dirty();
  },

  // Leads visible to the CURRENT view: owner (not viewing-as) sees all;
  // workers — and owner while viewing-as — see only leads assigned to them.
  visibleLeads() {
    if (this.isOwner() && !this.viewingAs) return this.leads;
    const scope = this.effectiveMe();
    return this.leads.filter(l => l.ownerId === scope);
  },

  addLead(lead) {
    const rep = this.currentRep();
    const id = crypto.randomUUID();
    const full = {
      id,
      fullName: '',
      initials: '',
      business: '',
      phone: '',
      email: '',
      website: '',
      niche: '',
      location: '',
      stage: 'new',
      ownerId: this.me || null,
      ownerName: rep?.name || '',
      ownerInitials: rep?.initials || '',
      source: 'Manual',
      lastCallAt: null,
      nextFollowupAt: null,
      callAttempts: 0,
      createdAt: new Date(),
      ...lead,
    };
    if (!full.initials && full.fullName) full.initials = deriveInitials(full.fullName);
    this.leads.unshift(full);
    LEAD_OF[id] = full;
    this.dirty();
    sb.from('leads').insert(leadToRow(full)).then(({ error }) => logErr('addLead', error));
    return full;
  },

  updateLead(id, patch) {
    const l = LEAD_OF[id] || this.leads.find(x => x.id === id);
    if (!l) return;
    Object.assign(l, patch);
    this.dirty();
    sb.from('leads').update(leadToRow(l)).eq('id', id).then(({ error }) => logErr('updateLead', error));
  },

  deleteLead(id) {
    const idx = this.leads.findIndex(l => l.id === id);
    if (idx < 0) return;
    this.leads.splice(idx, 1);
    delete LEAD_OF[id];
    delete this.notes[id];
    delete this.messages[id];
    this.tasks = this.tasks.filter(t => t.leadId !== id);
    // keep call logs — null out the leadId so history survives the delete.
    this.callLogs.forEach(c => { if (c.leadId === id) c.leadId = null; });
    this.dirty();
    // Postgres ON DELETE handles tasks/notes/messages cascade;
    // call_logs uses ON DELETE SET NULL so history is preserved server-side too.
    sb.from('leads').delete().eq('id', id).then(({ error }) => logErr('deleteLead', error));
  },

  updateCallLog(id, patch) {
    const c = this.callLogs.find(x => x.id === id);
    if (!c) return;
    Object.assign(c, patch);
    this.dirty();
    sb.from('call_logs').update(callLogToRow(c)).eq('id', id).then(({ error }) => logErr('updateCallLog', error));
  },

  async importLeads(rows) {
    const rep = this.currentRep();
    const mapped = rows.map((row) => {
      const title = (row.title || '').trim();
      const business = (row.business || row.company || title).trim();
      const personName = (row.name || row.fullname || `${row.first || ''} ${row.last || ''}`).trim();
      const fullName = personName || business || 'Unknown';
      const initials = deriveInitials(fullName);

      const niche = row.niche || row.industry || row['categories/0'] || row.categoryname || row.category || '';
      const location = [row.street, row.city, row.state].filter(Boolean).join(', ') || row.city || row.location || '';
      const rating  = row.totalscore || row.rating ? Number(row.totalscore || row.rating) : null;
      const reviews = row.reviewscount || row.reviews ? Number(row.reviewscount || row.reviews) : null;
      const mapsUrl = row.url || row.mapsurl || '';

      return {
        id: crypto.randomUUID(),
        fullName,
        initials,
        business,
        phone: row.phone || row.phonenumber || '',
        email: row.email || '',
        website: row.website || '',
        niche,
        location,
        street: row.street || '',
        city: row.city || '',
        state: row.state || '',
        country: row.countrycode || row.country || '',
        rating,
        reviews,
        mapsUrl,
        stage: 'new',
        ownerId: this.me || null,
        ownerName: rep?.name || '',
        ownerInitials: rep?.initials || '',
        source: row.source || (title ? 'Google Maps' : 'Imported'),
        lastCallAt: null,
        nextFollowupAt: null,
        callAttempts: 0,
        createdAt: new Date(),
      };
    });

    // Append, don't wipe — multiple reps share this pipeline now.
    // Use clearAll (Tweaks panel) for an explicit reset.
    this.leads.unshift(...mapped);
    this.rebuildIndex();
    this.dirty();

    const CHUNK = 500;
    for (let i = 0; i < mapped.length; i += CHUNK) {
      const chunk = mapped.slice(i, i + CHUNK).map(leadToRow);
      const { error } = await sb.from('leads').insert(chunk);
      logErr('importLeads chunk', error);
    }
    return mapped.length;
  },

  addCallLog({ leadId, disposition, outcome, duration, note, snapshot, callSid }) {
    const lead = LEAD_OF[leadId];
    const fallback = snapshot || {};
    const rep = this.currentRep();
    const entry = {
      id: crypto.randomUUID(),
      leadId: lead ? leadId : null,
      leadName: lead ? lead.fullName : (fallback.fullName || 'Unknown'),
      business: lead ? lead.business : (fallback.business || 'Ad-hoc'),
      phone:    lead ? lead.phone    : (fallback.phone    || ''),
      disposition,
      duration: duration || '0:00',
      at: new Date(),
      by: rep?.initials || '',
      outcome: outcome || '—',
      callSid: callSid || null,
    };
    this.callLogs.unshift(entry);
    if (lead) {
      lead.lastCallAt = entry.at;
      lead.callAttempts = (lead.callAttempts || 0) + 1;
      sb.from('leads')
        .update({ last_call_at: entry.at.toISOString(), call_attempts: lead.callAttempts })
        .eq('id', lead.id)
        .then(({ error }) => logErr('lead-after-call update', error));
    }
    sb.from('call_logs').insert(callLogToRow(entry)).then(({ error }) => logErr('addCallLog', error));
    if (lead && note && note.trim()) {
      this.addNote(leadId, note.trim());
    } else {
      this.dirty();
    }
    return entry;
  },

  addNote(leadId, body) {
    if (!body || !body.trim()) return;
    const rep = this.currentRep();
    const entry = {
      id: crypto.randomUUID(),
      leadId,
      at: new Date(),
      by: rep?.initials || '',
      body: body.trim(),
    };
    (this.notes[leadId] ||= []).unshift(entry);
    this.dirty();
    sb.from('notes').insert(noteToRow(entry)).then(({ error }) => logErr('addNote', error));
  },

  getNotes(leadId) { return this.notes[leadId] || []; },
  getCallHistory(leadId) { return this.callLogs.filter(c => c.leadId === leadId); },

  addMessage(leadId, msg) {
    const entry = {
      id: crypto.randomUUID(),
      direction: 'out',
      body: '',
      at: new Date(),
      status: null,
      sid: null,
      ...msg,
      leadId,
    };
    (this.messages[leadId] ||= []).push(entry);
    this.dirty();
    sb.from('messages').insert(messageToRow(entry)).then(({ error }) => logErr('addMessage', error));
    return entry;
  },
  getMessages(leadId) { return this.messages[leadId] || []; },

  attachRecording(leadId, recording) {
    let target = null;
    if (recording.callSid) target = this.callLogs.find(c => c.callSid === recording.callSid);
    if (!target && leadId)  target = this.callLogs.find(c => c.leadId === leadId);
    if (!target)            target = this.callLogs.find(c => !c.recordingSid);
    if (target && target.recordingSid !== recording.recordingSid) {
      target.recordingSid = recording.recordingSid;
      target.recordingUrl = `/api/recording-play?sid=${encodeURIComponent(recording.recordingSid)}`;
      if (recording.duration) target.duration = formatDurationSec(Number(recording.duration));
      this.dirty();
      sb.from('call_logs').update({
        recording_sid: target.recordingSid,
        recording_url: target.recordingUrl,
        duration: target.duration,
      }).eq('id', target.id).then(({ error }) => logErr('attachRecording', error));
    }
  },

  async clearAll() {
    this.leads.length = 0;
    this.callLogs.length = 0;
    this.tasks.length = 0;
    this.notes = {};
    this.messages = {};
    this.rebuildIndex();
    this.dirty();
    // Order matters even with cascades: delete leaves first.
    // Supabase requires a filter on .delete(), so use a sentinel uuid neq.
    const SENTINEL = '00000000-0000-0000-0000-000000000000';
    for (const t of ['messages', 'notes', 'tasks', 'call_logs', 'leads']) {
      const { error } = await sb.from(t).delete().neq('id', SENTINEL);
      logErr(`clearAll ${t}`, error);
    }
  },

  toggleTask(id) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    this.dirty();
    sb.from('tasks').update({ done: t.done }).eq('id', id).then(({ error }) => logErr('toggleTask', error));
  },

  setTask(leadId, due, kind = 'Call follow-up') {
    const lead = LEAD_OF[leadId];
    if (!lead) return;
    const idx = this.tasks.findIndex(t => t.leadId === leadId && !t.done && t.kind === kind);
    const id = idx >= 0 ? this.tasks[idx].id : crypto.randomUUID();
    const entry = {
      id,
      kind,
      leadId,
      leadName: lead.fullName,
      business: lead.business,
      phone: lead.phone,
      due,
      done: false,
      owner: this.currentRep()?.initials || '',
    };
    if (idx >= 0) this.tasks[idx] = entry;
    else this.tasks.push(entry);
    this.tasks.sort((a, b) => a.due - b.due);
    lead.nextFollowupAt = due;
    this.dirty();

    sb.from('tasks').upsert(taskToRow(entry), { onConflict: 'id' })
      .then(({ error }) => logErr('setTask upsert', error));
    sb.from('leads').update({ next_followup_at: due.toISOString() }).eq('id', leadId)
      .then(({ error }) => logErr('setTask lead update', error));
  },

  clearFollowup(leadId) {
    const removed = this.tasks.filter(t => t.leadId === leadId && !t.done && t.kind === 'Call follow-up');
    this.tasks = this.tasks.filter(t => !(t.leadId === leadId && !t.done && t.kind === 'Call follow-up'));
    const lead = LEAD_OF[leadId];
    if (lead) lead.nextFollowupAt = null;
    this.dirty();
    for (const t of removed) {
      sb.from('tasks').delete().eq('id', t.id).then(({ error }) => logErr('clearFollowup task delete', error));
    }
    if (lead) {
      sb.from('leads').update({ next_followup_at: null }).eq('id', leadId)
        .then(({ error }) => logErr('clearFollowup lead update', error));
    }
  },

  // resetDemo is a no-op now that the DB is authoritative — there's no demo
  // seed to regenerate. Use clearAll + a CSV import instead.
  resetDemo() {
    console.info('[skylar] resetDemo is a no-op now — use Clear all + CSV import.');
  },
};

// --- Globals bound to the store's live arrays ---
const LEADS = store.leads;
const CALL_LOGS = store.callLogs;
const TASKS = store.tasks;
const LEAD_OF = {};
const STAGE_OF = Object.fromEntries(STAGES.map(s => [s.id, s]));

Object.assign(window, {
  STAGES, REPS, REP_OF, NICHES, SOURCES,
  LEADS, LEAD_OF, STAGE_OF, CALL_LOGS, TASKS,
  formatDate, formatDateTime, formatTime, relativeString, relativeDate, formatDurationSec,
  parseCSV, parseDelimited, safeUrl, displayUrl,
  store,
});
