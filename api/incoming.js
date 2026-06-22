// POST /api/incoming — Twilio hits this when someone calls our Twilio number.
// First tries to route to a live agent (via VoiceSDK app), then falls back to voicemail.
// Configure in Twilio Console → Phone Numbers → your number →
// "A CALL COMES IN" → Webhook → https://<host>/api/incoming.

const { env } = require('../lib/twilio');

module.exports = async (req, res) => {
  try {
    const params = req.body || {};
    const digits = params.Digits || '';
    const callSid = params.CallSid;
    const from = params.From || 'Unknown';

    // If this is a voicemail recording (digits exist), skip to voicemail directly
    if (digits) {
      return sendVoicemail(res);
    }

    // Try to route to available agent via Client name "skylar-caller" (or specific agent)
    // The app will listen for incoming calls via Device.on('incoming')
    // This Dial will ring the browser app; if it times out (no answer), we fall back to voicemail.
    const publicUrl = env('PUBLIC_URL', false) || '';
    const recordingCallback = publicUrl ? `${publicUrl.replace(/\/$/, '')}/api/recording?callSid=${callSid}` : '';
    const recordingAttrs = recordingCallback
      ? ` recordingStatusCallback="${escapeXml(recordingCallback)}" recordingStatusCallbackEvent="completed"`
      : '';

    // Try to dial the app (will timeout after 15 seconds if nobody answers)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="15" callerId="${escapeXml(from)}"${recordingAttrs}>
    <Client>skylar-caller</Client>
  </Dial>
  <Say voice="Polly.Joanna">No one is available. Please leave a message after the beep.</Say>
  <Pause length="1"/>
  <Record maxLength="180" playBeep="true" trim="trim-silence" timeout="5" finishOnKey="#"${recordingAttrs}/>
  <Say voice="Polly.Joanna">Thank you for your message. Goodbye.</Say>
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

function sendVoicemail(res) {
  const greeting = "Thanks for calling Skylar Partners. We are not available. Please leave a message.";
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
  <Pause length="1"/>
  <Record maxLength="180" playBeep="true" trim="trim-silence" timeout="5" finishOnKey="#"/>
  <Say voice="Polly.Joanna">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/xml');
  res.end(twiml);
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}
