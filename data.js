// Skylar Caller CRM — data layer
// localStorage-backed store, same global exports as the prototype so the JSX
// modules don't need to change how they read data.

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

const REPS = [
  { id: 'u1', name: 'Derek Moreno', initials: 'DM', role: 'Caller' },
  { id: 'u2', name: 'Amelia Park', initials: 'AP', role: 'Manager' },
];
const REP_OF = Object.fromEntries(REPS.map(r => [r.id, r]));

const NICHES = ['HVAC', 'Roofing', 'Med Spa', 'Auto Body', 'Dental', 'Solar', 'Landscaping', 'Plumbing', 'Chiropractic', 'Law Firm', 'Accounting'];
const SOURCES = ['Apollo list', 'Referral', 'LinkedIn', 'Cold list', 'Inbound web', 'Trade show', 'Google Maps scrape', 'Imported'];

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
// Safely build an href for a user-typed URL — don't double-prepend the scheme.
function safeUrl(u) {
  if (!u) return '#';
  const s = String(u).trim();
  if (!s) return '#';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  return `https://${s}`;
}
// Strip the scheme when displaying a URL so "https://foo.com/" → "foo.com/"
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

// --- Serialization ---
const LEAD_DATE_FIELDS = ['lastCallAt', 'nextFollowupAt', 'createdAt'];

function reviveLead(l) {
  const out = { ...l };
  for (const f of LEAD_DATE_FIELDS) out[f] = l[f] ? new Date(l[f]) : null;
  return out;
}
function reviveCallLog(c) { return { ...c, at: new Date(c.at) }; }
function reviveTask(t) { return { ...t, due: new Date(t.due) }; }
function reviveNote(n) { return { ...n, at: new Date(n.at) }; }

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('localStorage write failed', e); }
}

// --- Demo seed (8 leads, used on first load so the UI isn't empty) ---
function demoLeads() {
  const seed = [
    { first: 'Jordan',   last: 'Chen',        biz: 'Apex HVAC Co.',            phone: '(512) 555-0142', niche: 'HVAC',        city: 'Austin, TX',       stage: 'followup',   attempts: 3, lc: -2,  fu: 0,  src: 'Apollo list' },
    { first: 'Casey',    last: 'Nguyen',      biz: 'Summit Roofing',            phone: '(214) 555-0187', niche: 'Roofing',     city: 'Dallas, TX',       stage: 'attempted',  attempts: 2, lc: -1,  fu: 1,  src: 'Cold list' },
    { first: 'Morgan',   last: 'Patel',       biz: 'Ironclad Med Spa',         phone: '(602) 555-0121', niche: 'Med Spa',     city: 'Phoenix, AZ',      stage: 'new',        attempts: 0, lc: null,fu: null,src: 'LinkedIn' },
    { first: 'Riley',    last: 'Rodriguez',   biz: 'Evergreen Auto Body',      phone: '(303) 555-0165', niche: 'Auto Body',   city: 'Denver, CO',       stage: 'contacted',  attempts: 1, lc: -3,  fu: 2,  src: 'Referral' },
    { first: 'Avery',    last: 'Okafor',      biz: 'Pinecrest Dental',         phone: '(813) 555-0199', niche: 'Dental',      city: 'Tampa, FL',        stage: 'interested', attempts: 4, lc: 0,   fu: 3,  src: 'Apollo list' },
    { first: 'Taylor',   last: 'Fisher',      biz: 'Blackwood Solar',          phone: '(305) 555-0178', niche: 'Solar',       city: 'Miami, FL',        stage: 'followup',   attempts: 2, lc: -4,  fu: 0,  src: 'Trade show' },
    { first: 'Parker',   last: 'Brennan',     biz: 'Ridgeline Landscape Co.',  phone: '(404) 555-0133', niche: 'Landscaping', city: 'Atlanta, GA',      stage: 'booked',     attempts: 5, lc: -6,  fu: 5,  src: 'Inbound web' },
    { first: 'Quinn',    last: 'Vasquez',     biz: 'Cornerstone Plumbing',     phone: '(704) 555-0152', niche: 'Plumbing',    city: 'Charlotte, NC',    stage: 'new',        attempts: 0, lc: null,fu: null,src: 'Google Maps scrape' },
  ];
  return seed.map((s, i) => ({
    id: i === 0 ? 'L-1000' : `L-${1001 + i - 1}`,
    fullName: `${s.first} ${s.last}`,
    initials: (s.first[0] + s.last[0]).toUpperCase(),
    business: s.biz,
    phone: s.phone,
    email: `${s.first.toLowerCase()}@${s.biz.toLowerCase().replace(/[^a-z]/g,'')}.com`,
    website: `${s.biz.toLowerCase().replace(/[^a-z]/g,'')}.com`,
    niche: s.niche,
    location: s.city,
    stage: s.stage,
    ownerId: 'u1',
    ownerName: 'Derek Moreno',
    ownerInitials: 'DM',
    source: s.src,
    lastCallAt: s.lc == null ? null : relativeDate(s.lc),
    nextFollowupAt: s.fu == null ? null : relativeDate(s.fu),
    callAttempts: s.attempts,
    createdAt: relativeDate(-14 - i),
  }));
}

