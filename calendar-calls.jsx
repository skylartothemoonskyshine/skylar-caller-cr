// Calendar + Tasks + Call logs pages

const CalendarTasks = ({ onOpenLead, initialTab = 'calendar' }) => {
  const [tab, setTab] = React.useState(initialTab);
  React.useEffect(() => { setTab(initialTab); }, [initialTab]);
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-title">Schedule</div>
          <div className="page-header-sub">Follow-ups, calls, and meetings</div>
        </div>
        <div className="hstack gap-2">
          <div className="seg">
            <button className={tab==='calendar'?'active':''} onClick={()=>setTab('calendar')}><Icon name="calendar" size={12}/> Calendar</button>
            <button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}><Icon name="check_square" size={12}/> Tasks</button>
          </div>
        </div>
      </div>

      {tab === 'calendar' ? <CalendarView onOpenLead={onOpenLead}/> : <TasksView onOpenLead={onOpenLead}/>}
    </div>
  );
};

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const startOfWeekOf = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; };
const startOfMonthGrid = (d) => { const first = new Date(d.getFullYear(), d.getMonth(), 1); return startOfWeekOf(first); };

const CalendarView = ({ onOpenLead }) => {
  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()));
  const [view, setView] = React.useState('week'); // 'day' | 'week' | 'month'
  const [showNew, setShowNew] = React.useState(false);
  const [newSlot, setNewSlot] = React.useState(null);

  const openNew = (slot = null) => { setNewSlot(slot); setShowNew(true); };

  const shift = (dir) => {
    const d = new Date(anchor);
    if (view === 'day')   d.setDate(d.getDate() + dir);
    if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    setAnchor(startOfDay(d));
  };
  const goToday = () => setAnchor(startOfDay(new Date()));

  const rangeLabel = (() => {
    if (view === 'day') return anchor.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    if (view === 'month') return anchor.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const s = startOfWeekOf(anchor);
    const e = new Date(s); e.setDate(e.getDate()+6);
    return `${s.toLocaleDateString('en-US',{month:'long',day:'numeric'})} – ${e.toLocaleDateString('en-US',{month:'long',day:'numeric'})}`;
  })();

  return (
    <div className="card" style={{overflow:'hidden'}}>
      <div className="hstack gap-3" style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
        <button className="btn btn-sm" onClick={() => shift(-1)} title="Previous"><Icon name="chevron_right" size={12} style={{transform:'rotate(180deg)'}}/></button>
        <div style={{fontWeight:600,fontSize:14,minWidth:220}}>{rangeLabel}</div>
        <button className="btn btn-sm" onClick={() => shift(1)} title="Next"><Icon name="chevron_right" size={12}/></button>
        <button className="btn btn-sm" onClick={goToday}>Today</button>
        <button className="btn btn-primary btn-sm" onClick={() => openNew()}><Icon name="plus" size={12}/> New event</button>
        <div style={{marginLeft:'auto'}} className="seg">
          <button className={view==='day'?'active':''}   onClick={() => setView('day')}>Day</button>
          <button className={view==='week'?'active':''}  onClick={() => setView('week')}>Week</button>
          <button className={view==='month'?'active':''} onClick={() => setView('month')}>Month</button>
        </div>
      </div>
      {view === 'month'
        ? <MonthGrid anchor={anchor} onOpenLead={onOpenLead} onPickSlot={openNew} onJumpDay={(d) => { setAnchor(startOfDay(d)); setView('day'); }}/>
        : <TimeGrid days={view === 'day' ? [anchor] : (() => { const s = startOfWeekOf(anchor); return Array.from({length:7},(_,i)=>{ const x=new Date(s); x.setDate(x.getDate()+i); return x; }); })()} onOpenLead={onOpenLead} onPickSlot={openNew}/>}
      {showNew && <NewEventModal defaultDue={newSlot} onClose={() => setShowNew(false)}/>}
    </div>
  );
};

