// Leads table + Kanban pipeline

const BulkAssignModal = ({ leads, onClose }) => {
  const callers = REPS.filter(r => r.role !== 'owner');
  const [mode, setMode] = React.useState('single'); // 'single' | 'split'
  const [ownerId, setOwnerId] = React.useState(callers[0]?.id || REPS[0]?.id || '');
  const [splitA, setSplitA] = React.useState(callers[0]?.id || '');
  const [splitB, setSplitB] = React.useState(callers[1]?.id || '');
  const [busy, setBusy] = React.useState(false);

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    if (mode === 'single') {
      await store.bulkAssign(leads.map(l => l.id), ownerId);
    } else {
      const a = [], b = [];
      leads.forEach((l, i) => (i % 2 === 0 ? a : b).push(l.id));
      await Promise.all([
        store.bulkAssign(a, splitA),
        store.bulkAssign(b, splitB),
      ]);
    }
    setBusy(false);
    onClose();
  };

  const canApply = mode === 'single' ? !!ownerId : !!splitA && !!splitB && splitA !== splitB;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" style={{width:480}}>
        <div className="modal-header">
          <div>
            <div style={{fontWeight:600,fontSize:14}}>Assign leads</div>
            <div className="subtle" style={{fontSize:12,marginTop:2}}>{leads.length} filtered lead{leads.length === 1 ? '' : 's'}</div>
          </div>
          <button className="iconbtn" onClick={() => !busy && onClose()}><Icon name="close" size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="seg" style={{marginBottom:16}}>
            <button className={mode==='single'?'active':''} onClick={()=>setMode('single')}>Single rep</button>
            <button className={mode==='split'?'active':''} onClick={()=>setMode('split')} disabled={callers.length < 2}>Split 50/50</button>
          </div>

          {mode === 'single' ? (
            <div className="vstack gap-1">
              {REPS.map(r => (
                <label key={r.id} className="hstack gap-2" style={{
                  padding:'8px 10px',border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',
                  background: ownerId === r.id ? 'var(--surface-2)' : 'var(--surface)',
                  borderColor: ownerId === r.id ? 'var(--text)' : 'var(--border)'
                }}>
                  <input type="radio" name="bulk-owner" checked={ownerId === r.id} onChange={() => setOwnerId(r.id)} style={{margin:0}}/>
                  <Avatar initials={r.initials} size={22}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:13}}>{r.name}</div>
                    <div className="subtle" style={{fontSize:11.5,textTransform:'capitalize'}}>{r.role}</div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="tweak-row">
                <div className="tweak-label">Half A ({Math.ceil(leads.length / 2)})</div>
                <select className="input" value={splitA} onChange={e => setSplitA(e.target.value)}>
                  {callers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="tweak-row">
                <div className="tweak-label">Half B ({Math.floor(leads.length / 2)})</div>
                <select className="input" value={splitB} onChange={e => setSplitB(e.target.value)}>
                  {callers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {splitA === splitB && <div className="subtle" style={{gridColumn:'1/-1',fontSize:11.5,color:'var(--red)'}}>Pick two different reps.</div>}
            </div>
          )}
        </div>
        <div className="modal-footer hstack gap-2" style={{justifyContent:'flex-end'}}>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={apply} disabled={busy || !canApply}>
            {busy ? 'Assigning…' : `Assign ${leads.length} lead${leads.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadsTable = ({ onOpenLead, onCall, onEdit, onSMS }) => {
  const [filter, setFilter] = React.useState('all');
  const [view, setView] = React.useState(localStorage.getItem('leadsView') || 'table');
  const [showAssign, setShowAssign] = React.useState(false);
  React.useEffect(() => { localStorage.setItem('leadsView', view); }, [view]);

  const scoped = store.visibleLeads();
  const filtered = scoped.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'mine') return l.ownerId === store.effectiveMe();
    if (filter === 'active') return !['won','lost'].includes(l.stage);
    if (filter === 'today') return l.nextFollowupAt && isToday(l.nextFollowupAt);
    return true;
  });

  if (view === 'kanban') return <KanbanBoard onOpenLead={onOpenLead} onCall={onCall} view={view} setView={setView} filter={filter} setFilter={setFilter}/>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-title">Leads</div>
          <div className="page-header-sub">{filtered.length} of {scoped.length} leads</div>
        </div>
        <div className="hstack gap-2">
          <div className="seg">
            <button className={view==='table'?'active':''} onClick={()=>setView('table')}><Icon name="list" size={12}/> Table</button>
            <button className={view==='kanban'?'active':''} onClick={()=>setView('kanban')}><Icon name="columns" size={12}/> Kanban</button>
          </div>
        </div>
      </div>

      <div className="hstack gap-2" style={{marginBottom:14,flexWrap:'wrap'}}>
        {[['all','All',scoped.length],['mine','Assigned to me',scoped.filter(l=>l.ownerId===store.effectiveMe()).length],['active','Active',scoped.filter(l=>!['won','lost'].includes(l.stage)).length],['today','Due today',scoped.filter(l=>l.nextFollowupAt&&isToday(l.nextFollowupAt)).length]].map(([id,label,count])=>(
            <button key={id} className="btn btn-sm" style={{borderColor: filter===id?'var(--text)':'var(--border)',background: filter===id?'var(--surface-2)':'var(--surface)'}} onClick={()=>setFilter(id)}>
              {label} <span className="subtle mono" style={{marginLeft:4}}>{count}</span>
            </button>
          ))}
        <div className="v-divider" style={{margin:'0 6px'}}/>
        <button className="btn btn-sm"><Icon name="filter" size={12}/> Stage</button>
        <button className="btn btn-sm"><Icon name="user" size={12}/> Owner</button>
        <button className="btn btn-sm"><Icon name="map_pin" size={12}/> Location</button>
        <button className="btn btn-sm"><Icon name="flame" size={12}/> Niche</button>
        <div style={{marginLeft:'auto'}} className="hstack gap-2">
          {store.isOwner() && filtered.length > 0 && (
            <button className="btn btn-sm" onClick={() => setShowAssign(true)} title={`Assign ${filtered.length} filtered leads to a rep`}>
              <Icon name="user" size={12}/> Assign {filtered.length}
            </button>
          )}
          <button className="btn btn-sm"><Icon name="sliders" size={12}/> Sort</button>
        </div>
      </div>

      {showAssign && (
        <BulkAssignModal leads={filtered} onClose={() => setShowAssign(false)}/>
      )}

      {filtered.length === 0 ? (
        <div className="card subtle" style={{padding:48,textAlign:'center'}}>
          <div style={{fontSize:13}}>No leads match this filter.</div>
          <div style={{fontSize:12,marginTop:4}}>Try switching to <b>All</b>, or import a CSV from the top bar.</div>
        </div>
      ) : (
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="table">
            <thead>
              <tr>
                <th style={{width:28}}><input type="checkbox" style={{margin:0}}/></th>
                <th>Name</th>
                <th>Business</th>
                <th>Stage</th>
                <th>Phone</th>
                <th>Niche</th>
                <th>Location</th>
                <th>Owner</th>
                <th>Last call</th>
                <th>Follow-up</th>
                <th style={{width:80}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} onClick={() => onOpenLead(l.id)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" style={{margin:0}}/></td>
                  <td>
                    <div className="hstack gap-2">
                      <Avatar initials={l.initials} size={22}/>
                      <span style={{fontWeight:500}}>{l.fullName}</span>
                    </div>
                  </td>
                  <td className="muted">{l.business}</td>
                  <td><StagePill stageId={l.stage}/></td>
                  <td className="mono" style={{fontSize:12}}>{l.phone}</td>
                  <td className="muted">{l.niche}</td>
                  <td className="muted">{l.location}</td>
                  <td><span className="hstack gap-2"><Avatar initials={l.ownerInitials} size={18}/><span className="muted">{l.ownerName.split(' ')[0]}</span></span></td>
                  <td className="muted" style={{fontSize:12}}>{l.lastCallAt ? relativeString(l.lastCallAt) : <span className="subtle">Never</span>}</td>
                  <td>
                    {l.nextFollowupAt ? (
                      <span className="badge" style={{color: isToday(l.nextFollowupAt) ? 'var(--amber)' : (l.nextFollowupAt < new Date() ? 'var(--red)' : 'var(--text-muted)')}}>
                        {relativeString(l.nextFollowupAt)}
                      </span>
                    ) : <span className="subtle">—</span>}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="hstack gap-1">
                      <button className="btn btn-sm" onClick={() => onCall(l)} title="Call"><Icon name="phone" size={12}/></button>
                      {l.website && (
                        <a className="btn btn-sm" href={safeUrl(l.website)} target="_blank" rel="noreferrer" title={`Open ${displayUrl(l.website)}`} onClick={e => e.stopPropagation()}>
                          <Icon name="globe" size={12}/>
                        </a>
                      )}
                      {l.mapsUrl && (
                        <a className="btn btn-sm" href={safeUrl(l.mapsUrl)} target="_blank" rel="noreferrer" title="Open on Google Maps" onClick={e => e.stopPropagation()}>
                          <Icon name="map_pin" size={12}/>
                        </a>
                      )}
                      <ActionsMenu actions={[
                        { icon: 'sliders', label: 'Edit',         onClick: () => onEdit && onEdit(l) },
                        { icon: 'message', label: 'Send SMS',     onClick: () => onSMS && onSMS(l) },
                        { icon: 'external', label: 'Copy phone',  onClick: () => { try { navigator.clipboard.writeText(l.phone); } catch {} } },
                        l.website && { icon: 'globe', label: 'Open website', onClick: () => window.open(safeUrl(l.website), '_blank') },
                        l.mapsUrl && { icon: 'map_pin', label: 'Open on Maps', onClick: () => window.open(safeUrl(l.mapsUrl), '_blank') },
                        'divider',
                        { icon: 'close', label: 'Delete lead', danger: true, onClick: () => { if (confirm(`Delete ${l.fullName}? Call history is preserved.`)) store.deleteLead(l.id); } },
                      ]}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

const KanbanBoard = ({ onOpenLead, onCall, view, setView, filter, setFilter }) => {
  const [draggedId, setDraggedId] = React.useState(null);
  const [overStage, setOverStage] = React.useState(null);

  const leadsByStage = Object.fromEntries(STAGES.map(s => [s.id, []]));
  store.visibleLeads().forEach(l => { if (leadsByStage[l.stage]) leadsByStage[l.stage].push(l); });

  return (
    <div className="page" style={{maxWidth:'none',paddingRight:20,paddingLeft:20}}>
      <div className="page-header">
        <div>
          <div className="page-header-title">Pipeline</div>
          <div className="page-header-sub">Drag cards to move stages</div>
        </div>
        <div className="hstack gap-2">
          <div className="seg">
            <button className={view==='table'?'active':''} onClick={()=>setView('table')}><Icon name="list" size={12}/> Table</button>
            <button className={view==='kanban'?'active':''} onClick={()=>setView('kanban')}><Icon name="columns" size={12}/> Kanban</button>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:16}}>
        {STAGES.map(s => (
          <div key={s.id} style={{flex:'0 0 272px',display:'flex',flexDirection:'column'}}
               onDragOver={e => { e.preventDefault(); setOverStage(s.id); }}
               onDragLeave={() => setOverStage(null)}
               onDrop={e => {
                 e.preventDefault();
                 if (draggedId) store.updateLead(draggedId, { stage: s.id });
                 setDraggedId(null); setOverStage(null);
               }}>
            <div className="hstack gap-2" style={{padding:'8px 4px 10px'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:`var(--stage-${s.id})`}}/>
              <span style={{fontWeight:600,fontSize:13}}>{s.label}</span>
              <span className="subtle mono tabular" style={{fontSize:12}}>{leadsByStage[s.id].length}</span>
              <div style={{marginLeft:'auto'}}/>
            </div>
            <div style={{flex:1,minHeight:200,padding:4,borderRadius:8,background: overStage === s.id ? 'var(--accent-soft)' : 'transparent',transition:'background 0.1s'}}>
              {leadsByStage[s.id].map(l => (
                <div key={l.id} className="card"
                     draggable
                     onDragStart={() => setDraggedId(l.id)}
                     onDragEnd={() => { setDraggedId(null); setOverStage(null); }}
                     onClick={() => onOpenLead(l.id)}
                     style={{padding:'10px 12px',marginBottom:8,cursor:'grab',opacity: draggedId === l.id ? 0.4 : 1,borderLeft:`3px solid var(--stage-${s.id})`}}>
                  <div className="hstack gap-2" style={{marginBottom:4}}>
                    <Avatar initials={l.initials} size={20}/>
                    <span style={{fontWeight:500,fontSize:13}} className="ellipsis">{l.fullName}</span>
                  </div>
                  <div className="subtle ellipsis" style={{fontSize:11.5,marginBottom:8}}>{l.business}</div>
                  <div className="hstack gap-2" style={{fontSize:11}}>
                    <span className="muted mono">{l.phone}</span>
                    <div style={{marginLeft:'auto'}} className="hstack gap-1">
                      {l.nextFollowupAt && isToday(l.nextFollowupAt) && <span className="badge" style={{color:'var(--amber)',padding:'1px 5px',fontSize:10}}>Today</span>}
                      <button className="iconbtn" style={{width:20,height:20}} onClick={e => {e.stopPropagation(); onCall(l);}} title="Call">
                        <Icon name="phone" size={11}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {leadsByStage[s.id].length === 0 && (
                <div style={{padding:'24px',textAlign:'center',border:'1.5px dashed var(--border)',borderRadius:8}} className="subtle">
                  <Icon name="plus" size={14}/>
                  <div style={{fontSize:12,marginTop:4}}>Drop leads here</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { LeadsTable, KanbanBoard });
