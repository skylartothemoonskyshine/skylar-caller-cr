// GET /api/recording-play?sid=RE... — auth-proxies a Twilio recording to
// the browser so the <audio> player can stream it without exposing credentials.

const { env, isConfigured } = require('../lib/twilio');
const https = require('https');

module.exports = async (req, res) => {
  try {
    if (!isConfigured()) {
      res.statusCode = 503;
      res.end('Twilio not configured');
      return;
    }
    const sid = (req.query && req.query.sid) || '';
    if (!/^RE[a-f0-9]{32}$/i.test(sid)) {
      res.statusCode = 400; res.end('bad sid'); return;
    }
    const accountSid = env('TWILIO_ACCOUNT_SID');
    const authToken  = env('TWILIO_AUTH_TOKEN');
    const upstream = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${sid}.mp3`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    https.get(upstream, { headers: { Authorization: `Basic ${auth}` } }, (up) => {
      // forward status + content headers, strip auth-related ones
      res.statusCode = up.statusCode || 500;
      const ct = up.headers['content-type'];
      const cl = up.headers['content-length'];
      if (ct) res.setHeader('content-type', ct);
      if (cl) res.setHeader('content-length', cl);
      res.setHeader('cache-control', 'private, max-age=3600');
      up.pipe(res);
    }).on('error', (e) => {
      console.error('[recording-play]', e);
      if (!res.headersSent) { res.statusCode = 502; res.end('upstream error'); }
    });
  } catch (e) {
    console.error('[recording-play]', e);
    res.statusCode = 500; res.end(String(e.message || e));
  }
};
