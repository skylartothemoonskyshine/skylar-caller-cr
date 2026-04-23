// Lead detail page — 2 variations (A: focused caller layout, B: timeline-first)

const LeadDetailA = ({ lead, onCall, onBack, onQuickLog, onSMS, onEdit }) => {
  const [tab, setTab] = React.useState('notes');
  const [noteDraft, setNoteDraft] = React.useState('');
  const notes = store.getNotes(lead.id);
  const callHistory = store.getCallHistory(lead.id);
  const messages = store.getMessages(lead.id);
  const followupTask = TASKS.find(t => t.leadId === lead.id && !t.done && t.kind === 'Call follow-up');
  const leadTasks = TASKS.filter(t => t.leadId === lead.id);

  const saveNote = () => {
    if (!noteDraft.trim()) return;
    store.addNote(lead.id, noteDraft);
    setNoteDraft('');
  };
  const onNoteKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveNote(); }
  };

  const markFollowupDone = () => store.clearFollowup(lead.id);
  const rescheduleFollowup = () => {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    due.setHours(10, 0, 0, 0);
    store.setTask(lead.id, due, 'Call follow-up');
  };

  return (
    <div className="page" style={{maxWidth:1320,paddingTop:20}}>
      {/* Header */}
      <div className="hstack gap-3" style={{marginBottom:20}}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="chevron_right" size={14} style={{transform:'rotate(180deg)'}}/> Leads
        </button>
        <span className="subtle">/</span>
        <span style={{fontSize:13,fontWeight:500}}>{lead.fullName}</span>
        <div style={{marginLeft:'auto'}} className="hstack gap-2">
          <button className="btn" onClick={onEdit}><Icon name="sliders" size={13}/> Edit</button>
          <a className="btn" href={lead.email ? `mailto:${lead.email}` : '#'}><Icon name="mail" size={13}/> Email</a>
          <button className="btn" onClick={onSMS}><Icon name="message" size={13}/> SMS</button>
          <button className="btn btn-primary" onClick={() => onCall(lead)}>
            <Icon name="phone_call" size={13}/> Call <span className="kbd">C</span>
          </button>
          <ActionsMenu actions={[
            { icon: 'external', label: 'Copy phone', onClick: () => { try { navigator.clipboard.writeText(lead.phone); } catch {} } },
            lead.website && { icon: 'globe', label: 'Open website', onClick: () => window.open(safeUrl(lead.website), '_blank') },
            lead.mapsUrl && { icon: 'map_pin', label: 'Open on Maps', onClick: () => window.open(safeUrl(lead.mapsUrl), '_blank') },
            'divider',
            { icon: 'close', label: 'Delete lead', danger: true, onClick: () => { if (confirm(`Delete ${lead.fullName}? Call history is preserved.`)) { store.deleteLead(lead.id); onBack(); } } },
          ]}/>
        </div>
      </div>

      {/* Hero header */}
      <div className="hstack gap-4" style={{alignItems:'flex-start',marginBottom:24}}>
        <div style={{width:64,height:64,borderRadius:14,background:'var(--accent)',color:'white',display:'grid',placeItems:'center',fontWeight:600,fontSize:22,flexShrink:0}}>
          {lead.initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div className="hstack gap-2" style={{marginBottom:4}}>
            <h1 style={{fontSize:26}}>{lead.fullName}</h1>
            <StagePill stageId={lead.stage}/>
            {callHistory[0] && (
              <span className="badge" style={{fontSize:11}}>
                Last call: {callHistory[0].disposition} · {relativeString(callHistory[0].at)}
              </span>
            )}
          </div>
          <div className="muted" style={{fontSize:14}}>{lead.business}{lead.niche ? ` · ${lead.niche}` : ''}{lead.location ? ` · ${lead.location}` : ''}</div>
          <div className="hstack gap-4" style={{marginTop:10,fontSize:12.5}}>
            <a href={`tel:${lead.phone}`} className="hstack gap-1 muted"><Icon name="phone" size={12}/><span className="mono">{lead.phone}</span></a>
            {lead.email && <a href={`mailto:${lead.email}`} className="hstack gap-1 muted"><Icon name="mail" size={12}/>{lead.email}</a>}
            {lead.website && <a href={safeUrl(lead.website)} target="_blank" rel="noreferrer" className="hstack gap-1 muted"><Icon name="globe" size={12}/>{displayUrl(lead.website)}</a>}
          </div>
        </div>
      </div>

      {/* 3-column grid: details | timeline/notes | follow-up + history */}
      <div style={{display:'grid',gridTemplateColumns:'240px 1fr 320px',gap:20,alignItems:'flex-start'}}>
        {/* Left: details */}
        <div className="card">
          <div className="card-header"><h3>Details</h3></div>
          <div style={{padding:'12px 18px 16px'}}>
            <DetailRow label="Stage">
              <select className="input" style={{padding:'2px 6px',fontSize:12,width:'100%'}}
                      value={lead.stage} onChange={e => store.updateLead(lead.id, { stage: e.target.value })}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </DetailRow>
            <DetailRow label="Owner"><span className="hstack gap-2"><Avatar initials={lead.ownerInitials} size={18}/>{lead.ownerName}</span></DetailRow>
            <DetailRow label="Source"><span className="badge">{lead.source}</span></DetailRow>
            <DetailRow label="Niche">{lead.niche || '—'}</DetailRow>
            <DetailRow label="Location">{lead.location || '—'}</DetailRow>
            <DetailRow label="Phone"><span className="mono" style={{fontSize:12}}>{lead.phone}</span></DetailRow>
            <DetailRow label="Email"><span style={{fontSize:12}}>{lead.email || '—'}</span></DetailRow>
            <DetailRow label="Website">
              {lead.website
                ? <a href={safeUrl(lead.website)} target="_blank" rel="noreferrer" title={lead.website} style={{fontSize:12,color:'var(--accent)'}}>{displayUrl(lead.website)} ↗</a>
                : <span style={{fontSize:12}}>—</span>}
            </DetailRow>
            <DetailRow label="Last call">{lead.lastCallAt ? relativeString(lead.lastCallAt) : '—'}</DetailRow>
            <DetailRow label="Attempts"><span className="mono">{lead.callAttempts}</span></DetailRow>
            <DetailRow label="Created">{relativeString(lead.createdAt)}</DetailRow>
            {(lead.rating != null || lead.reviews != null) && (
              <DetailRow label="Rating">
                <span>{lead.rating != null ? `⭐ ${lead.rating}` : '—'} {lead.reviews != null && <span className="subtle">· {lead.reviews} reviews</span>}</span>
              </DetailRow>
            )}
            {lead.mapsUrl && (
              <DetailRow label="Maps">
                <a href={safeUrl(lead.mapsUrl)} target="_blank" rel="noreferrer" style={{color:'var(--accent)',fontSize:12}}>Open ↗</a>
              </DetailRow>
            )}
          </div>
        </div>

        {/* Middle: tabs */}
        <div>
          <div className="hstack gap-2" style={{marginBottom:12,borderBottom:'1px solid var(--border)'}}>
            {['notes','activity','sms','tasks'].map(t => (
              <button key={t} className="btn btn-ghost" style={{
                borderRadius:0,
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: 500,
                padding:'8px 10px',
                marginBottom:-1
              }} onClick={() => setTab(t)}>
                {t === 'notes' ? `Notes (${notes.length})`
                  : t === 'activity' ? `Activity (${callHistory.length})`
                  : t === 'sms' ? `SMS (${messages.length})`
                  : `Tasks (${leadTasks.length})`}
              </button>
            ))}
          </div>

          {tab === 'notes' && (
            <>
              <div className="card" style={{padding:'12px 14px',marginBottom:14}}>
                <textarea
                  className="input"
                  placeholder="Add a note…  (Cmd+Enter to save)"
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onKeyDown={onNoteKey}
                  style={{resize:'vertical',minHeight:60,border:'none',background:'transparent',padding:0,fontSize:13}}
                />
                <div className="hstack gap-2" style={{marginTop:8,borderTop:'1px solid var(--border)',paddingTop:8}}>
                  <button className="btn btn-ghost btn-sm" onClick={onQuickLog}><Icon name="phone" size={12}/> Tag call</button>
                  <button className="btn btn-ghost btn-sm"><Icon name="user" size={12}/> Mention</button>
                  <div style={{marginLeft:'auto'}}>
                    <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={!noteDraft.trim()} style={{opacity: noteDraft.trim() ? 1 : 0.5}}>
                      Save note <span className="kbd">⌘⏎</span>
                    </button>
                  </div>
                </div>
              </div>
              {notes.map(n => (
                <div key={n.id} className="card" style={{padding:'14px 16px',marginBottom:10}}>
                  <div className="hstack gap-2" style={{marginBottom:6}}>
                    <Avatar initials={n.by} size={20}/>
                    <span style={{fontWeight:500,fontSize:12.5}}>{REP_OF[Object.keys(REP_OF).find(k => REP_OF[k].initials === n.by)]?.name || n.by}</span>
                    <span className="subtle" style={{fontSize:11.5}}>· {relativeString(n.at)}</span>
                  </div>
                  <div style={{fontSize:13,lineHeight:1.55}}>{n.body}</div>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="card subtle" style={{padding:24,textAlign:'center',fontSize:12}}>No notes yet — add the first one.</div>
              )}
            </>
          )}

          {tab === 'activity' && (
            <div className="card">
              {callHistory.length === 0 && <div className="subtle" style={{padding:24,textAlign:'center',fontSize:12}}>No calls logged yet.</div>}
              {callHistory.map((c, i) => (
                <div key={c.id} style={{padding:'12px 16px',borderBottom: i === callHistory.length - 1 ? 'none' : '1px solid var(--border)'}}>
                  <div className="hstack gap-3">
                    <div style={{width:28,height:28,borderRadius:'50%',background: c.disposition === 'Connected' ? 'var(--green-soft)' : 'var(--surface-2)',
                                 color: c.disposition === 'Connected' ? 'var(--green)' : 'var(--text-muted)',
                                 display:'grid',placeItems:'center',flexShrink:0}}>
                      <Icon name={c.disposition === 'No answer' ? 'phone_off' : 'phone_call'} size={12}/>
                    </div>
                    <div style={{flex:1}}>
                      <div className="hstack gap-2">
                        <span style={{fontWeight:500,fontSize:13}}>{c.disposition}</span>
                        <span className="mono subtle" style={{fontSize:11.5}}>{c.duration}</span>
                      </div>
                      <div className="subtle" style={{fontSize:11.5,marginTop:2}}>{c.outcome}</div>
                    </div>
                    <span className="subtle" style={{fontSize:11.5}}>{formatDateTime(c.at)}</span>
                  </div>
                  {c.recordingUrl && (
                    <div style={{marginTop:8,marginLeft:40}}>
                      <audio controls src={c.recordingUrl} style={{width:'100%',height:32}}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'sms' && (
            <div className="card">
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                <button className="btn btn-primary btn-sm" onClick={onSMS}><Icon name="message" size={12}/> Compose SMS</button>
              </div>
              {messages.length === 0 && <div className="subtle" style={{padding:24,textAlign:'center',fontSize:12}}>No messages yet.</div>}
              <div style={{padding:12}}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    display:'flex',
                    justifyContent: m.direction === 'out' ? 'flex-end' : 'flex-start',
                    marginBottom:8
                  }}>
                    <div style={{
                      maxWidth:'75%',
                      padding:'8px 11px',
                      borderRadius:10,
                      background: m.direction === 'out' ? 'var(--accent)' : 'var(--surface-2)',
                      color: m.direction === 'out' ? 'white' : 'var(--text)',
                      border: m.direction === 'out' ? 'none' : '1px solid var(--border)',
                      fontSize:13,
                      lineHeight:1.4,
                    }}>
                      <div>{m.body}</div>
                      <div style={{fontSize:10,opacity:0.7,marginTop:4}}>{relativeString(m.at)}{m.status ? ` · ${m.status}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="card">
              {leadTasks.length === 0 && <div className="subtle" style={{padding:24,textAlign:'center',fontSize:12}}>No tasks yet.</div>}
              {leadTasks.map((t, i) => (
                <TaskRow key={t.id} task={t} last={i === leadTasks.length - 1}/>
              ))}
            </div>
          )}
        </div>

        {/* Right: follow-up + history */}
        <div className="vstack gap-4">
          {followupTask ? (
            <div className="card" style={{borderColor: isToday(followupTask.due) ? 'var(--amber)' : 'var(--border)',
                                          background: isToday(followupTask.due) ? 'var(--amber-soft)' : 'var(--surface)'}}>
              <div style={{padding:'14px 16px'}}>
                <div className="hstack gap-2" style={{marginBottom:4}}>
                  <Icon name="clock" size={14} style={{color:'var(--amber)'}}/>
                  <span style={{fontSize:12,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500,color:'var(--amber)'}}>Next follow-up</span>
                </div>
                <div style={{fontWeight:600,fontSize:15,marginTop:6}}>
                  {isToday(followupTask.due) ? 'Today' : formatDate(followupTask.due)}, {formatTime(followupTask.due)}
                </div>
                <div className="muted" style={{fontSize:12.5,marginTop:2}}>{followupTask.kind} · by {followupTask.owner}</div>
                <div className="hstack gap-2" style={{marginTop:12}}>
                  <button className="btn btn-sm" onClick={rescheduleFollowup}>Reschedule</button>
                  <button className="btn btn-sm" onClick={markFollowupDone}>Mark done</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{padding:'14px 16px'}}>
                <div className="subtle" style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500,marginBottom:6}}>No follow-up scheduled</div>
                <button className="btn btn-sm" onClick={rescheduleFollowup}>Schedule in 3 days</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3>Quick actions</h3>
            </div>
            <div style={{padding:'10px 12px'}}>
              <QuickAction icon="phone_call" label="Log a call" hint="L" onClick={onQuickLog}/>
              <QuickAction icon="message" label="Send SMS" hint="S" onClick={onSMS}/>
              <QuickAction icon="note" label="Add note" hint="T" onClick={() => setTab('notes')}/>
              <QuickAction icon="calendar" label="Schedule follow-up" hint="F" onClick={rescheduleFollowup}/>
              <QuickAction icon="mail" label="Send email" hint="E" onClick={() => lead.email && (window.location.href = `mailto:${lead.email}`)}/>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Call history</h3>
              <span className="subtle" style={{fontSize:11.5}}>{callHistory.length} calls</span>
            </div>
            <div>
              {callHistory.slice(0,3).map((c,i) => (
                <div key={c.id} className="hstack gap-3" style={{padding:'10px 14px',borderBottom:i === Math.min(callHistory.length,3) - 1 ? 'none' : '1px solid var(--border)'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background: c.disposition === 'Connected' ? 'var(--green)' : 'var(--text-subtle)'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:500}}>{c.disposition}</div>
                    <div className="subtle" style={{fontSize:11}}>{formatDate(c.at)} · {c.duration}</div>
                  </div>
                </div>
              ))}
              {callHistory.length === 0 && <div className="subtle" style={{padding:16,textAlign:'center',fontSize:12}}>No calls yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, children }) => (
  <div style={{display:'grid',gridTemplateColumns:'80px 1fr',gap:8,padding:'6px 0',alignItems:'center',fontSize:12.5}}>
    <div className="subtle" style={{fontSize:11.5}}>{label}</div>
    <div style={{minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{children}</div>
  </div>
);

const QuickAction = ({ icon, label, hint, onClick }) => (
  <button className="nav-item" onClick={onClick}>
    <Icon name={icon} className="icon"/>
    <span>{label}</span>
    <span className="kbd">{hint}</span>
  </button>
);

const TaskRow = ({ task, last }) => (
  <div className="hstack gap-3" style={{padding:'12px 16px',borderBottom: last ? 'none' : '1px solid var(--border)'}}>
    <button style={{width:16,height:16,border:'1.5px solid var(--border-strong)',borderRadius:4,display:'grid',placeItems:'center',background: task.done ? 'var(--accent)' : 'transparent',padding:0}}
            onClick={() => store.toggleTask(task.id)}>
      {task.done && <Icon name="check" size={10} style={{color:'white'}}/>}
    </button>
    <div style={{flex:1,fontSize:13,textDecoration: task.done ? 'line-through' : 'none',color: task.done ? 'var(--text-subtle)' : 'var(--text)'}}>{task.kind}</div>
    <span className="mono subtle" style={{fontSize:11.5}}>{formatDate(task.due)}</span>
  </div>
);

// Variation B — Timeline-first (all activity in one feed)
const LeadDetailB = ({ lead, onCall, onBack, onQuickLog, onSMS, onEdit }) => {
  const notes = store.getNotes(lead.id);
  const callHistory = store.getCallHistory(lead.id);
  const [noteDraft, setNoteDraft] = React.useState('');

  const feed = [
    ...notes.map(n => ({ kind: 'note', at: n.at, data: n })),
    ...callHistory.map(c => ({ kind: 'call', at: c.at, data: c })),
    { kind: 'created', at: lead.createdAt, data: { source: lead.source } },
  ].sort((a,b) => b.at - a.at);

  const post = () => {
    if (!noteDraft.trim()) return;
    store.addNote(lead.id, noteDraft);
    setNoteDraft('');
  };

  const followupTask = TASKS.find(t => t.leadId === lead.id && !t.done && t.kind === 'Call follow-up');

  return (
    <div className="page" style={{maxWidth:1100,paddingTop:20}}>
      <div className="hstack gap-3" style={{marginBottom:20}}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="chevron_right" size={14} style={{transform:'rotate(180deg)'}}/> Leads
        </button>
        <div style={{marginLeft:'auto'}} className="hstack gap-2">
          <button className="btn" onClick={onEdit}><Icon name="sliders" size={13}/> Edit</button>
          <a className="btn" href={lead.email ? `mailto:${lead.email}` : '#'}><Icon name="mail" size={13}/> Email</a>
          <button className="btn" onClick={onSMS}><Icon name="message" size={13}/> SMS</button>
          <button className="btn btn-primary" onClick={() => onCall(lead)}>
            <Icon name="phone_call" size={13}/> Call <span className="kbd">C</span>
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:32,alignItems:'flex-start'}}>
        <div>
          <div className="hstack gap-4" style={{alignItems:'flex-start',marginBottom:24}}>
            <div style={{width:56,height:56,borderRadius:12,background:'var(--accent)',color:'white',display:'grid',placeItems:'center',fontWeight:600,fontSize:20,flexShrink:0}}>
              {lead.initials}
            </div>
            <div style={{flex:1}}>
              <div className="hstack gap-2" style={{marginBottom:2}}>
                <h1>{lead.fullName}</h1>
                <StagePill stageId={lead.stage}/>
              </div>
              <div className="muted" style={{fontSize:13}}>{lead.business}{lead.location ? ` · ${lead.location}` : ''} · <span className="mono">{lead.phone}</span></div>
            </div>
          </div>

          <div className="card" style={{padding:'14px 16px',marginBottom:20,background:'var(--surface-2)',borderStyle:'dashed'}}>
            <textarea className="input" placeholder="What's new with this lead?" value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              style={{background:'var(--surface)',resize:'none',minHeight:44}}/>
            <div className="hstack gap-2" style={{marginTop:8}}>
              <button className="btn btn-sm" onClick={onQuickLog}><Icon name="phone_call" size={12}/> Log call</button>
              <button className="btn btn-sm" onClick={onSMS}><Icon name="message" size={12}/> SMS</button>
              <button className="btn btn-sm" onClick={post}><Icon name="note" size={12}/> Note</button>
              <button className="btn btn-sm" onClick={() => {
                const due = new Date(); due.setDate(due.getDate() + 3); due.setHours(10,0,0,0);
                store.setTask(lead.id, due, 'Call follow-up');
              }}><Icon name="calendar" size={12}/> Follow-up</button>
              <div style={{marginLeft:'auto'}}><button className="btn btn-primary btn-sm" onClick={post} disabled={!noteDraft.trim()} style={{opacity: noteDraft.trim() ? 1 : 0.5}}>Post</button></div>
            </div>
          </div>

          <div className="subtle" style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12,fontWeight:500}}>Timeline</div>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:14,top:8,bottom:8,width:1,background:'var(--border)'}}/>
            {feed.map((f, i) => (
              <TimelineItem key={i} item={f}/>
            ))}
            {feed.length === 0 && <div className="subtle" style={{padding:16,fontSize:12}}>Nothing yet.</div>}
          </div>
        </div>

        <div className="vstack gap-3" style={{position:'sticky',top:72}}>
          {followupTask && (
            <div className="card" style={{background:'var(--amber-soft)',borderColor:'var(--amber)'}}>
              <div style={{padding:'14px 16px'}}>
                <div className="hstack gap-2">
                  <Icon name="clock" size={13} style={{color:'var(--amber)'}}/>
                  <span style={{fontSize:11.5,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500,color:'var(--amber)'}}>
                    {isToday(followupTask.due) ? 'Follow-up today' : 'Follow-up scheduled'}
                  </span>
                </div>
                <div style={{fontWeight:600,marginTop:6}}>{formatTime(followupTask.due)} {followupTask.kind.toLowerCase()}</div>
              </div>
            </div>
          )}

          <div className="card">
            <div style={{padding:'14px 16px'}}>
              <div className="subtle" style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Details</div>
              <DetailRow label="Owner"><span className="hstack gap-2"><Avatar initials={lead.ownerInitials} size={18}/>{lead.ownerName.split(' ')[0]}</span></DetailRow>
              <DetailRow label="Source">{lead.source}</DetailRow>
              <DetailRow label="Niche">{lead.niche || '—'}</DetailRow>
              <DetailRow label="Email">{lead.email || '—'}</DetailRow>
              <DetailRow label="Website">
                {lead.website
                  ? <a href={safeUrl(lead.website)} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>{displayUrl(lead.website)} ↗</a>
                  : '—'}
              </DetailRow>
              <DetailRow label="Attempts"><span className="mono">{lead.callAttempts}</span></DetailRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineItem = ({ item }) => {
  const meta = {
    note: { icon: 'note', color: 'var(--violet)' },
    call: { icon: 'phone_call', color: 'var(--green)' },
    stage: { icon: 'columns', color: 'var(--accent)' },
    created: { icon: 'plus', color: 'var(--text-muted)' },
  }[item.kind];

  return (
    <div className="hstack gap-3" style={{alignItems:'flex-start',marginBottom:16,position:'relative'}}>
      <div style={{width:28,height:28,borderRadius:'50%',background:'var(--surface)',border:'1px solid var(--border)',display:'grid',placeItems:'center',color:meta.color,zIndex:1,flexShrink:0}}>
        <Icon name={meta.icon} size={12}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        {item.kind === 'note' && (
          <div className="card" style={{padding:'12px 14px'}}>
            <div className="hstack gap-2" style={{marginBottom:6}}>
              <Avatar initials={item.data.by} size={18}/>
              <span style={{fontWeight:500,fontSize:12.5}}>{REP_OF[Object.keys(REP_OF).find(k => REP_OF[k].initials === item.data.by)]?.name.split(' ')[0] || item.data.by} added a note</span>
              <span className="subtle" style={{fontSize:11}}>· {relativeString(item.at)}</span>
            </div>
            <div style={{fontSize:13,lineHeight:1.55}}>{item.data.body}</div>
          </div>
        )}
        {item.kind === 'call' && (
          <div>
            <div style={{fontSize:13}}>
              <span style={{fontWeight:500}}>Call · {item.data.disposition}</span>
              <span className="mono subtle" style={{marginLeft:8}}>{item.data.duration}</span>
              <span className="subtle" style={{marginLeft:8,fontSize:11.5}}>· {relativeString(item.at)}</span>
            </div>
            <div className="subtle" style={{fontSize:12,marginTop:2}}>{item.data.outcome}</div>
          </div>
        )}
        {item.kind === 'created' && (
          <div style={{fontSize:13}} className="muted">
            Lead created from <span className="badge">{item.data.source}</span>
            <span className="subtle" style={{marginLeft:8,fontSize:11.5}}>· {relativeString(item.at)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { LeadDetailA, LeadDetailB });