const TimeGrid = ({ days, onOpenLead, onPickSlot }) => {
  const hours = Array.from({length: 10}, (_, i) => 8 + i); // 8am - 5pm
  const cols = `56px repeat(${days.length}, 1fr)`;
  return (
    <div style={{display:'grid',gridTemplateColumns:cols}}>
      <div></div>
      {days.map((d,i) => {
        const isT = isToday(d);
        return (
          <div key={i} style={{padding:'10px 8px',borderLeft:'1px solid var(--border)',borderBottom:'1px solid var(--border)',textAlign:'center'}}>
            <div className="subtle" style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em'}}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
            <div style={{fontSize:18,fontWeight:600,color: isT ? 'var(--accent)' : 'var(--text)',marginTop:2}}>{d.getDate()}</div>
          </div>
        );
      })}
      {hours.map(h => (
        <React.Fragment key={h}>
          <div className="subtle mono" style={{fontSize:11,padding:'0 8px',textAlign:'right',position:'relative',top:-6,height:56}}>
            {h > 12 ? h-12 : h}{h < 12 ? 'a' : 'p'}
          </div>
          {days.map((d,i) => {
            const tasksHere = TASKS.filter(t => !t.done && t.due.toDateString() === d.toDateString() && t.due.getHours() === h);
            const isT = isToday(d);
            const slotDate = new Date(d); slotDate.setHours(h, 0, 0, 0);
            return (
              <div key={i}
                   onClick={(e) => { if (e.target === e.currentTarget) onPickSlot(slotDate); }}
                   style={{borderLeft:'1px solid var(--border)',borderBottom:'1px solid var(--border)',height:56,position:'relative',padding:3,background: isT ? 'var(--accent-soft)' : 'transparent',opacity: isT ? 0.6 : 1,cursor:'pointer'}}>
                {tasksHere.map(t => (
                  <div key={t.id} onClick={(e) => { e.stopPropagation(); if (t.leadId) onOpenLead(t.leadId); }} style={{
                    background:'var(--surface)',
                    border:'1px solid var(--border)',
                    borderLeft:`3px solid ${t.leadId ? 'var(--accent)' : 'var(--violet)'}`,
                    borderRadius:4,
                    padding:'3px 6px',
                    fontSize:11,
                    cursor: t.leadId ? 'pointer' : 'default',
                    marginBottom:2,
                    lineHeight:1.3,
                    overflow:'hidden'
                  }}>
                    <div style={{fontWeight:500}} className="ellipsis">{t.kind}</div>
                    {t.leadName && <div className="subtle ellipsis" style={{fontSize:10}}>{t.leadName}</div>}
                  </div>
                ))}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

const MonthGrid = ({ anchor, onOpenLead, onPickSlot, onJumpDay }) => {
  const gridStart = startOfMonthGrid(anchor);
  const cells = Array.from({length:42}, (_, i) => { const d = new Date(gridStart); d.setDate(d.getDate()+i); return d; });
  const month = anchor.getMonth();
  const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',borderBottom:'1px solid var(--border)'}}>
        {weekdayNames.map(n => (
          <div key={n} className="subtle" style={{padding:'8px 10px',fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'center',borderLeft:'1px solid var(--border)'}}>{n}</div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gridAutoRows:'minmax(96px, 1fr)'}}>
        {cells.map((d, i) => {
          const isT = isToday(d);
          const inMonth = d.getMonth() === month;
          const tasksHere = TASKS.filter(t => !t.done && t.due.toDateString() === d.toDateString()).sort((a,b) => a.due - b.due);
          return (
            <div key={i}
                 onClick={(e) => { if (e.target === e.currentTarget) { const slot = new Date(d); slot.setHours(9,0,0,0); onPickSlot(slot); } }}
                 style={{borderLeft:'1px solid var(--border)',borderBottom:'1px solid var(--border)',minHeight:96,padding:6,background: isT ? 'var(--accent-soft)' : 'transparent',opacity: inMonth ? 1 : 0.45,cursor:'pointer'}}>
              <div className="hstack" style={{justifyContent:'space-between',marginBottom:4}}>
                <button onClick={(e) => { e.stopPropagation(); onJumpDay(d); }} style={{background:'transparent',border:'none',padding:0,fontSize:12,fontWeight:600,color: isT ? 'var(--accent)' : 'var(--text)',cursor:'pointer'}}>{d.getDate()}</button>
              </div>
              {tasksHere.slice(0,3).map(t => (
                <div key={t.id} onClick={(e) => { e.stopPropagation(); if (t.leadId) onOpenLead(t.leadId); }} style={{
                  background:'var(--surface)',
                  border:'1px solid var(--border)',
                  borderLeft:`3px solid ${t.leadId ? 'var(--accent)' : 'var(--violet)'}`,
                  borderRadius:4,
                  padding:'2px 6px',
                  fontSize:10.5,
                  cursor: t.leadId ? 'pointer' : 'default',
                  marginBottom:2,
                  lineHeight:1.25,
                  overflow:'hidden',
                  whiteSpace:'nowrap',
                  textOverflow:'ellipsis',
                }} title={`${formatTime(t.due)} · ${t.kind}${t.leadName ? ' · ' + t.leadName : ''}`}>
                  <span className="mono subtle" style={{fontSize:10}}>{formatTime(t.due)}</span> {t.kind}
                </div>
              ))}
              {tasksHere.length > 3 && <div className="subtle" style={{fontSize:10.5,paddingLeft:2}}>+{tasksHere.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NewEventModal = ({ defaultDue, onClose }) => {
  const [mode, setMode] = React.useState('manual'); // 'manual' | 'lead'
  const [title, setTitle] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [pickedLead, setPickedLead] = React.useState(null);
  const [kind, setKind] = React.useState('Call follow-up');
  const initial = defaultDue || (() => { const d = new Date(); d.setHours(d.getHours()+1,0,0,0); return d; })();
  const pad = (n) => String(n).padStart(2,'0');
  const [date, setDate] = React.useState(`${initial.getFullYear()}-${pad(initial.getMonth()+1)}-${pad(initial.getDate())}`);
  const [time, setTime] = React.useState(`${pad(initial.getHours())}:${pad(initial.getMinutes())}`);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LEADS.slice(0, 6);
    return LEADS.filter(l =>
      (l.fullName||'').toLowerCase().includes(q) ||
      (l.business||'').toLowerCase().includes(q) ||
      (l.phone||'').includes(q)
    ).slice(0, 6);
  }, [query]);

  const canSave = mode === 'manual' ? title.trim().length > 0 : !!pickedLead;

  const save = () => {
    const [y,m,d] = date.split('-').map(Number);
    const [hh,mm] = time.split(':').map(Number);
    const due = new Date(y, m-1, d, hh, mm, 0, 0);
    if (mode === 'manual') {
      store.addEvent({ title: title.trim(), due });
    } else {
      store.addEvent({ title: kind, due, leadId: pickedLead.id });
    }
    onClose();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSave) { e.preventDefault(); save(); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={onKey}>
      <div className="modal" style={{width:520}}>
        <div className="modal-header">
          <div style={{fontWeight:600,fontSize:14}}>New event</div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="seg" style={{marginBottom:16}}>
            <button className={mode==='manual'?'active':''} onClick={()=>setMode('manual')}>Manual</button>
            <button className={mode==='lead'?'active':''} onClick={()=>setMode('lead')}>From lead</button>
          </div>

          {mode === 'manual' ? (
            <div className="tweak-row" style={{marginBottom:14}}>
              <div className="tweak-label">Title</div>
              <input className="input" autoFocus placeholder="e.g. Demo with Acme, Team standup"
                value={title} onChange={e => setTitle(e.target.value)}/>
            </div>
          ) : (
            <>
              <div className="tweak-row" style={{marginBottom:14}}>
                <div className="tweak-label">Lead</div>
                {pickedLead ? (
                  <div className="hstack gap-2" style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface-2)'}}>
                    <Avatar initials={pickedLead.initials} size={22}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500,fontSize:13}} className="ellipsis">{pickedLead.fullName}</div>
                      <div className="subtle ellipsis" style={{fontSize:11.5}}>{pickedLead.business}</div>
                    </div>
                    <button className="btn btn-sm" onClick={() => setPickedLead(null)}>Change</button>
                  </div>
                ) : (
                  <>
                    <input className="input" autoFocus placeholder="Search leads by name, business, phone…"
                      value={query} onChange={e => setQuery(e.target.value)}/>
                    <div style={{border:'1px solid var(--border)',borderRadius:6,marginTop:6,maxHeight:180,overflow:'auto'}}>
                      {results.length === 0 && <div className="subtle" style={{padding:12,fontSize:12,textAlign:'center'}}>No leads match.</div>}
                      {results.map(l => (
                        <button key={l.id} onClick={() => setPickedLead(l)} className="hstack gap-2"
                          style={{width:'100%',padding:'8px 10px',border:'none',background:'transparent',textAlign:'left',borderBottom:'1px solid var(--border)',cursor:'pointer'}}>
                          <Avatar initials={l.initials} size={20}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:500,fontSize:12.5}} className="ellipsis">{l.fullName}</div>
                            <div className="subtle ellipsis" style={{fontSize:11}}>{l.business} · <span className="mono">{l.phone}</span></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="tweak-row" style={{marginBottom:14}}>
                <div className="tweak-label">Kind</div>
                <select className="input" value={kind} onChange={e => setKind(e.target.value)}>
                  <option>Call follow-up</option>
                  <option>Meeting</option>
                  <option>Demo</option>
                  <option>Check-in</option>
                  <option>Email</option>
                </select>
              </div>
            </>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div className="tweak-row">
              <div className="tweak-label">Date</div>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)}/>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Time</div>
              <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)}/>
            </div>
          </div>
        </div>
        <div className="modal-footer hstack gap-2" style={{justifyContent:'flex-end'}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} style={{opacity: canSave ? 1 : 0.5}} onClick={save}>
            Add event <span className="kbd">⌘⏎</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TasksView = ({ onOpenLead }) => {
  const now = new Date();
  const overdue = TASKS.filter(t => !t.done && t.due < now && !isToday(t.due));
  const todayTasks = TASKS.filter(t => !t.done && isToday(t.due));
  const upcoming = TASKS.filter(t => !t.done && t.due > now && !isToday(t.due));
  const completed = TASKS.filter(t => t.done);
  const [showNew, setShowNew] = React.useState(false);

  return (
    <div>
      <div className="hstack" style={{justifyContent:'space-between',marginBottom:12}}>
        <div className="subtle" style={{fontSize:12}}>
          {overdue.length + todayTasks.length + upcoming.length} open · {completed.length} done
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Icon name="plus" size={12}/> New task</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <TaskGroup title="Overdue" count={overdue.length} tasks={overdue} onOpenLead={onOpenLead} tone="var(--red)"/>
        <TaskGroup title="Today" count={todayTasks.length} tasks={todayTasks} onOpenLead={onOpenLead} tone="var(--amber)"/>
        <TaskGroup title="Upcoming" count={upcoming.length} tasks={upcoming} onOpenLead={onOpenLead} tone="var(--text-muted)"/>
        <TaskGroup title="Completed" count={completed.length} tasks={completed} onOpenLead={onOpenLead} tone="var(--green)"/>
      </div>
      {showNew && <NewEventModal onClose={() => setShowNew(false)}/>}
    </div>
  );
};

const TaskGroup = ({ title, count, tasks, onOpenLead, tone }) => {
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? tasks : tasks.slice(0, 8);
  return (
  <div className="card">
    <div className="card-header">
      <div className="hstack gap-2">
        <span style={{width:8,height:8,borderRadius:'50%',background:tone}}/>
        <h3>{title}</h3>
        <span className="subtle mono tabular" style={{fontSize:12}}>{count}</span>
      </div>
    </div>
    <div>
      {shown.map((t, i) => (
        <div key={t.id} className="hstack gap-3" style={{padding:'10px 16px',borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--border)',cursor: t.leadId ? 'pointer' : 'default'}} onClick={() => t.leadId && onOpenLead(t.leadId)}>
          <button style={{width:16,height:16,border:'1.5px solid var(--border-strong)',borderRadius:4,background: t.done ? 'var(--accent)' : 'transparent',display:'grid',placeItems:'center',flexShrink:0,padding:0}}
                  onClick={e => { e.stopPropagation(); store.toggleTask(t.id); }}>
            {t.done && <Icon name="check" size={10} style={{color:'white'}}/>}
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,textDecoration: t.done ? 'line-through' : 'none',color: t.done ? 'var(--text-subtle)' : 'var(--text)'}} className="ellipsis">
              {t.kind}{t.leadName ? ` · ${t.leadName}` : ''}
            </div>
            {t.business && <div className="subtle ellipsis" style={{fontSize:11.5}}>{t.business}</div>}
          </div>
          <span className="mono subtle" style={{fontSize:11.5,whiteSpace:'nowrap'}}>{formatDate(t.due)} {formatTime(t.due)}</span>
          <button className="iconbtn" title="Delete task"
                  onClick={e => { e.stopPropagation(); if (confirm(`Delete task "${t.kind}"?`)) store.deleteTask(t.id); }}
                  style={{opacity:0.6}}>
            <Icon name="close" size={12}/>
          </button>
        </div>
      ))}
      {tasks.length > 8 && (
        <div style={{padding:'8px 16px',borderTop:'1px solid var(--border)',textAlign:'center'}}>
          <button className="btn btn-sm" onClick={() => setExpanded(v => !v)}>
            {expanded ? 'Show less' : `Show ${tasks.length - 8} more`}
          </button>
        </div>
      )}
      {tasks.length === 0 && <div style={{padding:'32px',textAlign:'center'}} className="subtle">Nothing here</div>}
    </div>
  </div>
  );
};

const CallLogsPage = ({ onOpenLead }) => {
  const [filter, setFilter] = React.useState('all');
  const [expandedId, setExpandedId] = React.useState(null);
  const filtered = CALL_LOGS.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'connected') return c.disposition === 'Connected';
    if (filter === 'missed') return c.disposition === 'No answer' || c.disposition === 'Voicemail';
    if (filter === 'inbound') return c.disposition === 'Inbound';
    if (filter === 'recorded') return !!c.recordingUrl;
    return true;
  });

  const connected = CALL_LOGS.filter(c => c.disposition === 'Connected').length;
  const connectRate = CALL_LOGS.length ? Math.round((connected / CALL_LOGS.length) * 100) : 0;
  const recordedCount = CALL_LOGS.filter(c => c.recordingUrl).length;

  const avgDuration = (() => {
    const connectedCalls = CALL_LOGS.filter(c => c.disposition === 'Connected');
    if (!connectedCalls.length) return '—';
    const totalSeconds = connectedCalls.reduce((sum, c) => {
      const [m, s] = (c.duration || '0:00').split(':').map(Number);
      return sum + m * 60 + (s || 0);
    }, 0);
    const avg = Math.floor(totalSeconds / connectedCalls.length);
    return `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, '0')}`;
  })();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-title">Call logs</div>
          <div className="page-header-sub">{CALL_LOGS.length} calls logged · {connectRate}% connect rate</div>
        </div>
        <div className="hstack gap-2">
          <button className="btn btn-sm"><Icon name="filter" size={12}/> Date range</button>
          <button className="btn btn-sm"><Icon name="user" size={12}/> Rep</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12,marginBottom:20}}>
        <StatCard label="Total calls" value={CALL_LOGS.length} icon="phone"/>
        <StatCard label="Connected" value={connected} sub={`${connectRate}%`} icon="phone_call" tone="var(--green)"/>
        <StatCard label="Voicemails" value={CALL_LOGS.filter(c=>c.disposition==='Voicemail').length} icon="mic" tone="var(--amber)"/>
        <StatCard label="Avg duration" value={avgDuration} sub="connected calls" icon="clock"/>
      </div>

      <div className="hstack gap-2" style={{marginBottom:14}}>
        {[
          ['all','All',CALL_LOGS.length],
          ['connected','Connected',connected],
          ['missed','No answer / VM',CALL_LOGS.filter(c=>c.disposition==='No answer'||c.disposition==='Voicemail').length],
          ['inbound','Inbound',CALL_LOGS.filter(c=>c.disposition==='Inbound').length],
          ['recorded','Recorded',recordedCount],
        ].map(([id,label,count])=>(
          <button key={id} className="btn btn-sm" style={{borderColor: filter===id?'var(--text)':'var(--border)',background: filter===id?'var(--surface-2)':'var(--surface)'}} onClick={()=>setFilter(id)}>
            {label} <span className="subtle mono" style={{marginLeft:4}}>{count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card subtle" style={{padding:48,textAlign:'center',fontSize:13}}>No calls logged yet. Click "Call now" on a lead to start.</div>
      ) : (
      <div className="card" style={{overflow:'hidden'}}>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Lead</th>
              <th>Phone</th>
              <th>Disposition</th>
              <th>Outcome</th>
              <th className="num">Duration</th>
              <th>By</th>
              <th style={{width:60}}>Recording</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map(c => {
              const isExpanded = expandedId === c.id;
              return (
              <React.Fragment key={c.id}>
                <tr onClick={() => c.leadId && onOpenLead(c.leadId)} style={{cursor: c.leadId ? 'pointer' : 'default'}}>
                  <td className="muted" style={{fontSize:12.5}}>{formatDateTime(c.at)}</td>
                  <td>
                    <div style={{fontWeight:500}}>{c.leadName}</div>
                    <div className="subtle" style={{fontSize:11.5}}>{c.business}</div>
                  </td>
                  <td className="mono" style={{fontSize:12}}>{c.phone}</td>
                  <td>
                    <span className="badge" style={{color:
                      c.disposition === 'Connected' ? 'var(--green)'
                      : c.disposition === 'Inbound'   ? 'var(--accent)'
                      : c.disposition === 'No answer' ? 'var(--text-muted)'
                      : 'var(--amber)'}}>
                      <span className="badge-dot"/>
                      {c.disposition === 'Inbound' ? '↙ Inbound' : c.disposition}
                    </span>
                  </td>
                  <td className="muted" style={{fontSize:12.5}}>{c.outcome}</td>
                  <td className="num mono" style={{fontSize:12}}>{c.duration}</td>
                  <td><Avatar initials={c.by} size={20}/></td>
                  <td onClick={e => e.stopPropagation()}>
                    {c.recordingUrl ? (
                      <button className="btn btn-sm" style={{padding:'3px 8px'}} onClick={() => setExpandedId(isExpanded ? null : c.id)} title={isExpanded ? 'Hide player' : 'Play recording'}>
                        <Icon name={isExpanded ? 'close' : 'phone_call'} size={12} style={{color: isExpanded ? 'var(--text-muted)' : 'var(--green)'}}/>
                        {isExpanded ? 'Hide' : 'Play'}
                      </button>
                    ) : <span className="subtle" style={{fontSize:11}}>—</span>}
                  </td>
                </tr>
                {isExpanded && c.recordingUrl && (
                  <tr>
                    <td colSpan={8} style={{padding:'8px 14px 12px 14px',background:'var(--surface-2)',borderBottom:'1px solid var(--border)'}}>
                      <div className="hstack gap-3">
                        <div className="subtle" style={{fontSize:11,flexShrink:0,width:90}}>
                          Recording<br/>
                          <span className="mono">{c.duration}</span>
                        </div>
                        <audio controls src={c.recordingUrl} style={{flex:1,height:36}}/>
                        <a className="btn btn-sm" href={c.recordingUrl} download={`${c.leadName.replace(/\W+/g,'_')}-${formatDate(c.at).replace(/\W+/g,'')}.mp3`} onClick={e => e.stopPropagation()} title="Download MP3">
                          <Icon name="external" size={12}/> Download
                        </a>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

Object.assign(window, { CalendarTasks, CallLogsPage });
