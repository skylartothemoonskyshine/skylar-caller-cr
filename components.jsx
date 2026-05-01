// Icon set — lucide-style 16px line icons
const Icon = ({ name, size = 16, stroke = 1.6, style, ...rest }) => {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9.5Z"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6"/><circle cx="17" cy="8" r="2.8"/><path d="M21 20c0-2.6-1.6-5-4-5.6"/></>,
    columns: <><rect x="3" y="4" width="5.5" height="16" rx="1.2"/><rect x="10" y="4" width="5.5" height="10" rx="1.2"/><rect x="17" y="4" width="4" height="13" rx="1.2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    check_square: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></>,
    phone: <><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z"/></>,
    phone_call: <><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z"/><path d="M15 5a4 4 0 0 1 4 4M15 2a7 7 0 0 1 7 7"/></>,
    phone_off: <><path d="M10.6 13.4a11 11 0 0 0 3 2.1L16 13l5 2v3a2 2 0 0 1-2 2c-3.5 0-6.7-1-9.4-2.8"/><path d="m2 2 20 20"/><path d="M6 3h3l2 5-2.5 1.5"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></>,
    map_pin: <><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/></>,
    filter: <><path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z"/></>,
    chevron_down: <><path d="m6 9 6 6 6-6"/></>,
    chevron_right: <><path d="m9 6 6 6-6 6"/></>,
    arrow_right: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    more: <><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></>,
    more_v: <><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    message: <><path d="M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9Z"/></>,
    note: <><path d="M4 4h12l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M16 4v4h4"/><path d="M7 12h9M7 16h6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
    external: <><path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></>,
    close: <><path d="M18 6 6 18M6 6l12 12"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    trending: <><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    mic_off: <><path d="M9 9v4a3 3 0 0 0 5.1 2.1"/><path d="M15 11V6a3 3 0 0 0-5.7-1.3"/><path d="M19 11a7 7 0 0 1-.6 2.8M12 18v3"/><path d="m2 2 20 20"/></>,
    grip: <><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></>,
    bell: <><path d="M6 10a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
    flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a4 4 0 0 0 4-4c0-3-3-4-2-7-4 1-7 4-7 8a5 5 0 0 0 5 5 5 5 0 0 0 5-5c0-3-2-5-4-6"/></>,
    sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></>,
    check: <><path d="m5 12 5 5 9-11"/></>,
    calendar_check: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/></>,
    square: <><rect x="3" y="3" width="18" height="18" rx="3"/></>,
    moon: <><path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    zap: <><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
    upload: <><path d="M12 3v12M6 9l6-6 6 6M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></>,
    swap: <><path d="M7 3v14M3 7l4-4 4 4M17 21V7M21 17l-4 4-4-4"/></>,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} {...rest}>
      {paths[name]}
    </svg>
  );
};

