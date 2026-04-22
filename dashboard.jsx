// Dashboard page — two variations (caller cockpit + manager overview)

const StatCard = ({ label, value, sub, tone, icon }) => (
  <div className="card" style={{padding:'16px 18px'}}>
    <div className="hstack gap-2" style={{justifyContent:'space-between'}}>
      <div className="subtle" style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500}}>{label}</div>
      {icon && <Icon name={icon} size={14} style={{color: tone || 'var(--text-subtle)'}}/>}
    </div>
    <div style={{fontSize:28,fontWeight:600,letterSpacing:'-0.025em',marginTop:6,fontVariantNumeric:'tabular-nums'}}>{value}</div>
    {sub && <div className="subtle" style={{fontSize:12,marginTop:2}}>{sub}</div>}
  </div>
);

// Variation A — Caller Cockpit (single-minded: who to call next)
const DashboardCaller = ({ onNav, onCall, onOpenLead }) => {
  const queue = store.visibleLeads()
    .filter(l => ['new','attempted','followup','contacted','interested'].includes(l.stage))
    .slice(0, 8);
  const dueToday = TASKS.filter(t => !t.done && isToday(t.due)).slice(0, 6);
  const nowLead = queue[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-title">Good morning, Derek</div>
          <div className="page-header-sub">12 calls to make today · 4 follow-ups due · 2 booked meetings this week</div>
        </div>
        <div className="hstack gap-2">
          <div className="seg">
            <button className="active">My day</button>
            <button>This week</button>
          </div>
        </div>
      </div>

      {/* Call next hero */}
      {nowLead ? (
        <div className="card card-lg" style={{padding:'24px',marginBottom:20,background:'linear-gradient(135deg, var(--surface), var(--surface-2))',borderColor:'var(--border)'}}>
          <div className="hstack gap-4" style={{alignItems:'flex-start'}}>
            <div style={{width:56,height:56,borderRadius:12,background:'var(--accent)',color:'white',display:'grid',placeItems:'center',fontWeight:600,fontSize:20,flexShrink:0}}>
              {nowLead.initials}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="hstack gap-2" style={{marginBottom:6}}>
                <span className="subtle" style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:500}}>Call next</span>
                <StagePill stageId={nowLead.stage}/>
                <span className="badge" style={{color:'var(--amber)'}}>
                  <Icon name="clock" size={11}/> Due today
                </span>
              </div>
              <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.02em'}}>{nowLead.fullName}</div>
              <div className="muted" style={{fontSize:13,marginTop:2}}>{nowLead.business} · {nowLead.location}</div>
              <div className="hstack gap-4" style={{marginTop:10,fontSize:12}}>
                <span className="muted hstack gap-1"><Icon name="phone" size={12}/> <span className="mono">{nowLead.phone}</span></span>
                <span className="muted hstack gap-1"><Icon name="history" size={12}/> Last called 2 days ago</span>
                <span className="muted hstack gap-1"><Icon name="note" size={12}/> 3 notes</span>
              </div>
            </div>
            <div className="hstack gap-2">
              <button className="btn" onClick={() => onOpenLead(nowLead.id)}>
                View lead <span className="kbd">⏎</span>
              </button>
              <button className="btn btn-primary" onClick={() => onCall(nowLead)} style={{padding:'8px 14px'}}>
                <Icon name="phone_call" size={14}/>
                Call now <span className="kbd">C</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card card-lg" style={{padding:'24px',marginBottom:20,textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:600}}>No leads yet</div>
          <div className="subtle" style={{fontSize:12,marginTop:6}}>Import a CSV or click “New lead” (top-right) to start calling.</div>
          <button className="btn btn-primary" style={{marginTop:14}} onClick={() => onNav('leads')}>
            <Icon name="plus" size={13}/> Add your first lead
          </button>
        </div>
      )}

      {/* 3 stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12,marginBottom:24}}>
        <StatCard label="Calls today" value="8" sub="of 30 target" icon="phone" tone="var(--accent)"/>
        <StatCard label="Connected" value="3" sub="38% connect rate" icon="phone_call" tone="var(--green)"/>
        <StatCard label="Booked" value="1" sub="+1 from yesterday" icon="calendar_check" tone="var(--violet)"/>
        <StatCard label="Follow-ups due" value="4" sub="2 overdue" icon="clock" tone="var(--amber)"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:20}}>
        {/* Call queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Call queue</h3>
              <div className="card-sub">{queue.length} leads · prioritized by stage and follow-up date</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('leads')}>Open all <Icon name="arrow_right" size={12}/></button>
          </div>
          <div>
            {queue.map((l, i) => (
              <div key={l.id} className="hstack gap-3" style={{padding:'10px 18px',borderBottom:i === queue.length-1 ? 'none' : '1px solid var(--border)',cursor:'pointer'}}
                   onClick={() => onOpenLead(l.id)}>
                <div className="subtle mono" style={{fontSize:11,width:16,textAlign:'right'}}>{i+1}</div>
                <Avatar initials={l.initials} size={28}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:13}}>{l.fullName}</div>
                  <div className="subtle ellipsis" style={{fontSize:11.5}}>{l.business} · {l.location}</div>
                </div>
                <StagePill stageId={l.stage}/>
                <div className="mono subtle" style={{fontSize:11.5,width:100,textAlign:'right'}}>{l.phone}</div>
                <button className="btn btn-sm" onClick={e => {e.stopPropagation(); onCall(l);}}>
                  <Icon name="phone" size={12}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Today's tasks */}
        <div className="card">
          <div className="card-header">
            <h3>Due today</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('tasks')}>All tasks <Icon name="arrow_right" size={12}/></button>
          </div>
          <div>
            {dueToday.map((t, i) => (
              <div key={t.id} className="hstack gap-3" style={{padding:'10px 18px',borderBottom:i === dueToday.length-1 ? 'none' : '1px solid var(--border)'}}>
                <div className="iconbtn" style={{width:18,height:18,border:'1.5px solid var(--border-strong)',borderRadius:4,padding:0}}></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13}} className="ellipsis"><span style={{fontWeight:500}}>{t.kind}</span> · <span className="muted">{t.leadName}</span></div>
                  <div className="subtle" style={{fontSize:11.5}}>{t.business}</div>
                </div>
                <span className="mono subtle" style={{fontSize:11.5}}>{formatTime(t.due)}</span>
              </div>
            ))}
            {dueToday.length === 0 && <div style={{padding:'32px',textAlign:'center'}} className="subtle">Nothing due today 🎉</div>}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card" style={{marginTop:20}}>
        <div className="card-header">
          <h3>Recent calls</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onNav('calls')}>All calls <Icon name="arrow_right" size={12}/></button>
        </div>
        <div>
          {CALL_LOGS.slice(0, 5).map((c, i) => (
            <div key={c.id} className="hstack gap-3" style={{padding:'10px 18px',borderBottom:i === 4 ? 'none' : '1px solid var(--border)'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background: c.disposition === 'Connected' ? 'var(--green-soft)' : c.disposition === 'No answer' ? 'var(--surface-2)' : 'var(--amber-soft)',
                           color: c.disposition === 'Connected' ? 'var(--green)' : c.disposition === 'No answer' ? 'var(--text-muted)' : 'var(--amber)',
                           display:'grid',placeItems:'center'}}>
                <Icon name={c.disposition === 'No answer' ? 'phone_off' : 'phone_call'} size={12}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500}}>{c.leadName}</div>
                <div className="subtle" style={{fontSize:11.5}}>{c.business}</div>
              </div>
              <span className="badge">{c.disposition}</span>
              <span className="mono subtle" style={{fontSize:11.5,width:50,textAlign:'right'}}>{c.duration}</span>
              <span className="subtle" style={{fontSize:11.5,width:60,textAlign:'right'}}>{relativeString(c.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Variation B — Manager overview (metrics-first)
const DashboardManager = ({ onNav, onOpenLead }) => {
  const stageCounts = STAGES.map(s => ({
    ...s,
    count: LEADS.filter(l => l.stage === s.id).length
  }));
  const totalActive = LEADS.filter(l => !['won','lost'].includes(l.stage)).length;
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-title">Team overview</div>
          <div className="page-header-sub">Derek & Amelia · Last 7 days</div>
        </div>
        <div className="seg">
          <button>24h</button>
          <button className="active">7d</button>
          <button>30d</button>
          <button>QTD</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12,marginBottom:24}}>
        <StatCard label="Active leads" value={totalActive} sub="+4 this week" icon="users" tone="var(--accent)"/>
        <StatCard label="Calls made" value="124" sub="38 connected · 31%" icon="phone" tone="var(--green)"/>
        <StatCard label="Meetings booked" value="7" sub="of 10 goal" icon="calendar_check" tone="var(--violet)"/>
        <StatCard label="Closed won" value="2" sub="$18,400 value" icon="target" tone="var(--amber)"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:20}}>
        {/* Pipeline snapshot */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Pipeline snapshot</h3>
              <div className="card-sub">{totalActive} active leads across stages</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('pipeline')}>Open pipeline <Icon name="arrow_right" size={12}/></button>
          </div>
          <div style={{padding:'18px'}}>
            {stageCounts.map(s => (
              <div key={s.id} className="hstack gap-3" style={{padding:'6px 0'}}>
                <div style={{width:110}} className={'hstack gap-2'}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',color: `var(--stage-${s.id})`}}/>
                  <span style={{fontSize:12.5,fontWeight:500}}>{s.label}</span>
                </div>
                <div style={{flex:1,height:8,background:'var(--surface-2)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{width: `${(s.count / maxCount) * 100}%`, height:'100%', background:`var(--stage-${s.id})`, opacity:0.8}}/>
                </div>
                <div className="mono tabular" style={{width:28,textAlign:'right',fontSize:12}}>{s.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team performance */}
        <div className="card">
          <div className="card-header">
            <h3>Team performance</h3>
          </div>
          <div>
            {REPS.map((r, i) => {
              const calls = r.id === 'u1' ? 98 : 26;
              const booked = r.id === 'u1' ? 6 : 1;
              const owned = LEADS.filter(l => l.ownerId === r.id).length;
              return (
                <div key={r.id} style={{padding:'14px 18px',borderBottom:i===REPS.length-1?'none':'1px solid var(--border)'}}>
                  <div className="hstack gap-3">
                    <Avatar initials={r.initials} size={32}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500,fontSize:13}}>{r.name}</div>
                      <div className="subtle" style={{fontSize:11.5}}>{r.role} · {owned} leads</div>
                    </div>
                    <div className="hstack gap-4">
                      <div style={{textAlign:'right'}}>
                        <div className="mono tabular" style={{fontSize:14,fontWeight:600}}>{calls}</div>
                        <div className="subtle" style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>Calls</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div className="mono tabular" style={{fontSize:14,fontWeight:600,color:'var(--green)'}}>{booked}</div>
                        <div className="subtle" style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>Booked</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Needs attention */}
      <div className="card" style={{marginTop:20}}>
        <div className="card-header">
          <div>
            <h3>Needs attention</h3>
            <div className="card-sub">Leads with no call in 7+ days, or overdue follow-ups</div>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Business</th>
              <th>Stage</th>
              <th>Owner</th>
              <th>Last call</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {LEADS.filter(l => l.lastCallAt && (new Date() - l.lastCallAt) / 86400000 > 6).slice(0, 5).map(l => (
              <tr key={l.id} onClick={() => onOpenLead(l.id)}>
                <td><div className="hstack gap-2"><Avatar initials={l.initials} size={22}/><span style={{fontWeight:500}}>{l.fullName}</span></div></td>
                <td className="muted">{l.business}</td>
                <td><StagePill stageId={l.stage}/></td>
                <td><span className="hstack gap-2"><Avatar initials={l.ownerInitials} size={18}/><span className="muted">{l.ownerName.split(' ')[0]}</span></span></td>
                <td className="muted">{relativeString(l.lastCallAt)}</td>
                <td>{l.nextFollowupAt ? <span className="badge" style={{color:'var(--amber)'}}>{relativeString(l.nextFollowupAt)}</span> : <span className="subtle">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function isToday(d) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

Object.assign(window, { DashboardCaller, DashboardManager, StatCard, isToday });
