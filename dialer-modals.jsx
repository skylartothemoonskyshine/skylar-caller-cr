// Dialer panel (Twilio Voice WebRTC) + SMS composer + Quick-log modal

// --- Twilio helper: fetch token, build Device ---
// Returns { state: 'ready'|'unconfigured'|'error', device?, error? }
async function initTwilioDevice(onError, onIncoming) {
  if (!window.Twilio || !window.Twilio.Device) {
    return { state: 'error', error: 'Twilio Voice SDK failed to load' };
  }
  try {
    const identity = (window.store?.user?.email || '').split('@')[0];
    const qs = identity ? `?identity=${encodeURIComponent(identity)}` : '';
    const r = await fetch('/api/token' + qs);
    if (r.status === 503) return { state: 'unconfigured' };
    if (!r.ok) throw new Error(`Token endpoint ${r.status}`);
    const { token } = await r.json();
    const d = new window.Twilio.Device(token, {
      logLevel: 1,
      codecPreferences: ['opus', 'pcmu'],
    });
    d.on('error', (e) => { console.error('[device error]', e); onError && onError(e.message || String(e)); });
    d.on('tokenWillExpire', async () => {
      try {
        const rr = await fetch('/api/token' + qs);
        const { token: t } = await rr.json();
        d.updateToken(t);
      } catch (e) { console.error('token refresh failed', e); }
    });
    // Handle incoming calls
    d.on('incoming', (call) => {
      console.log('[incoming call]', call.parameters.From);
      onIncoming && onIncoming(call);
    });
    return { state: 'ready', device: d };
  } catch (e) {
    console.error(e);
    return { state: 'error', error: String(e.message || e) };
  }
}

