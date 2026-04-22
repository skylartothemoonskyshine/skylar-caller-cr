// POST /api/recording — Twilio posts here when a recording completes.
// We log it to the server console and push it to any connected browser via
// a lightweight event stream (GET /api/recording/stream). In the static
// prototype we don't have a DB, so recordings are discoverable by polling
// this endpoint for the last few completed recordings.

const subscribers = new Set();
const recent = []; // [{ leadId, recordingSid, url, duration, at }]

function broadcast(evt) {
  const line = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of subscribers) {
    try { res.write(line); } catch {}
  }
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
