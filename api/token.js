// GET /api/token — mints a short-lived Twilio Voice SDK access token.
// The Voice SDK in the browser uses this to register Twilio.Device.

const { mintVoiceToken, isConfigured } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    if (!isConfigured()) {
      res.statusCode = 503;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Twilio not configured. See .env.example.' }));
      return;
    }
    const identity = (req.query && req.query.identity) || undefined;
    const token = mintVoiceToken(identity);
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ token, identity: identity || 'skylar-caller' }));
  } catch (e) {
    console.error('[/api/token]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