const DialerPanel = ({ lead, onClose, onLogged, onAdvance, onIncomingCall }) => {
  const [device, setDevice] = React.useState(null);
  const [call, setCall] = React.useState(null);
  const [callState, setCallState] = React.useState('preparing'); // preparing | dialing | connected | disconnected | failed | unconfigured
  const [muted, setMuted] = React.useState(false);
  const [showLog, setShowLog] = React.useState(false);
  const [showKeypad, setShowKeypad] = React.useState(false);
  const [digitsSent, setDigitsSent] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [callerNumber, setCallerNumber] = React.useState(null);
  const [, setTick] = React.useState(0); // re-render once a second while connected

  // Refs so the unmount cleanup sees the latest values (closures would stale).
  const started = React.useRef(false);
  const logSavedRef = React.useRef(false);        // set true when QuickLogModal saves
  const dispatchedRef = React.useRef(false);       // true once device.connect() resolved
  const acceptedAtRef = React.useRef(null);        // Date.now() when call connected
  const endedAtRef = React.useRef(null);           // Date.now() when call disconnected
  const callSidRef = React.useRef(null);           // Twilio CallSid for recording matching

  // Fetch which caller number will be used for this call
  React.useEffect(() => {
    (async () => {
      try {
        const identity = (window.store?.user?.email || '').split('@')[0];
        const qs = identity ? `?identity=${encodeURIComponent(identity)}` : '';
        const r = await fetch('/api/caller-number' + qs);
        if (r.ok) {
          const data = await r.json();
          setCallerNumber(data.from);
        }
      } catch (e) {
        console.error('[caller-number fetch]', e);
      }
    })();
  }, []);

  // Kick off the call once the Device is ready.
  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const result = await initTwilioDevice(setErr, onIncomingCall);
      if (result.state === 'unconfigured') { setCallState('unconfigured'); return; }
      if (result.state !== 'ready') { setCallState('failed'); setErr(result.error); return; }
      setDevice(result.device);
      try {
        setCallState('dialing');
        const c = await result.device.connect({
          params: { To: normalizePhone(lead.phone), leadId: lead.id },
        });
        dispatchedRef.current = true;
        setCall(c);
        const captureSid = () => { callSidRef.current = c.parameters?.CallSid || null; };
        c.on('accept',     () => { setCallState('connected');    acceptedAtRef.current = Date.now(); captureSid(); });
        c.on('disconnect', () => { setCallState('disconnected'); endedAtRef.current = Date.now(); captureSid(); });
        c.on('cancel',     () => { setCallState('disconnected'); endedAtRef.current = Date.now(); captureSid(); });
        c.on('reject',     () => { setCallState('disconnected'); endedAtRef.current = Date.now(); captureSid(); });
        c.on('error', (e) => { console.error('[call error]', e); setErr(e.message || String(e)); setCallState('failed'); endedAtRef.current = Date.now(); captureSid(); });
      } catch (e) {
        console.error(e);
        setErr(String(e.message || e));
        setCallState('failed');
      }
    })();
    // eslint-disable-next-line
  }, []);

  // Destroy device + hang up on unmount.
  React.useEffect(() => () => { try { device?.destroy(); } catch {} }, [device]);
  React.useEffect(() => () => { try { call?.disconnect(); } catch {} }, [call]);

  // Re-render the timer once per second while we're on the call.
  React.useEffect(() => {
    if (callState !== 'connected') return;
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, [callState]);

  // Auto-log on unmount if the user didn't already save via QuickLogModal.
  // Ensures every dispatched call leaves a row in Call Logs.
  React.useEffect(() => {
    return () => {
      if (logSavedRef.current) return;
      if (!dispatchedRef.current) return;
      const sec = acceptedAtRef.current
        ? Math.floor(((endedAtRef.current || Date.now()) - acceptedAtRef.current) / 1000)
        : 0;
      store.addCallLog({
        leadId: lead.id,
        disposition: acceptedAtRef.current ? 'Connected' : 'No answer',
        outcome: '—',
        duration: formatDurationSec(sec),
        callSid: callSidRef.current,
        snapshot: { fullName: lead.fullName, business: lead.business, phone: lead.phone },
      });
    };
    // eslint-disable-next-line
  }, []);

  const durationSec = acceptedAtRef.current
    ? Math.floor(((endedAtRef.current || Date.now()) - acceptedAtRef.current) / 1000)
    : 0;
  const mm = String(Math.floor(durationSec / 60)).padStart(2, '0');
  const ss = String(durationSec % 60).padStart(2, '0');
  const duration = `${mm}:${ss}`;

  const toggleMute = () => {
    if (!call) return;
    const next = !muted;
    try { call.mute(next); setMuted(next); } catch (e) { console.error(e); }
  };

  const sendDigit = (d) => {
    if (!call || callState !== 'connected') return;
    try { call.sendDigits(d); setDigitsSent(s => (s + d).slice(-16)); } catch (e) { console.error(e); }
  };

  React.useEffect(() => {
    if (callState !== 'connected' || !showKeypad) return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (/^[0-9*#]$/.test(e.key)) { e.preventDefault(); sendDigit(e.key); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line
  }, [callState, showKeypad, call]);

  const hangup = () => {
    try { call?.disconnect(); } catch {}
    setShowLog(true);
  };

  if (showLog) {
    return <QuickLogModal
      lead={lead}
      defaultDuration={duration}
      callSid={callSidRef.current}
      onClose={() => { setShowLog(false); onClose(); onLogged && onLogged(); }}
      onSaved={(opts) => {
        logSavedRef.current = true;  // stops the unmount effect from auto-logging again
        setShowLog(false);
        onClose();
        onLogged && onLogged();
        if (opts?.advance) onAdvance && onAdvance();
      }}
    />;
  }

  // Twilio not configured — fall back to tel: dial so the caller isn't blocked.
  if (callState === 'unconfigured') {
    return <UnconfiguredDialer lead={lead} onClose={onClose} onLog={() => setShowLog(true)}/>;
  }

  const label = callState === 'preparing' ? 'Preparing…'
              : callState === 'dialing'   ? 'Dialing…'
              : callState === 'connected' ? 'Connected'
              : callState === 'disconnected' ? 'Call ended'
              : 'Call failed';

  const dotStyle = callState === 'connected' ? 'dialer-pulse'
                 : callState === 'failed'    ? ''
                 : '';
  const dotColor = callState === 'dialing' ? 'var(--amber)'
                 : callState === 'failed' ? 'var(--red)'
                 : callState === 'disconnected' ? 'var(--text-subtle)'
                 : 'var(--green)';

  return (
    <div className="dialer">
      <div className="dialer-head">
        <div className={dotStyle} style={callState !== 'connected' ? {width:10,height:10,borderRadius:'50%',background:dotColor} : {}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:500}}>{label}</div>
          <div className="dialer-timer">{callState === 'connected' ? duration : '—:—'}</div>
        </div>
        <button className="iconbtn" onClick={onClose}><Icon name="close" size={14}/></button>
      </div>
      <div className="dialer-body">
        <div className="hstack gap-3">
          <Avatar initials={lead.initials} size={42}/>
          <div style={{flex:1,minWidth:0}}>
            <div className="dialer-name">{lead.fullName}</div>
            <div className="dialer-num">{lead.phone}</div>
            <div className="subtle ellipsis" style={{fontSize:11,marginTop:2}}>{lead.business}</div>
            {callerNumber && (
              <div className="subtle" style={{fontSize:10,marginTop:3,fontFamily:'JetBrains Mono, monospace',fontWeight:500}}>
                📞 from {callerNumber}
              </div>
            )}
          </div>
        </div>

        {err && (
          <div style={{marginTop:10,padding:'8px 10px',background:'var(--red-soft)',color:'var(--red)',fontSize:12,borderRadius:6}}>
            {err}
          </div>
        )}

        <div className="dialer-actions">
          <button className="btn" onClick={toggleMute} disabled={callState !== 'connected'} style={{opacity: callState === 'connected' ? 1 : 0.5}}>
            <Icon name={muted ? 'mic_off' : 'mic'} size={13}/>
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button className="btn" onClick={() => setShowKeypad(v => !v)} disabled={callState !== 'connected'}
                  style={{opacity: callState === 'connected' ? 1 : 0.5, background: showKeypad ? 'var(--surface-2)' : undefined}}
                  title="Send touch-tones (IVR)">
            <Icon name="grid" size={13}/> Keypad
          </button>
          <button className="btn" onClick={() => setShowLog(true)}>
            <Icon name="note" size={13}/> Log
          </button>
        </div>

        {showKeypad && (
          <div style={{marginTop:12,padding:'10px 12px',background:'var(--surface-2)',borderRadius:8}}>
            <div className="hstack" style={{justifyContent:'space-between',marginBottom:8}}>
              <div className="subtle" style={{fontSize:11}}>Tap or type 0-9 * #</div>
              <div className="mono" style={{fontSize:12,letterSpacing:1}}>{digitsSent || '—'}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:6}}>
              {['1','2','3','4','5','6','7','8','9','*','0','#'].map(d => (
                <button key={d} onClick={() => sendDigit(d)}
                        style={{padding:'12px 0',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:'JetBrains Mono, monospace'}}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="dialer-hangup" onClick={hangup}>
          <Icon name="phone_off" size={14}/>
          <span style={{marginLeft:6}}>
            {callState === 'connected' || callState === 'dialing' ? 'End call & log' : 'Close & log'}
          </span>
        </button>

        <div className="subtle" style={{fontSize:11,textAlign:'center',marginTop:10}}>
          Press <span className="kbd">L</span> to log · <span className="kbd">Esc</span> to hang up
        </div>
      </div>
    </div>
  );
};

const IncomingCallModal = ({ incomingCall, onAccept, onReject }) => {
  if (!incomingCall) return null;
  const from = incomingCall.parameters?.From || 'Unknown';
  return (
    <div className="dialer">
      <div className="dialer-head">
        <div className="dialer-pulse" style={{width:12,height:12,borderRadius:'50%',background:'var(--green)'}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:500}}>Incoming call</div>
          <div className="dialer-timer">Ringing…</div>
        </div>
      </div>
      <div className="dialer-body">
        <div className="hstack gap-3">
          <div style={{
            width:48,height:48,borderRadius:'50%',background:'var(--green-soft)',
            display:'grid',placeItems:'center',fontSize:24,fontWeight:600,color:'var(--green)'
          }}>
            📞
          </div>
          <div>
            <div className="dialer-name" style={{fontSize:18}}>{from}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Calling you now</div>
          </div>
        </div>
        <div className="dialer-actions" style={{marginTop:24}}>
          <button onClick={onAccept}
                  style={{
                    flex:1,padding:'14px',background:'var(--green)',color:'white',border:'none',
                    borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',
                    alignItems:'center',justifyContent:'center',gap:8
                  }}>
            <Icon name="phone_call" size={16}/>
            Answer
          </button>
          <button onClick={onReject}
                  style={{
                    flex:1,padding:'14px',background:'var(--red)',color:'white',border:'none',
                    borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',
                    alignItems:'center',justifyContent:'center',gap:8,marginTop:8
                  }}>
            <Icon name="phone_off" size={16}/>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

const IncomingCallActivePanel = ({ call, onClose }) => {
  const [muted, setMuted] = React.useState(false);
  const [duration, setDuration] = React.useState('0:00');
  const [, setTick] = React.useState(0);
  const startTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      setDuration(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMute = () => {
    try { call.mute(!muted); setMuted(!muted); } catch (e) { console.error(e); }
  };

  const from = call.parameters?.From || 'Incoming call';

  return (
    <div className="dialer">
      <div className="dialer-head">
        <div className="dialer-pulse" style={{width:10,height:10,borderRadius:'50%',background:'var(--green)'}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:500}}>Connected</div>
          <div className="dialer-timer">{duration}</div>
        </div>
        <button className="iconbtn" onClick={onClose}><Icon name="close" size={14}/></button>
      </div>
      <div className="dialer-body">
        <div className="hstack gap-3">
          <div style={{
            width:48,height:48,borderRadius:'50%',background:'var(--green-soft)',
            display:'grid',placeItems:'center',fontSize:24,fontWeight:600,color:'var(--green)'
          }}>
            📞
          </div>
          <div>
            <div className="dialer-name" style={{fontSize:16}}>{from}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Call in progress</div>
          </div>
        </div>

        <div className="dialer-actions">
          <button className="btn" onClick={toggleMute} style={{opacity: 1}}>
            <Icon name={muted ? 'mic_off' : 'mic'} size={13}/>
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        <button className="dialer-hangup" onClick={onClose}>
          <Icon name="phone_off" size={14}/>
          <span style={{marginLeft:6}}>End call</span>
        </button>

        <div className="subtle" style={{fontSize:11,textAlign:'center',marginTop:10}}>
          Press <span className="kbd">Esc</span> to hang up
        </div>
      </div>
    </div>
  );
};

function normalizePhone(p) {
  const s = String(p || '').replace(/[^0-9+]/g, '');
  if (!s) return '';
  if (s.startsWith('+')) return s;
  if (s.length === 10) return '+1' + s;
  if (s.length === 11 && s.startsWith('1')) return '+' + s;
  return s;
}

// Shown when Twilio isn't configured yet — keeps the caller unblocked via tel:.
const UnconfiguredDialer = ({ lead, onClose, onLog }) => {
  React.useEffect(() => {
    const a = document.createElement('a');
    a.href = `tel:${normalizePhone(lead.phone)}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [lead.phone]);

  return (
    <div className="dialer">
      <div className="dialer-head">
        <div style={{width:10,height:10,borderRadius:'50%',background:'var(--amber)'}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:500}}>Twilio not configured</div>
          <div className="dialer-timer">tel: fallback</div>
        </div>
        <button className="iconbtn" onClick={onClose}><Icon name="close" size={14}/></button>
      </div>
      <div className="dialer-body">
        <div className="hstack gap-3">
          <Avatar initials={lead.initials} size={42}/>
          <div>
            <div className="dialer-name">{lead.fullName}</div>
            <div className="dialer-num">{lead.phone}</div>
          </div>
        </div>
        <div style={{marginTop:10,padding:'10px 12px',background:'var(--amber-soft)',color:'var(--amber)',fontSize:12,borderRadius:6,lineHeight:1.4}}>
          Browser calling is off. We opened your OS dialer. See <b>SETUP.md</b> to connect Twilio for in-app calls + recording + SMS.
        </div>
        <button className="dialer-hangup" onClick={onLog} style={{background:'var(--accent)',borderColor:'var(--accent)'}}>
          <Icon name="check" size={14}/>
          <span style={{marginLeft:6}}>Log the call</span>
        </button>
      </div>
    </div>
  );
};

// --- SMS composer ---
const SMSModal = ({ lead, onClose, onSent }) => {
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [mediaFile, setMediaFile] = React.useState(null);
  const [mediaPreview, setMediaPreview] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const fileRef = React.useRef(null);
  const history = store.getMessages(lead.id);

  React.useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  };

  const send = async () => {
    if ((!body.trim() && !mediaFile) || sending || uploading) return;
    setSending(true); setErr(null);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        setUploading(true);
        mediaUrl = await store.uploadMmsMedia(mediaFile);
        setUploading(false);
      }
      const payload = { to: normalizePhone(lead.phone), body, leadId: lead.id };
      if (mediaUrl) payload.mediaUrl = [mediaUrl];
      const r = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      store.addMessage(lead.id, { direction: 'out', body, sid: data.sid, status: data.status, mediaUrl: mediaUrl || null });
      setBody('');
      clearMedia();
      onSent && onSent();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{width:520}}>
        <div className="modal-header">
          <div>
            <div style={{fontWeight:600,fontSize:14}}>SMS — {lead.fullName}</div>
            <div className="subtle mono" style={{fontSize:12,marginTop:2}}>{lead.phone}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="modal-body">
          {history.length > 0 && (
            <div style={{maxHeight:220,overflowY:'auto',marginBottom:16,padding:10,background:'var(--surface-2)',borderRadius:8}}>
              {history.map(m => (
                <div key={m.id} style={{
                  display:'flex',
                  justifyContent: m.direction === 'out' ? 'flex-end' : 'flex-start',
                  marginBottom:8
                }}>
                  <div style={{
                    maxWidth:'75%',
                    padding:'8px 11px',
                    borderRadius:10,
                    background: m.direction === 'out' ? 'var(--accent)' : 'var(--surface)',
                    color: m.direction === 'out' ? 'white' : 'var(--text)',
                    border: m.direction === 'out' ? 'none' : '1px solid var(--border)',
                    fontSize:12.5,
                    lineHeight:1.4,
                  }}>
                    {m.mediaUrl && (
                      <img src={m.mediaUrl} alt="MMS" style={{display:'block',maxWidth:'100%',maxHeight:200,borderRadius:6,marginBottom: m.body ? 6 : 0,objectFit:'contain'}}
                        onError={e => { e.currentTarget.style.display = 'none'; }}/>
                    )}
                    {m.body && <div>{m.body}</div>}
                    <div style={{fontSize:10,opacity:0.7,marginTop:4}}>{relativeString(m.at)}{m.status ? ` · ${m.status}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="input"
            autoFocus
            placeholder="Type your message… (Cmd+Enter to send)"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={onKey}
            style={{resize:'vertical',minHeight:100}}
          />
          <div className="hstack gap-2" style={{marginTop:8}}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={onFileChange}/>
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()} title="Attach image (MMS)">
              <Icon name="image" size={12}/> Image
            </button>
            {mediaFile && (
              <span className="subtle" style={{fontSize:11,flex:1}}>{mediaFile.name}</span>
            )}
            {mediaFile && (
              <button className="iconbtn" onClick={clearMedia} title="Remove image" style={{padding:'4px 6px'}}>
                <Icon name="close" size={12}/>
              </button>
            )}
          </div>
          {mediaPreview && (
            <div style={{marginTop:8}}>
              <img src={mediaPreview} alt="Preview"
                style={{maxWidth:'100%',maxHeight:180,borderRadius:8,border:'1px solid var(--border)',objectFit:'contain'}}/>
            </div>
          )}
          <div className="hstack" style={{marginTop:6,justifyContent:'space-between'}}>
            <span className="subtle" style={{fontSize:11}}>{body.length} chars · {Math.max(1, Math.ceil(body.length / 160))} segment{body.length > 160 ? 's' : ''}</span>
          </div>
          {err && (
            <div style={{marginTop:10,padding:'8px 10px',background:'var(--red-soft)',color:'var(--red)',fontSize:12,borderRadius:6}}>
              {err}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={send} disabled={(!body.trim() && !mediaFile) || sending || uploading} style={{opacity:((!body.trim() && !mediaFile) || sending || uploading) ? 0.5 : 1}}>
            {uploading ? 'Uploading…' : sending ? 'Sending…' : 'Send'} <span className="kbd">⌘⏎</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const QuickLogModal = ({ lead, defaultDuration = '2:30', callSid = null, onClose, onSaved }) => {
  // Mapping: disposition → sensible next stage. Only auto-advances if the
  // user hasn't already manually changed the stage dropdown.
  const STAGE_FOR_DISPOSITION = {
    'Connected':      'contacted',
    'No answer':      'attempted',
    'Voicemail':      'attempted',
    'Gatekeeper':     'attempted',
    'Wrong number':   'lost',
    'Not interested': 'lost',
  };

  const [disposition, setDisposition] = React.useState('Connected');
  const [outcome, setOutcome] = React.useState('');
  const [note, setNote] = React.useState('');
  const [followup, setFollowup] = React.useState('today');
  const [stage, setStage] = React.useState(STAGE_FOR_DISPOSITION['Connected']);
  const [stageTouched, setStageTouched] = React.useState(false);

  const pickDisposition = (id) => {
    setDisposition(id);
    if (!stageTouched) setStage(STAGE_FOR_DISPOSITION[id] || lead.stage);
  };

  const dispositions = [
    { id: 'Connected', color: 'var(--green)', icon: 'phone_call' },
    { id: 'No answer', color: 'var(--text-muted)', icon: 'phone_off' },
    { id: 'Voicemail', color: 'var(--amber)', icon: 'mic' },
    { id: 'Gatekeeper', color: 'var(--violet)', icon: 'user' },
    { id: 'Wrong number', color: 'var(--red)', icon: 'close' },
    { id: 'Not interested', color: 'var(--red)', icon: 'close' },
  ];

  const followups = [
    { id: 'none', label: 'No follow-up' },
    { id: 'today', label: 'Today' },
    { id: '1d', label: 'Tomorrow' },
    { id: '3d', label: 'In 3 days' },
    { id: '1w', label: 'Next week' },
  ];

  const save = () => {
    store.addCallLog({
      leadId: lead.id,
      disposition,
      outcome,
      duration: defaultDuration,
      note,
      callSid,
      snapshot: { fullName: lead.fullName, business: lead.business, phone: lead.phone },
    });
    if (stage !== lead.stage) store.updateLead(lead.id, { stage });
    if (followup !== 'none') {
      const due = new Date();
      if (followup !== 'today') {
        const offset = followup === '1d' ? 1 : followup === '3d' ? 3 : 7;
        due.setDate(due.getDate() + offset);
        due.setHours(10, 0, 0, 0);
      }
      store.setTask(lead.id, due, 'Call follow-up');
    }
    if (onSaved) onSaved({ advance: false });
    else onClose();
  };

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save(); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={onKey}>
      <div className="modal" style={{width:580}}>
        <div className="modal-header">
          <div>
            <div style={{fontWeight:600,fontSize:14}}>Log call — {lead.fullName}</div>
            <div className="subtle" style={{fontSize:12,marginTop:2}}>{lead.business} · <span className="mono">{defaultDuration}</span></div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="tweak-row" style={{marginBottom:16}}>
            <div className="tweak-label">Disposition</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:6}}>
              {dispositions.map(d => (
                <button key={d.id} className="btn btn-sm" onClick={() => pickDisposition(d.id)}
                  style={{
                    justifyContent:'flex-start',
                    borderColor: disposition === d.id ? d.color : 'var(--border)',
                    background: disposition === d.id ? 'var(--surface-2)' : 'var(--surface)',
                    color: disposition === d.id ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: disposition === d.id ? 600 : 500
                  }}>
                  <Icon name={d.icon} size={12} style={{color: d.color}}/>
                  {d.id}
                </button>
              ))}
            </div>
          </div>

          <div className="tweak-row" style={{marginBottom:16}}>
            <div className="tweak-label">Outcome</div>
            <input className="input" placeholder="e.g. Asked to call back Thursday"
              value={outcome} onChange={e => setOutcome(e.target.value)}/>
          </div>

          <div className="tweak-row" style={{marginBottom:16}}>
            <div className="tweak-label">Quick note</div>
            <textarea className="input" placeholder="Anything important from the call…"
              value={note} onChange={e => setNote(e.target.value)}
              style={{resize:'vertical',minHeight:70}}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div className="tweak-row">
              <div className="tweak-label">Move to stage</div>
              <select className="input" value={stage} onChange={e => { setStage(e.target.value); setStageTouched(true); }}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="tweak-row">
              <div className="tweak-label">Next follow-up</div>
              <div className="hstack gap-1" style={{flexWrap:'wrap'}}>
                {followups.map(f => (
                  <button key={f.id} className="btn btn-sm" onClick={() => setFollowup(f.id)}
                    style={{
                      borderColor: followup === f.id ? 'var(--accent)' : 'var(--border)',
                      background: followup === f.id ? 'var(--accent-soft)' : 'var(--surface)',
                      color: followup === f.id ? 'var(--accent)' : 'var(--text-muted)'
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            Save <span className="kbd">⌘⏎</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Command palette
const CommandPalette = ({ onClose, onNav, onOpenLead }) => {
  const [q, setQ] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current && ref.current.focus(); }, []);

  const commands = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: 'home', action: () => onNav('dashboard') },
    { id: 'nav-phone', label: 'Go to Phone / Dialpad', icon: 'phone_call', action: () => onNav('phone') },
    { id: 'nav-leads', label: 'Go to Leads', icon: 'users', action: () => onNav('leads') },
    { id: 'nav-pipeline', label: 'Go to Pipeline', icon: 'columns', action: () => onNav('pipeline') },
    { id: 'nav-calendar', label: 'Go to Calendar', icon: 'calendar', action: () => onNav('calendar') },
    { id: 'nav-tasks', label: 'Go to Tasks', icon: 'check_square', action: () => onNav('tasks') },
    { id: 'nav-calls', label: 'Go to Call logs', icon: 'history', action: () => onNav('calls') },
  ];
  const leadResults = store.visibleLeads().filter(l => !q || l.fullName.toLowerCase().includes(q.toLowerCase()) || (l.business || '').toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  const cmdResults = commands.filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{width:560,marginTop:-80}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
          <Icon name="search" size={14} style={{color:'var(--text-subtle)'}}/>
          <input ref={ref} className="input" style={{border:'none',padding:0,fontSize:14,background:'transparent'}}
            placeholder="Search leads, run a command…" value={q} onChange={e => setQ(e.target.value)}/>
          <span className="kbd">esc</span>
        </div>
        <div style={{maxHeight:400,overflowY:'auto',padding:'6px 0'}}>
          {leadResults.length > 0 && <>
            <div className="subtle" style={{padding:'6px 16px',fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:500}}>Leads</div>
            {leadResults.map(l => (
              <button key={l.id} className="nav-item" style={{borderRadius:0,padding:'8px 16px'}} onClick={() => { onOpenLead(l.id); onClose(); }}>
                <Avatar initials={l.initials} size={20}/>
                <span style={{fontSize:13}}>{l.fullName}</span>
                <span className="subtle" style={{fontSize:12}}>· {l.business}</span>
                <StagePill stageId={l.stage}/>
              </button>
            ))}
          </>}
          <div className="subtle" style={{padding:'8px 16px 4px',fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:500}}>Commands</div>
          {cmdResults.map(c => (
            <button key={c.id} className="nav-item" style={{borderRadius:0,padding:'8px 16px'}} onClick={() => { c.action(); onClose(); }}>
              <Icon name={c.icon} className="icon"/>
              <span style={{fontSize:13}}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { DialerPanel, QuickLogModal, CommandPalette, SMSModal, IncomingCallModal, IncomingCallActivePanel, normalizePhone });
