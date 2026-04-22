// Calendar + Tasks + Call logs pages

const CalendarTasks = ({ onOpenLead }) => {
  const [tab, setTab] = React.useState('calendar');
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

const CalendarView = ({ onOpenLead }) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
  const hours = Array.from({length: 10}, (_, i) => 8 + i); // 8am - 5pm

  return (
    <div className="card" style={{overflow:'hidden'}}>
      <div className="hstack gap-3" style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
        <button className="btn btn-sm"><Icon name="chevron_right" size={12} style={{transform:'rotate(180deg)'}}/></button>
        <div style={{fontWeight:600,fontSize:14}}>
          {days[0].toLocaleDateString('en-US',{month:'long',day:'numeric'})} – {days[6].toLocaleDateString('en-US',{month:'long',day:'numeric'})}
        </div>
        <button className="btn btn-sm"><Icon name="chevron_right" size={12}/></button>
        <button className="btn btn-sm">Today</button>
        <div style={{marginLeft:'auto'}} className="seg">
          <button>Day</button>
          <button className="active">Week</button>
          <button>Month</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'56px repeat(7, 1fr)'}}>
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
              {h}{h < 12 ? 'a' : 'p'}
            </div>
            {days.map((d,i) => {
              const tasksHere = TASKS.filter(t => !t.done && t.due.toDateString() === d.toDateString() && t.due.getHours() === h);
              const isT = isToday(d);
              return (
                <div key={i} style={{borderLeft:'1px solid var(--border)',borderBottom:'1px solid var(--border)',height:56,position:'relative',padding:3,background: isT ? 'var(--accent-soft)' : 'transparent',opacity: isT ? 0.6 : 1}}>
                  {tasksHere.map(t => (
                    <div key={t.id} onClick={()=>onOpenLead(t.leadId)} style={{
                      background:'var(--surface)',
                      border:'1px solid var(--border)',
                      borderLeft:'3px solid var(--accent)',
                      borderRadius:4,
                      padding:'3px 6px',
                      fontSize:11,
                      cursor:'pointer',
                      marginBottom:2,
                      lineHeight:1.3,
                      overflow:'hidden'
                    }}>
                      <div style={{fontWeight:500}} className="ellipsis">{t.kind}</div>
                      <div className="subtle ellipsis" style={{fontSize:10}}>{t.leadName}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
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

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <TaskGroup title="Overdue" count={overdue.length} tasks={overdue} onOpenLead={onOpenLead} tone="var(--red)"/>
      <TaskGroup title="Today" count={todayTasks.length} tasks={todayTasks} onOpenLead={onOpenLead} tone="var(--amber)"/>
      <TaskGroup title="Upcoming" count={upcoming.length} tasks={upcoming} onOpenLead={onOpenLead} tone="var(--text-muted)"/>
      <TaskGroup title="Completed" count={completed.length} tasks={completed} onOpenLead={onOpenLead} tone="var(--green)"/>
    </div>
  );
};

const TaskGroup = ({ title, count, tasks, onOpenLead, tone }) => (
  <div className="card">
    <div className="card-header">
      <div className="hstack gap-2">
        <span style={{width:8,height:8,borderRadius:'50%',background:tone}}/>
        <h3>{title}</h3>
        <span className="subtle mono tabular" style={{fontSize:12}}>{count}</span>
      </div>
    </div>
    <div>
      {tasks.slice(0, 8).map((t, i) => (
        <div key={t.id} className="hstack gap-3" style={{padding:'10px 16px',borderBottom: i === Math.min(tasks.length,8) - 1 ? 'none' : '1px solid var(--border)',cursor:'pointer'}} onClick={() => onOpenLead(t.leadId)}>
          <button style={{width:16,height:16,border:'1.5px solid var(--border-strong)',borderRadius:4,background: t.done ? 'var(--accent)' : 'transparent',display:'grid',placeItems:'center',flexShrink:0,padding:0}}
                  onClick={e => { e.stopPropagation(); store.toggleTask(t.id); }}>
            {t.done && <Icon name="check" size={10} style={{color:'white'}}/>}
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,textDecoration: t.done ? 'line-through' : 'none',color: t.done ? 'var(--text-subtle)' : 'var(--text)'}} className="ellipsis">
              {t.kind} · {t.leadName}
            </div>
            <div className="subtle ellipsis" style={{fontSize:11.5}}>{t.business}</div>
          </div>
          <span className="mono subtle" style={{fontSize:11.5,whiteSpace:'nowrap'}}>{formatTime(t.due)}</span>
        </div>
      ))}
      {tasks.length === 0 && <div style={{padding:'32px',textAlign:'center'}} className="subtle">Nothing here</div>}
    </div>
  </div>
);

const CallLogsPage = ({ onOpenLead }) => {
  const [filter, setFilter] = React.useState('all');
  const [expandedId, setExpandedId] = React.useState(null);
  const filtered = CALL_LOGS.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'connected') return c.disposition === 'Connected';
    if (filter === 'missed') return c.disposition === 'No answer' || c.disposition === 'Voicemail';
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
                    <span className="badge" style={{color: c.disposition === 'Connected' ? 'var(--green)' : c.disposition === 'No answer' ? 'var(--text-muted)' : 'var(--amber)'}}>
                      <span className="badge-dot"/>
                      {c.disposition}
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
