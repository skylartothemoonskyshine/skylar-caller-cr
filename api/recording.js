// POST /api/recording — Twilio posts here when a recording completes.
// Writes the recording onto the matching call_logs row (by call_sid). If the
// browser hasn't saved its log yet, inserts a minimal stub row that the
// browser-side addCallLog will later see via realtime / refresh.
// Also keeps the SSE stream so already-connected browsers update instantly.

const { admin, isConfigured: sbConfigured } = require('../lib/supabase');

const subscribers = new Set();
const recent = []; // [{ leadId, recordingSid, url, duration, at }]

function broadcast(evt) {
  const line = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of subscribers) {
    try { res.write(line); } catch {}
  }
}

async function persist(evt) {
  if (!sbConfigured()) {
    console.warn('[/api/recording] Supabase not configured — skipping DB write');
    return;
  }
  if (!evt.callSid) {
    console.warn('[/api/recording] no CallSid on event — cannot match call_log');
    return;
  }
  const sb = admin();
  const patch = {
    recording_sid: evt.recordingSid,
    recording_url: evt.url,
  };
  if (evt.duration) patch.duration = String(evt.duration);

  const upd = await sb.from('call_logs').update(patch).eq('call_sid', evt.callSid).select('id');
  if (upd.error) {
    console.error('[/api/recording] update call_logs failed', upd.error);
    return;
  }
  if (upd.data && upd.data.length) return;

  const ins = await sb.from('call_logs').insert({
    call_sid: evt.callSid,
    recording_sid: evt.recordingSid,
    recording_url: evt.url,
    duration: evt.duration ? String(evt.duration) : null,
    lead_id: evt.leadId || null,
    at: evt.at,
  });
  if (ins.error) console.error('[/api/recording] insert call_logs stub failed', ins.error);
}

async function handler(req, res) {
  const url = (req.url || '').split('?')[0];

  // SSE stream for the browser to receive recording completions live.
  if (req.method === 'GET' && url.endsWith('/stream')) {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    // flush recent on connect
    for (const r of recent.slice(-5)) res.write(`data: ${JSON.stringify(r)}\n\n`);
    subscribers.add(res);
    req.on('close', () => subscribers.delete(res));
    return;
  }

  // Twilio's recordingStatusCallback POST
  try {
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const evt = {
      leadId: params.leadId || null,
      recordingSid: params.RecordingSid,
      callSid: params.CallSid || null,
      url: params.RecordingUrl ? `${params.RecordingUrl}.mp3` : null,
      duration: params.RecordingDuration,
      channels: params.RecordingChannels,
      at: new Date().toISOString(),
    };
    if (evt.recordingSid) {
      recent.push(evt);
      if (recent.length > 50) recent.shift();
      broadcast(evt);
      console.log('[/api/recording] completed:', evt.recordingSid, evt.url);
      await persist(evt);
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain');
    res.end('ok');
  } catch (e) {
    console.error('[/api/recording]', e);
    res.statusCode = 500;
    res.end('error');
  }
}

module.exports = handler;
