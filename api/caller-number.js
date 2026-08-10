// GET /api/caller-number?identity=<identity>&preferred=<+E164>
// Returns which phone number will be used for outbound calls, plus the full
// list of numbers this rep is allowed to call from (for the UI's picker).
// Mirrors the resolution in voice.js so what we display is what Twilio dials.

const { env } = require('../lib/twilio');
const { resolveCallerId } = require('../lib/caller-numbers');

module.exports = async (req, res) => {
  try {
    const identity = (req.query && req.query.identity) || env('TWILIO_IDENTITY', false) || 'skylar-caller';
    const preferred = (req.query && req.query.preferred) || '';

    const { from, allowed } = await resolveCallerId(identity, preferred);

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ from, identity, allowed }));
  } catch (e) {
    console.error('[/api/caller-number]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