// Sidebar
const Sidebar = ({ current, onNav, counts = {}, me, viewingAs, onSignOut, onSetViewingAs }) => {
  const realRep = REP_OF[me] || REPS[0] || { initials: '?', name: '', role: 'caller' };
  const isOwner = realRep.role === 'owner';
  const viewedRep = viewingAs ? REP_OF[viewingAs] : null;
  const workers = REPS.filter(r => r.id !== me && r.role !== 'owner');
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', kbd: 'G D' },
    { id: 'phone', label: 'Phone', icon: 'phone_call', kbd: 'G F' },
    { id: 'leads', label: 'Leads', icon: 'users', count: counts.leads, kbd: 'G L' },
    { id: 'pipeline', label: 'Pipeline', icon: 'columns', kbd: 'G P' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', kbd: 'G C' },
    { id: 'tasks', label: 'Tasks', icon: 'check_square', count: counts.tasks, kbd: 'G T' },
    { id: 'calls', label: 'Call logs', icon: 'history', kbd: 'G H' },
  ];
  const quickToday = [
    { id: 'today-due', label: 'Due today', count: counts.dueToday, dot: 'var(--amber)' },
    { id: 'today-new', label: 'New leads', count: counts.newLeads, dot: 'var(--accent)' },
    { id: 'today-followups', label: 'Follow-ups', count: counts.followups, dot: 'var(--violet)' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div className="vstack">
          <div className="brand-name">Skylar</div>
          <div className="brand-sub">Caller CRM</div>
        </div>
      </div>

      <div className="nav-section">
        {items.map(it => (
          <button key={it.id} className={'nav-item ' + (current === it.id ? 'active' : '')} onClick={() => onNav(it.id)}>
            <Icon name={it.icon} className="icon" />
            <span>{it.label}</span>
            {it.count != null && <span className="count">{it.count}</span>}
            {it.count == null && <span className="kbd">{it.kbd}</span>}
          </button>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Today</div>
        {quickToday.map(it => (
          <button key={it.id} className="nav-item" onClick={() => onNav('tasks')}>
            <span className="icon" style={{width:16,display:'grid',placeItems:'center'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:it.dot}}/>
            </span>
            <span>{it.label}</span>
            <span className="count">{it.count}</span>
          </button>
        ))}
      </div>

      {isOwner && !viewingAs && workers.length > 0 && (
        <div className="nav-section">
          <div className="nav-label">View as</div>
          {workers.map(w => (
            <button key={w.id} className="nav-item" onClick={() => onSetViewingAs(w.id)} title={`Step into ${w.name}'s view`}>
              <div className="avatar" style={{width:18,height:18,fontSize:9}}>{w.initials}</div>
              <span className="ellipsis">{w.name}</span>
              <Icon name="arrow_right" size={12} style={{color:'var(--text-subtle)'}}/>
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <div className="hstack gap-3" style={{flex:1,minWidth:0}}>
          <div className="avatar">{(viewedRep || realRep).initials}</div>
          <div className="vstack" style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:500}} className="ellipsis">{(viewedRep || realRep).name}</div>
            <div style={{fontSize:11}} className="subtle ellipsis">
              {viewedRep ? `signed in as ${realRep.name}` : realRep.role}
            </div>
          </div>
        </div>
        <button className="iconbtn" onClick={onSignOut} title="Sign out">
          <Icon name="phone_off" size={15}/>
        </button>
        <button className="iconbtn" onClick={() => onNav('settings')} title="Settings">
          <Icon name="settings" size={15}/>
        </button>
      </div>
    </aside>
  );
};

// Owner-only banner shown while an owner is "viewing as" a worker.
const ViewingAsBanner = ({ rep, onReturn }) => {
  if (!rep) return null;
  return (
    <div className="hstack gap-3" style={{
      padding:'8px 18px',
      background:'var(--accent-soft)',
      borderBottom:'1px solid var(--border)',
      fontSize:12.5,
      color:'var(--accent)',
    }}>
      <Icon name="user" size={13}/>
      <span style={{flex:1}}>Viewing as <b>{rep.name}</b> — actions you take are still recorded as admin.</span>
      <button className="btn btn-sm" onClick={onReturn}>
        <Icon name="arrow_right" size={11} style={{transform:'rotate(180deg)'}}/>
        Return to admin
      </button>
    </div>
  );
};

// Topbar
const TopBar = ({ crumb, actions, onSearch, onNewLead, onImportDone }) => {
  return (
    <div className="topbar">
      <div className="hstack gap-2">
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevron_right" size={13} className="topbar-sep" style={{color:'var(--text-subtle)'}}/>}
            <span className={i === crumb.length - 1 ? 'topbar-title' : 'topbar-crumb'}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="topbar-actions">
        <div className="search-input">
          <Icon name="search" size={14} style={{color:'var(--text-subtle)'}}/>
          <input placeholder="Search leads, calls, notes…" onChange={e => onSearch && onSearch(e.target.value)}/>
          <span className="kbd">/</span>
        </div>
        {actions}
        {onImportDone && <ImportLeads onDone={onImportDone}/>}
        <button className="btn btn-primary" onClick={onNewLead}>
          <Icon name="plus" size={14}/>
          New lead
          <span className="kbd">N</span>
        </button>
      </div>
    </div>
  );
};

// Stage pill
const StagePill = ({ stageId }) => {
  const s = STAGE_OF[stageId];
  if (!s) return null;
  return (
    <span className={'stage ' + s.className}>
      <span className="stage-name">{s.label}</span>
    </span>
  );
};

// Avatar
const Avatar = ({ initials, size = 24, title }) => (
  <div className="avatar" title={title} style={{width:size,height:size,fontSize:size*0.42}}>
    {initials}
  </div>
);

// Toast
const Toast = ({ message, onClose }) => {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <div className="toast">
      <Icon name="check" size={14} style={{color:'var(--green)'}}/>
      {message}
    </div>
  );
};

// Lead form modal — handles both New and Edit. Pass `lead` to switch to edit mode.
const LeadFormModal = ({ lead = null, onClose, onCreated, onUpdated }) => {
  const isEdit = !!lead;
  const canAssign = store.isOwner(); // only admin picks; workers auto-own what they create
  const defaultOwner = lead?.ownerId || store.effectiveMe();
  const [form, setForm] = React.useState(() => ({
    fullName: lead?.fullName || '',
    business: lead?.business || '',
    phone:    lead?.phone    || '',
    email:    lead?.email    || '',
    website:  lead?.website  || '',
    niche:    lead?.niche    || '',
    location: lead?.location || '',
    source:   lead?.source   || 'Manual',
    stage:    lead?.stage    || 'new',
    ownerId:  defaultOwner,
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSubmit = form.fullName.trim() && form.phone.trim();
  const firstRef = React.useRef(null);
  React.useEffect(() => { firstRef.current?.focus(); }, []);

  const submit = () => {
    if (!canSubmit) return;
    const ownerRep = REP_OF[form.ownerId];
    const withOwner = {
      ...form,
      ownerId: form.ownerId,
      ownerName: ownerRep?.name || '',
      ownerInitials: ownerRep?.initials || '',
    };
    if (isEdit) {
      store.updateLead(lead.id, withOwner);
      onUpdated && onUpdated(lead.id);
    } else {
      const created = store.addLead(withOwner);
      onCreated && onCreated(created);
    }
    onClose();
  };

  // niche list: seed NICHES plus whatever the lead already has (for imported non-standard niches)
  const nicheOptions = [...new Set([form.niche, ...NICHES].filter(Boolean))];

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{width:620}}>
        <div className="modal-header">
          <div>
            <div style={{fontWeight:600,fontSize:14}}>{isEdit ? `Edit lead — ${lead.fullName}` : 'New lead'}</div>
            <div className="subtle" style={{fontSize:12,marginTop:2}}>
              {isEdit ? 'Update any field and save' : 'Add a single lead by hand'}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="modal-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="tweak-row">
              <div className="tweak-label">Full name *</div>
              <input ref={firstRef} className="input" placeholder="Jordan Chen" value={form.fullName} onChange={e => set('fullName', e.target.value)}/>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Phone *</div>
              <input className="input" placeholder="(512) 555-0142" value={form.phone} onChange={e => set('phone', e.target.value)}/>
            </div>
            <div className="tweak-row" style={{gridColumn:'1 / -1'}}>
              <div className="tweak-label">Business</div>
              <input className="input" placeholder="Apex HVAC Co." value={form.business} onChange={e => set('business', e.target.value)}/>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Email</div>
              <input className="input" placeholder="jordan@apexhvac.com" value={form.email} onChange={e => set('email', e.target.value)}/>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Website</div>
              <input className="input" placeholder="apexhvac.com" value={form.website} onChange={e => set('website', e.target.value)}/>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Niche / category</div>
              <input className="input" list="niche-list" placeholder="HVAC" value={form.niche} onChange={e => set('niche', e.target.value)}/>
              <datalist id="niche-list">
                {nicheOptions.map(n => <option key={n} value={n}/>)}
              </datalist>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Location</div>
              <input className="input" placeholder="Austin, TX" value={form.location} onChange={e => set('location', e.target.value)}/>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Source</div>
              <input className="input" list="source-list" value={form.source} onChange={e => set('source', e.target.value)}/>
              <datalist id="source-list">
                {SOURCES.map(s => <option key={s} value={s}/>)}
                <option value="Manual"/>
              </datalist>
            </div>
            {isEdit && (
              <div className="tweak-row">
                <div className="tweak-label">Stage</div>
                <select className="input" value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            )}
            {canAssign && (
              <div className="tweak-row" style={{gridColumn: isEdit ? 'auto' : '1 / -1'}}>
                <div className="tweak-label">Assign to</div>
                <select className="input" value={form.ownerId || ''} onChange={e => set('ownerId', e.target.value)}>
                  {REPS.map(r => <option key={r.id} value={r.id}>{r.name}{r.role === 'owner' ? ' (you)' : ''}</option>)}
                </select>
              </div>
            )}
          </div>

          {isEdit && (lead.rating != null || lead.reviews != null || lead.mapsUrl) && (
            <div style={{marginTop:16,padding:12,background:'var(--surface-2)',borderRadius:6,fontSize:12,lineHeight:1.5}}>
              <div className="subtle" style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500,marginBottom:6}}>Imported metadata</div>
              {lead.rating != null && <div>⭐ {lead.rating} · {lead.reviews ?? 0} reviews</div>}
              {lead.mapsUrl && <div className="ellipsis"><a href={safeUrl(lead.mapsUrl)} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>View on Google Maps ↗</a></div>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit} style={{opacity: canSubmit ? 1 : 0.5}}>
            {isEdit ? 'Save changes' : 'Create lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Backward-compat alias
const NewLeadModal = LeadFormModal;

// Import CSV (hidden file input triggered by a ref)
const ImportLeads = ({ onDone }) => {
  const ref = React.useRef(null);
  const [pending, setPending] = React.useState(null); // { rows, fileName }
  const [ownerId, setOwnerId] = React.useState(store.me || '');
  const [section, setSection] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const existingSections = [...new Set((store.leads || []).map(l => l.section).filter(Boolean))].sort();

  const open = () => ref.current?.click();
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rows = parseCSV(text);
      setPending({ rows, fileName: file.name });
      setOwnerId(store.me || REPS[0]?.id || '');
      setSection('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    const count = await store.importLeads(pending.rows, { ownerId, section });
    setBusy(false);
    setPending(null);
    onDone && onDone(count);
  };

  return (
    <>
      <input ref={ref} type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={onFile}/>
      <button className="btn" onClick={open}><Icon name="upload" size={13}/> Import</button>
      {pending && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !busy && setPending(null)}>
          <div className="modal" style={{width:460}}>
            <div className="modal-header">
              <div>
                <div style={{fontWeight:600,fontSize:14}}>Import leads</div>
                <div className="subtle" style={{fontSize:12,marginTop:2}}>{pending.rows.length} rows from <span className="mono">{pending.fileName}</span></div>
              </div>
              <button className="iconbtn" onClick={() => !busy && setPending(null)}><Icon name="close" size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="tweak-row">
                <div className="tweak-label">Assign to</div>
                <div className="vstack gap-1">
                  {REPS.map(r => (
                    <label key={r.id} className="hstack gap-2" style={{
                      padding:'8px 10px',border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',
                      background: ownerId === r.id ? 'var(--surface-2)' : 'var(--surface)',
                      borderColor: ownerId === r.id ? 'var(--text)' : 'var(--border)'
                    }}>
                      <input type="radio" name="import-owner" checked={ownerId === r.id} onChange={() => setOwnerId(r.id)} style={{margin:0}}/>
                      <Avatar initials={r.initials} size={22}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:500,fontSize:13}}>{r.name}{r.id === store.me ? ' (you)' : ''}</div>
                        <div className="subtle" style={{fontSize:11.5,textTransform:'capitalize'}}>{r.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="tweak-row" style={{marginTop:14}}>
                <div className="tweak-label">Section</div>
                <input
                  className="input"
                  list="import-section-list"
                  placeholder="e.g. Miami Cleaning, HVAC Texas"
                  value={section}
                  onChange={e => setSection(e.target.value)}
                />
                <datalist id="import-section-list">
                  {existingSections.map(s => <option key={s} value={s}/>)}
                </datalist>
                <div className="subtle" style={{fontSize:11.5,marginTop:6}}>
                  Pick an existing section or type a new one. Used to keep this list separate in Leads + Pipeline.
                </div>
              </div>
              <div className="subtle" style={{fontSize:11.5,marginTop:10}}>
                All {pending.rows.length} leads will be assigned to the selected rep. They won't mix with other reps' leads.
              </div>
            </div>
            <div className="modal-footer hstack gap-2" style={{justifyContent:'flex-end'}}>
              <button className="btn" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={confirm} disabled={busy || !ownerId || !section.trim()}>
                {busy ? 'Importing…' : `Import ${pending.rows.length} leads`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Actions menu (dropdown) used on leads rows + lead detail header
const ActionsMenu = ({ actions, align = 'right', iconSize = 14, label }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} style={{position:'relative',display:'inline-block'}}>
      <button className={label ? 'btn' : 'iconbtn'} onClick={e => { e.stopPropagation(); setOpen(o => !o); }} title="More actions">
        {label ? <><Icon name="more" size={iconSize}/>{label}</> : <Icon name="more" size={iconSize}/>}
      </button>
      {open && (
        <div style={{
          position:'absolute',
          [align]: 0,
          top:'calc(100% + 4px)',
          minWidth:170,
          background:'var(--surface)',
          border:'1px solid var(--border)',
          borderRadius:8,
          boxShadow:'var(--shadow-lg)',
          zIndex:60,
          padding:4,
        }} onClick={e => e.stopPropagation()}>
          {actions.filter(Boolean).map((a, i) => a === 'divider'
            ? <div key={`d${i}`} style={{height:1,background:'var(--border)',margin:'4px 2px'}}/>
            : (
              <button key={a.label}
                className="nav-item"
                style={{padding:'7px 10px',fontSize:12.5,color: a.danger ? 'var(--red)' : undefined}}
                onClick={() => { setOpen(false); a.onClick?.(); }}>
                {a.icon && <Icon name={a.icon} className="icon" size={13}/>}
                <span>{a.label}</span>
                {a.hint && <span className="kbd">{a.hint}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Icon, Sidebar, ViewingAsBanner, TopBar, StagePill, Avatar, Toast, NewLeadModal, LeadFormModal, ImportLeads, ActionsMenu });
