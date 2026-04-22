// POST /api/sms — send an SMS via Twilio.
// Body: { to: "+15551234567", body: "message", leadId?: "L-xxxx" }

const { client, env, isConfigured } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    if (!isConfigured()) {
      res.statusCode = 503;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Twilio not configured.' }));
      return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'POST required' }));
      return;
    }
    const { to, body, leadId } = req.body || {};
    if (!to || !body) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'to and body are required' }));
      return;
    }

    const msg = await client().messages.create({
      from: env('TWILIO_FROM_NUMBER'),
      to,
      body,
    });

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      leadId: leadId || null,
    }));
  } catch (e) {
    console.error('[/api/sms]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
