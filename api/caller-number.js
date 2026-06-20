// GET /api/caller-number?identity=<identity> — returns which phone number will be used for outbound calls
// This mirrors the logic in voice.js so the UI can display which number is being used.

const { env } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    const identity = (req.query && req.query.identity) || env('TWILIO_IDENTITY', false) || 'skylar-caller';

    // Mirror the voice.js routing logic
    let from = env('TWILIO_FROM_NUMBER');
    const rayanId = env('RAYAN_IDENTITY', false);
    const caller2Id = env('CALLER2_IDENTITY', false);

    if (rayanId && identity === rayanId) {
      const rayanNum = env('TWILIO_FROM_NUMBER_RAYAN', false);
      if (rayanNum) from = rayanNum;
    } else if (caller2Id && identity === caller2Id) {
      const caller2Num = env('TWILIO_FROM_NUMBER_CALLER2', false);
      if (caller2Num) from = caller2Num;
    }

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ from, identity }));
  } catch (e) {
    console.error('[/api/caller-number]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