function demoNotes() {
  return {
    'L-1000': [
      { id: 'n1', at: relativeDate(-2), by: 'DM', body: "Spoke with Jordan briefly. Interested but busy till Thursday. Wants a short demo call. Mentioned they just lost a tech, considering outsourcing dispatch." },
      { id: 'n2', at: relativeDate(-5), by: 'DM', body: "Left a voicemail. Mentioned we work with 3 HVAC shops in Austin already." },
      { id: 'n3', at: relativeDate(-14), by: 'AP', body: "Pulled from Apollo — $2-5M revenue range, 12 employees. Good fit profile." },
    ],
  };
}

function demoCallLogs(leads) {
  const out = [];
  const dispositions = ['Connected', 'No answer', 'Voicemail', 'Gatekeeper'];
  // seeded history for Jordan Chen (L-1000)
  out.push(
    { id: 'CL-1', leadId: 'L-1000', leadName: 'Jordan Chen', business: 'Apex HVAC Co.', phone: '(512) 555-0142', disposition: 'Connected', duration: '4:12', at: relativeDate(-2), by: 'DM', outcome: 'Asked to call back Thu' },
    { id: 'CL-2', leadId: 'L-1000', leadName: 'Jordan Chen', business: 'Apex HVAC Co.', phone: '(512) 555-0142', disposition: 'No answer', duration: '0:00', at: relativeDate(-5), by: 'DM', outcome: 'Left voicemail' },
    { id: 'CL-3', leadId: 'L-1000', leadName: 'Jordan Chen', business: 'Apex HVAC Co.', phone: '(512) 555-0142', disposition: 'No answer', duration: '0:00', at: relativeDate(-8), by: 'DM', outcome: '—' },
    { id: 'CL-4', leadId: 'L-1000', leadName: 'Jordan Chen', business: 'Apex HVAC Co.', phone: '(512) 555-0142', disposition: 'Gatekeeper', duration: '1:02', at: relativeDate(-11), by: 'DM', outcome: 'Owner not available' },
  );
  // a handful for other leads so the "Recent calls" card has content
  leads.slice(1, 5).forEach((l, i) => {
    const at = relativeDate(-i - 1);
    at.setHours(9 + i, 15 * i);
    const disp = dispositions[i % dispositions.length];
    out.push({
      id: `CL-${10 + i}`,
      leadId: l.id,
      leadName: l.fullName,
      business: l.business,
      phone: l.phone,
      disposition: disp,
      duration: disp === 'Connected' ? '3:21' : disp === 'Gatekeeper' ? '0:48' : '0:00',
      at,
      by: 'DM',
      outcome: disp === 'Connected' ? 'Scheduled demo' : '—',
    });
  });
  out.sort((a, b) => b.at - a.at);
  return out;
}

