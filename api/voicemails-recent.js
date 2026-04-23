// GET /api/voicemails-recent — lists inbound calls in the last 24h (or ?since=<ms>)
// along with any recording (the voicemail). Browser polls this (owner only)
// and creates call_logs rows for each new one.

const { client, isConfigured } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    if (!isConfigured()) {
      res.statusCode = 503;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Twilio not configured' }));
      return;
    }
    const sinceMs = Number((req.query && req.query.since) || (Date.now() - 24 * 3600 * 1000));

    const calls = await client().calls.list({
      startTimeAfter: new Date(sinceMs),
      limit: 100,
    });
    const inbound = calls.filter(c => c.direction === 'inbound');

    const voicemails = [];
    for (const c of inbound) {
      const recs = await client().recordings.list({ callSid: c.sid, limit: 5 });
      const rec = recs[0] || null;
      voicemails.push({
        callSid: c.sid,
        from: c.from,
        to: c.to,
        startTime: c.startTime,
        duration: Number((rec && rec.duration) || c.duration || 0),
        callStatus: c.status,
        recordingSid: rec ? rec.sid : null,
        recordingUrl: rec ? `/api/recording-play?sid=${rec.sid}` : null,
      });
    }

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ voicemails, now: Date.now() }));
  } catch (e) {
    console.error('[/api/voicemails-recent]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
