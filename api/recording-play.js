// GET /api/recording-play?sid=RE... OR ?callSid=CA...
// Auth-proxies a Twilio recording to the browser so <audio> can stream it
// without exposing credentials. When given callSid, looks up the first
// recording for that call via Twilio REST — this makes playback work even
// when the recordingStatusCallback webhook didn't fire.

const { env, isConfigured, client } = require('../lib/twilio');
const https = require('https');

function streamMp3(sid, res) {
  const accountSid = env('TWILIO_ACCOUNT_SID');
  const authToken  = env('TWILIO_AUTH_TOKEN');
  const upstream = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${sid}.mp3`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  https.get(upstream, { headers: { Authorization: `Basic ${auth}` } }, (up) => {
    res.statusCode = up.statusCode || 500;
    const ct = up.headers['content-type'];
    const cl = up.headers['content-length'];
    if (ct) res.setHeader('content-type', ct);
    if (cl) res.setHeader('content-length', cl);
    res.setHeader('cache-control', 'private, max-age=3600');
    up.pipe(res);
  }).on('error', (e) => {
    console.error('[recording-play] upstream', e);
    if (!res.headersSent) { res.statusCode = 502; res.end('upstream error'); }
  });
}

module.exports = async (req, res) => {
  try {
    if (!isConfigured()) {
      res.statusCode = 503;
      res.end('Twilio not configured');
      return;
    }

    const q = req.query || {};
    const sid = (q.sid || '').trim();
    const callSid = (q.callSid || '').trim();

    if (sid) {
      if (!/^RE[a-f0-9]{32}$/i.test(sid)) {
        res.statusCode = 400; res.end('bad sid'); return;
      }
      return streamMp3(sid, res);
    }

    if (callSid) {
      if (!/^CA[a-f0-9]{32}$/i.test(callSid)) {
        res.statusCode = 400; res.end('bad callSid'); return;
      }
      // The browser leg is the parent; Twilio records the <Dial> child leg.
      // Fetch recordings for both the parent call and its children.
      const tw = client();
      let recs = await tw.recordings.list({ callSid, limit: 1 });
      if (!recs || !recs.length) {
        // Fallback: iterate child calls dialed from this parent.
        const children = await tw.calls.list({ parentCallSid: callSid, limit: 5 });
        for (const c of children) {
          recs = await tw.recordings.list({ callSid: c.sid, limit: 1 });
          if (recs && recs.length) break;
        }
      }
      if (!recs || !recs.length) {
        res.statusCode = 404; res.end('no recording for call'); return;
      }
      return streamMp3(recs[0].sid, res);
    }

    res.statusCode = 400;
    res.end('missing sid or callSid');
  } catch (e) {
    console.error('[recording-play]', e);
    res.statusCode = 500; res.end(String(e.message || e));
  }
};