function demoTasks(leads) {
  const kinds = ['Call follow-up', 'Send email', 'Book demo', 'Send proposal', 'Check in'];
  const out = [];
  leads.forEach((l, i) => {
    if (l.nextFollowupAt) {
      const due = new Date(l.nextFollowupAt);
      due.setHours(9 + (i % 8), [0, 15, 30, 45][i % 4]);
      out.push({
        id: `T-${3000 + i}`,
        kind: kinds[i % kinds.length],
        leadId: l.id,
        leadName: l.fullName,
        business: l.business,
        phone: l.phone,
        due,
        done: false,
        owner: 'DM',
      });
    }
  });
  out.sort((a, b) => a.due - b.due);
  return out;
}

// --- Store ---
const store = {
  leads: [],
  callLogs: [],
  tasks: [],
  notes: {},
  messages: {},  // leadId -> [{id, direction: 'in'|'out', body, at, sid, status}]
  me: 'u1',

  load() {
    const rawLeads = loadJSON('skylar:leads', null);
    const rawCalls = loadJSON('skylar:call_logs', null);
    const rawTasks = loadJSON('skylar:tasks', null);
    const rawNotes = loadJSON('skylar:notes', null);
    const rawMsgs = loadJSON('skylar:messages', null);
    const me = localStorage.getItem('skylar:me');

    if (rawLeads && rawLeads.length) {
      this.leads.push(...rawLeads.map(reviveLead));
      this.callLogs.push(...(rawCalls || []).map(reviveCallLog));
      this.tasks.push(...(rawTasks || []).map(reviveTask));
      this.notes = rawNotes
        ? Object.fromEntries(Object.entries(rawNotes).map(([k, arr]) => [k, arr.map(reviveNote)]))
        : {};
      this.messages = rawMsgs
        ? Object.fromEntries(Object.entries(rawMsgs).map(([k, arr]) => [k, arr.map(reviveNote)]))
        : {};
    } else {
      // first-load seed
      const seed = demoLeads();
      this.leads.push(...seed);
      this.callLogs.push(...demoCallLogs(seed));
      this.tasks.push(...demoTasks(seed));
      this.notes = demoNotes();
      this.messages = {};
      this.save();
    }
    if (me) this.me = me;
    this.rebuildIndex();
  },

  save() {
    saveJSON('skylar:leads', this.leads);
    saveJSON('skylar:call_logs', this.callLogs);
    saveJSON('skylar:tasks', this.tasks);
    saveJSON('skylar:notes', this.notes);
    saveJSON('skylar:messages', this.messages);
  },

  dirty() {
    this.save();
    window.dispatchEvent(new Event('skylar-change'));
  },

  rebuildIndex() {
    for (const k of Object.keys(LEAD_OF)) delete LEAD_OF[k];
    for (const l of this.leads) LEAD_OF[l.id] = l;
  },

  currentRep() { return REP_OF[this.me] || REPS[0]; },

  addLead(lead) {
    const rep = this.currentRep();
    const full = {
      id: `L-${Date.now()}`,
      fullName: '',
      initials: '',
      business: '',
      phone: '',
      email: '',
      website: '',
      niche: '',
      location: '',
      stage: 'new',
      ownerId: rep.id,
      ownerName: rep.name,
      ownerInitials: rep.initials,
      source: 'Manual',
      lastCallAt: null,
      nextFollowupAt: null,
      callAttempts: 0,
      createdAt: new Date(),
      ...lead,
    };
    if (!full.initials && full.fullName) {
      const parts = full.fullName.trim().split(/\s+/);
      full.initials = ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
    }
    this.leads.unshift(full);
    this.rebuildIndex();
    this.dirty();
    return full;
  },

  updateLead(id, patch) {
    const l = this.leads.find(x => x.id === id);
    if (!l) return;
    Object.assign(l, patch);
    this.dirty();
  },

  deleteLead(id) {
    const idx = this.leads.findIndex(l => l.id === id);
    if (idx < 0) return;
    this.leads.splice(idx, 1);
    delete LEAD_OF[id];
    delete this.notes[id];
    delete this.messages[id];
    this.tasks = this.tasks.filter(t => t.leadId !== id);
    // keep call logs — just null out the leadId so history survives
    this.callLogs.forEach(c => { if (c.leadId === id) c.leadId = null; });
    this.dirty();
  },

  updateCallLog(id, patch) {
    const c = this.callLogs.find(x => x.id === id);
    if (!c) return;
    Object.assign(c, patch);
    this.dirty();
  },

  importLeads(rows) {
    const rep = this.currentRep();
    const now = Date.now();
    const mapped = rows.map((row, i) => {
      // Business-listing format (Google Maps / Apify) uses `title`.
      // Person-listing format uses `name` / `fullname` / `first`+`last`.
      const title = (row.title || '').trim();
      const business = (row.business || row.company || title).trim();
      const personName = (row.name || row.fullname || `${row.first || ''} ${row.last || ''}`).trim();
      const fullName = personName || business || 'Unknown';
      const parts = fullName.split(/\s+/).filter(Boolean);
      const initials = ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();

      // Niche: try structured fields first, then fall back to Apify's quirks.
      const niche = row.niche || row.industry || row['categories/0'] || row.categoryname || row.category || '';

      // Location: if we have street/state, join them; otherwise use city/location verbatim.
      const location = [row.street, row.city, row.state].filter(Boolean).join(', ')
                    || row.city || row.location || '';

      // Optional extras — preserve if present so the detail page can show them.
      const rating  = row.totalscore || row.rating ? Number(row.totalscore || row.rating) : null;
      const reviews = row.reviewscount || row.reviews ? Number(row.reviewscount || row.reviews) : null;
      const mapsUrl = row.url || row.mapsurl || '';

      return {
        id: `L-${now}-${i}`,
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
        ownerId: rep.id,
        ownerName: rep.name,
        ownerInitials: rep.initials,
        source: row.source || (title ? 'Google Maps' : 'Imported'),
        lastCallAt: null,
        nextFollowupAt: null,
        callAttempts: 0,
        createdAt: new Date(),
      };
    });
    this.leads.splice(0, this.leads.length, ...mapped);
    this.callLogs.length = 0;
    this.tasks.length = 0;
    this.notes = {};
    this.messages = {};
    this.rebuildIndex();
    this.dirty();
    return mapped.length;
  },

  addCallLog({ leadId, disposition, outcome, duration, note, snapshot, callSid }) {
    const lead = LEAD_OF[leadId];
    // snapshot is used for ad-hoc calls where leadId doesn't match a stored lead.
    const fallback = snapshot || {};
    const rep = this.currentRep();
    const entry = {
      id: `CL-${Date.now()}`,
      leadId: lead ? leadId : null,
      leadName: lead ? lead.fullName : (fallback.fullName || 'Unknown'),
      business: lead ? lead.business : (fallback.business || 'Ad-hoc'),
      phone:    lead ? lead.phone    : (fallback.phone    || ''),
      disposition,
      duration: duration || '0:00',
      at: new Date(),
      by: rep.initials,
      outcome: outcome || '—',
      callSid: callSid || null,
    };
    this.callLogs.unshift(entry);
    if (lead) {
      lead.lastCallAt = entry.at;
      lead.callAttempts = (lead.callAttempts || 0) + 1;
      if (note && note.trim()) {
        (this.notes[leadId] ||= []).unshift({
          id: `n-${Date.now()}`,
          at: new Date(),
          by: rep.initials,
          body: note.trim(),
        });
      }
    }
    this.dirty();
    return entry;
  },

  addNote(leadId, body) {
    if (!body || !body.trim()) return;
    const rep = this.currentRep();
    (this.notes[leadId] ||= []).unshift({
      id: `n-${Date.now()}`,
      at: new Date(),
      by: rep.initials,
      body: body.trim(),
    });
    this.dirty();
  },

  getNotes(leadId) { return this.notes[leadId] || []; },
  getCallHistory(leadId) { return this.callLogs.filter(c => c.leadId === leadId); },

  addMessage(leadId, msg) {
    const entry = {
      id: `M-${Date.now()}`,
      direction: 'out',
      body: '',
      at: new Date(),
      status: null,
      sid: null,
      ...msg,
    };
    (this.messages[leadId] ||= []).push(entry);
    this.dirty();
    return entry;
  },
  getMessages(leadId) { return this.messages[leadId] || []; },

  attachRecording(leadId, recording) {
    // Try (in order): callSid match, exact leadId match, then most recent log
    // without a recording yet (handles ad-hoc calls where leadId is null).
    let target = null;
    if (recording.callSid) target = this.callLogs.find(c => c.callSid === recording.callSid);
    if (!target && leadId)  target = this.callLogs.find(c => c.leadId === leadId);
    if (!target)            target = this.callLogs.find(c => !c.recordingSid);
    if (target && target.recordingSid !== recording.recordingSid) {
      target.recordingSid = recording.recordingSid;
      target.recordingUrl = `/api/recording-play?sid=${encodeURIComponent(recording.recordingSid)}`;
      if (recording.duration) target.duration = formatDurationSec(Number(recording.duration));
      this.dirty();
    }
  },

  clearAll() {
    this.leads.length = 0;
    this.callLogs.length = 0;
    this.tasks.length = 0;
    this.notes = {};
    this.messages = {};
    this.rebuildIndex();
    this.dirty();
  },

  toggleTask(id) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    this.dirty();
  },

  setTask(leadId, due, kind = 'Call follow-up') {
    const lead = LEAD_OF[leadId];
    if (!lead) return;
    // replace any existing follow-up for this lead with the new one
    const idx = this.tasks.findIndex(t => t.leadId === leadId && !t.done && t.kind === kind);
    const entry = {
      id: idx >= 0 ? this.tasks[idx].id : `T-${Date.now()}`,
      kind,
      leadId,
      leadName: lead.fullName,
      business: lead.business,
      phone: lead.phone,
      due,
      done: false,
      owner: this.currentRep().initials,
    };
    if (idx >= 0) this.tasks[idx] = entry;
    else this.tasks.push(entry);
    this.tasks.sort((a, b) => a.due - b.due);
    lead.nextFollowupAt = due;
    this.dirty();
  },

  clearFollowup(leadId) {
    this.tasks = this.tasks.filter(t => !(t.leadId === leadId && !t.done && t.kind === 'Call follow-up'));
    const lead = LEAD_OF[leadId];
    if (lead) lead.nextFollowupAt = null;
    this.dirty();
  },

  setMe(id) {
    if (!REP_OF[id]) return;
    this.me = id;
    localStorage.setItem('skylar:me', id);
    window.dispatchEvent(new Event('skylar-change'));
  },

  resetDemo() {
    this.leads.length = 0;
    this.callLogs.length = 0;
    this.tasks.length = 0;
    this.notes = {};
    const seed = demoLeads();
    this.leads.push(...seed);
    this.callLogs.push(...demoCallLogs(seed));
    this.tasks.push(...demoTasks(seed));
    this.notes = demoNotes();
    this.rebuildIndex();
    this.dirty();
  },
};

// --- CSV/TSV parser ---
// Auto-detects delimiter: if the header row has tabs and no commas, uses tabs.
// Handles quoted fields with embedded delimiters and doubled "" escapes.
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

// --- Globals bound to the store's live arrays ---
const LEADS = store.leads;
const CALL_LOGS = store.callLogs;
const TASKS = store.tasks;
const LEAD_OF = {};
const STAGE_OF = Object.fromEntries(STAGES.map(s => [s.id, s]));

store.load();

// Hero lead accessors (used by lead-detail variants)
const CALL_HISTORY_HERO = store.getCallHistory('L-1000');
const NOTES_HERO = store.getNotes('L-1000');

Object.assign(window, {
  STAGES, REPS, REP_OF, NICHES, SOURCES,
  LEADS, LEAD_OF, STAGE_OF, CALL_LOGS, TASKS,
  CALL_HISTORY_HERO, NOTES_HERO,
  formatDate, formatDateTime, formatTime, relativeString, relativeDate, formatDurationSec,
  parseCSV, parseDelimited, safeUrl, displayUrl,
  store,
});
