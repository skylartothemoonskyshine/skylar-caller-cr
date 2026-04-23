// POST /api/incoming — Twilio hits this when someone calls our Twilio
// number. We play a short greeting and record a voicemail.
// Configure in Twilio Console → Phone Numbers → your number →
// "A CALL COMES IN" → Webhook → https://<host>/api/incoming.

const { env } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    const greeting = env('VOICEMAIL_GREETING', false) ||
      "Thanks for calling Skylar Partners. We are not available right now. Please leave a brief message after the beep and we will get back to you soon.";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
  <Pause length="1"/>
  <Record maxLength="180" playBeep="true" trim="trim-silence" timeout="5" finishOnKey="#"/>
  <Say voice="Polly.Joanna">We did not receive a message. Goodbye.</Say>
  <Hangup/>
</Response>`;

    res.statusCode = 200;
    res.setHeader('content-type', 'text/xml');
    res.end(twiml);
  } catch (e) {
    console.error('[/api/incoming]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/xml');
    res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
};

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}
