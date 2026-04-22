// GET /api/recordings-recent — returns recordings created in the last hour.
// Browser polls this periodically and attaches matching URLs to call logs
// by callSid. Stateless: works identically on localhost and Vercel.

const { client, isConfigured } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    if (!isConfigured()) {
      res.statusCode = 503;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Twilio not configured' }));
      return;
    }
    const sinceMs = Number((req.query && req.query.since) || (Date.now() - 3600 * 1000));
    const recordings = await client().recordings.list({
      dateCreatedAfter: new Date(sinceMs),
      limit: 50,
    });
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({
      recordings: recordings.map(r => ({
        sid: r.sid,
        callSid: r.callSid,
        duration: Number(r.duration || 0),
        createdAt: r.dateCreated,
        url: `/api/recording-play?sid=${r.sid}`,
      })),
      now: Date.now(),
    }));
  } catch (e) {
    console.error('[/api/recordings-recent]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
