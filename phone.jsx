// Standalone Phone page — 12-key dialpad, recent calls, ad-hoc SMS.
// Callers use this to dial numbers that aren't attached to a lead.

const KEYS = [
  ['1',''], ['2','ABC'], ['3','DEF'],
  ['4','GHI'], ['5','JKL'], ['6','MNO'],
  ['7','PQRS'], ['8','TUV'], ['9','WXYZ'],
  ['*',''], ['0','+'], ['#',''],
];

function formatDialed(s) {
  // Pretty-format while typing US numbers; leave + prefixed alone.
  const raw = String(s || '');
  if (raw.startsWith('+')) return raw;
  const d = raw.replace(/\D/g, '');
  if (d.length === 0) return '';
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  if (d.length <= 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return `+${d.slice(0, d.length-10)} (${d.slice(-10,-7)}) ${d.slice(-7,-4)}-${d.slice(-4)}`;
}

const PhonePage = ({ onCall, onSMS, onOpenLead }) => {
  const [dial, setDial] = React.useState('');
  const pretty = formatDialed(dial);

  const push = (k) => setDial(d => (d + k).slice(0, 20));
  const back = () => setDial(d => d.slice(0, -1));
  const clear = () => setDial('');

  // resolve: if the dialed number matches a lead's phone, use that lead; else ad-hoc.
  // Ad-hoc ids are stable per normalized phone so repeated dials share SMS history.
  const resolveTarget = () => {
    const normalized = normalizePhone(dial);
    const match = LEADS.find(l => normalizePhone(l.phone) === normalized);
    if (match) return match;
    return {
      id: `adhoc-${normalized || dial}`,
      fullName: pretty || 'Unknown',
      initials: '?',
      phone: dial,
      business: 'Ad-hoc',
      stage: 'new',
    };
  };

  const doCall = () => {
    if (!dial.trim()) return;
    onCall(resolveTarget());
  };
  const doSMS = () => {
    if (!dial.trim()) return;
    onSMS(resolveTarget());
  };

  // keyboard input: 0-9, *, #, Backspace, Enter
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (/^[0-9*#+]$/.test(e.key)) { push(e.key); return; }
      if (e.key === 'Backspace') { back(); return; }
      if (e.key === 'Enter') { doCall(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dial]);

  const recent = CALL_LOGS.slice(0, 10);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-title">Phone</div>
          <div className="page-header-sub">Dial a number · view recent calls · send SMS</div>
        </div>
        <TwilioStatusPill/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(320px, 420px) 1fr',gap:24,alignItems:'flex-start'}}>
        {/* dialpad card */}
        <div className="card" style={{padding:24}}>
          <div style={{
            height:72,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            fontFamily:'var(--font-mono)',
            fontSize: dial.length > 12 ? 20 : 28,
            fontWeight:500,
            letterSpacing:'-0.02em',
            color: dial ? 'var(--text)' : 'var(--text-subtle)',
            borderBottom:'1px solid var(--border)',
            marginBottom:20,
          }}>
            {pretty || 'Enter a number'}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:10,marginBottom:16}}>
            {KEYS.map(([k, sub]) => (
              <button key={k} className="dialkey" onClick={() => push(k === '0' && false ? '+' : k)}
                      onDoubleClick={() => { if (k === '0') setDial(d => d + '+'); }}
                      style={{
                        height:58,
                        borderRadius:12,
                        background:'var(--surface)',
                        border:'1px solid var(--border)',
                        fontSize:24,
                        fontWeight:400,
                        transition:'all 0.08s',
                        display:'flex',
                        flexDirection:'column',
                        alignItems:'center',
                        justifyContent:'center',
                        gap:0,
                      }}
                      onMouseDown={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseUp={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                <span style={{lineHeight:1}}>{k}</span>
                {sub && <span style={{fontSize:9,letterSpacing:'0.1em',color:'var(--text-subtle)',fontWeight:500,marginTop:1}}>{sub}</span>}
              </button>
            ))}
          </div>

          <div className="hstack gap-2" style={{marginBottom:12}}>
            <button className="btn" onClick={back} disabled={!dial} style={{flex:1,justifyContent:'center',padding:'10px'}}>
              <Icon name="close" size={14}/> Back
            </button>
            <button className="btn" onClick={clear} disabled={!dial} style={{flex:1,justifyContent:'center',padding:'10px'}}>
              Clear
            </button>
          </div>

          <button onClick={doCall} disabled={!dial}
                  style={{
                    width:'100%',
                    padding:'14px',
                    background: dial ? 'var(--green)' : 'var(--surface-2)',
                    color: dial ? 'white' : 'var(--text-subtle)',
                    border:'none',
                    borderRadius:12,
                    fontSize:15,
                    fontWeight:600,
                    cursor: dial ? 'pointer' : 'not-allowed',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:8,
                    transition:'all 0.1s',
                  }}>
            <Icon name="phone_call" size={16}/>
            Call {pretty}
          </button>

          <button onClick={doSMS} disabled={!dial}
                  className="btn" style={{width:'100%',justifyContent:'center',marginTop:8,padding:'10px'}}>
            <Icon name="message" size={14}/> Send SMS
          </button>

          <div className="subtle" style={{fontSize:11,textAlign:'center',marginTop:12}}>
            Type on your keyboard or tap the keys · <span className="kbd">Enter</span> to call
          </div>
        </div>

        {/* recent calls */}
        <div className="vstack gap-4">
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Recent calls</h3>
                <div className="card-sub">{CALL_LOGS.length} total · click to redial</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onOpenLead && onOpenLead('_calls')}>
                All calls <Icon name="arrow_right" size={12}/>
              </button>
            </div>
            <div>
              {recent.length === 0 && (
                <div className="subtle" style={{padding:32,textAlign:'center',fontSize:13}}>
                  No calls yet. Dial a number to get started.
                </div>
              )}
              {recent.map((c, i) => (
                <PhoneRecentRow key={c.id} call={c} last={i===recent.length-1} onDial={() => setDial(c.phone.replace(/[^0-9+]/g,''))} onOpenLead={onOpenLead}/>
              ))}
            </div>
          </div>

          {/* SMS quick send hint */}
          <div className="card subtle" style={{padding:16,fontSize:12,lineHeight:1.5}}>
            <div className="hstack gap-2" style={{marginBottom:6}}>
              <Icon name="message" size={13} style={{color:'var(--accent)'}}/>
              <span style={{fontWeight:500,color:'var(--text)',fontSize:12.5}}>Tip</span>
            </div>
            To SMS a lead with their full history, open the lead and use the SMS tab. The dialpad SMS is for quick one-offs.
          </div>
        </div>
      </div>
    </div>
  );
};

const PhoneRecentRow = ({ call: c, last, onDial, onOpenLead }) => {
  const [playing, setPlaying] = React.useState(false);
  const borderBottom = last ? 'none' : '1px solid var(--border)';
  return (
    <div style={{borderBottom}}>
      <div className="hstack gap-3" style={{padding:'12px 18px',cursor:'pointer'}} onClick={onDial}>
        <div style={{
          width:32,height:32,borderRadius:'50%',
          background: c.disposition === 'Connected' ? 'var(--green-soft)' : c.disposition === 'No answer' || c.disposition === 'Voicemail' ? 'var(--surface-2)' : 'var(--amber-soft)',
          color: c.disposition === 'Connected' ? 'var(--green)' : c.disposition === 'No answer' ? 'var(--text-muted)' : 'var(--amber)',
          display:'grid',placeItems:'center',flexShrink:0,
        }}>
          <Icon name={c.disposition === 'No answer' ? 'phone_off' : 'phone_call'} size={13}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:500,fontSize:13}} className="ellipsis">{c.leadName}</div>
          <div className="subtle mono" style={{fontSize:11.5}}>{c.phone}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div className="mono" style={{fontSize:12}}>{c.duration}</div>
          <div className="subtle" style={{fontSize:11}}>{relativeString(c.at)}</div>
        </div>
        {c.recordingUrl && (
          <button className="iconbtn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }} title={playing ? 'Hide player' : 'Play recording'}
                  style={{color: playing ? 'var(--text-muted)' : 'var(--green)'}}>
            <Icon name={playing ? 'close' : 'phone_call'} size={13}/>
          </button>
        )}
        {c.leadId && (
          <button className="iconbtn" onClick={e => { e.stopPropagation(); onOpenLead(c.leadId); }} title="Open lead">
            <Icon name="arrow_right" size={13}/>
          </button>
        )}
      </div>
      {playing && c.recordingUrl && (
        <div style={{padding:'0 18px 12px 62px'}}>
          <audio controls autoPlay src={c.recordingUrl} style={{width:'100%',height:32}}/>
        </div>
      )}
    </div>
  );
};

