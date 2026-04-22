// POST /api/voice — Twilio hits this with the TwiML App's Voice Request URL
// when the browser Voice SDK initiates an outbound call. We respond with
// TwiML that dials the destination number from our Twilio number and
// enables dual-channel recording from answer.

const { env } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    // Twilio sends form-encoded POST; we also accept query params for testing.
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const to = params.To || params.to;
    const leadId = params.leadId || '';

    if (!to) {
      res.statusCode = 400;
      res.setHeader('content-type', 'text/xml');
      res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing destination number.</Say></Response>`);
      return;
    }

    const from = env('TWILIO_FROM_NUMBER');
    const publicUrl = env('PUBLIC_URL', false) || '';
    const statusCallback = publicUrl ? `${publicUrl.replace(/\/$/, '')}/api/recording?leadId=${encodeURIComponent(leadId)}` : '';

    // Dial with dual-channel recording (caller + callee on separate channels).
    const recordAttr = `record="record-from-answer-dual"`;
    const recordingStatusAttrs = statusCallback
      ? ` recordingStatusCallback="${escapeXml(statusCallback)}" recordingStatusCallbackEvent="completed"`
      : '';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(from)}" ${recordAttr} answerOnBridge="true"${recordingStatusAttrs}>
    <Number>${escapeXml(to)}</Number>
  </Dial>
</Response>`;

    res.statusCode = 200;
    res.setHeader('content-type', 'text/xml');
    res.end(twiml);
  } catch (e) {
    console.error('[/api/voice]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/xml');
    res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Call failed to start.</Say></Response>`);
  }
};

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}