// Twilio status pill — pings /api/token on mount and polls every 30s.
const TwilioStatusPill = () => {
  const [state, setState] = React.useState('checking'); // checking | connected | unconfigured | error
  const [details, setDetails] = React.useState(null);

  const check = React.useCallback(async () => {
    try {
      const r = await fetch('/api/token');
      if (r.status === 503) { setState('unconfigured'); return; }
      if (!r.ok) { setState('error'); return; }
      const data = await r.json();
      setDetails(data);
      setState('connected');
    } catch {
      setState('error');
    }
  }, []);

  React.useEffect(() => {
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, [check]);

  const cfg = {
    checking:     { dot: 'var(--text-subtle)', label: 'Checking Twilio…',     color: 'var(--text-muted)' },
    connected:    { dot: 'var(--green)',       label: 'Twilio connected',    color: 'var(--green)' },
    unconfigured: { dot: 'var(--amber)',       label: 'Twilio not configured', color: 'var(--amber)' },
    error:        { dot: 'var(--red)',         label: 'Twilio error',         color: 'var(--red)' },
  }[state];

  return (
    <div className="badge" style={{gap:6,padding:'4px 10px',fontSize:11.5,borderColor: state === 'unconfigured' ? 'var(--amber)' : 'var(--border)'}}
         title={state === 'unconfigured' ? 'See SETUP.md to connect Twilio' : state === 'connected' ? `Identity: ${details?.identity || ''}` : ''}>
      <span style={{width:6,height:6,borderRadius:'50%',background:cfg.dot}}/>
      <span style={{color:cfg.color,fontWeight:500}}>{cfg.label}</span>
    </div>
  );
};

Object.assign(window, { PhonePage, TwilioStatusPill, formatDialed });
