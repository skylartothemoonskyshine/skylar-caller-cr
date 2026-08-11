// POST /api/incoming — Twilio hits this when someone calls one of our numbers.
// Rings the browsers of every rep allowed to use the called number (owners +
// rep_numbers assignees), then falls back to voicemail if nobody answers.
// Configure in Twilio Console → Phone Numbers → your number →
// "A CALL COMES IN" → Webhook → https://<host>/api/incoming.

const { requestBase } = require('../lib/twilio');
const supa = require('../lib/supabase');

module.exports = async (req, res) => {
  try {
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const callSid = params.CallSid;
    const from = params.From || 'Unknown';

    // Step 2: Dial's action callback after the ring attempt. If a rep answered
    // and the call ended normally, hang up — without this, the caller used to
    // hear "no one is available" voicemail AFTER a perfectly good call.
    if (params.step === 'after-dial') {
      const status = params.DialCallStatus || '';
      if (status === 'completed' || status === 'answered') {
        return sendXml(res, `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
      }
      return sendVoicemail(res);
    }

    // Voicemail recording flow (legacy digits path)
    if (params.Digits) {
      return sendVoicemail(res);
    }

    // Step 1: ring every rep who may use the number that was called.
    const targets = await ringTargets(params.To || '');
    if (!targets.length) return sendVoicemail(res);

    const base = requestBase(req);
    const recordingCallback = base ? `${base}/api/recording?callSid=${encodeURIComponent(callSid || '')}` : '';
    const recordingAttrs = recordingCallback
      ? ` recordingStatusCallback="${escapeXml(recordingCallback)}" recordingStatusCallbackEvent="completed"`
      : '';

    const clients = targets.map(t => `    <Client>${escapeXml(t)}</Client>`).join('\n');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="15" callerId="${escapeXml(from)}" action="/api/incoming?step=after-dial" record="record-from-answer-dual"${recordingAttrs}>
${clients}
  </Dial>
</Response>`;

    sendXml(res, twiml);
  } catch (e) {
    console.error('[/api/incoming]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/xml');
    res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
};

// Usernames to ring for a given called number: owners always, other reps
// only when rep_numbers assigns them that number. Twilio allows at most 10
// simultaneous <Client> targets in one <Dial>.
async function ringTargets(calledNumber) {
  if (!supa.isConfigured()) return [];
  try {
    const sb = supa.admin();
    const [repsR, rnR] = await Promise.all([
      sb.from('reps').select('id, role, username'),
      sb.from('rep_numbers').select('rep_id').eq('phone', calledNumber),
    ]);
    const assigned = new Set((rnR.data || []).map(r => r.rep_id));
    return (repsR.data || [])
      .filter(r => r.username && (r.role === 'owner' || assigned.has(r.id)))
      .map(r => r.username)
      .slice(0, 10);
  } catch (e) {
    console.error('[/api/incoming] ring lookup failed', e);
    return [];
  }
}

function sendXml(res, twiml) {
  res.statusCode = 200;
  res.setHeader('content-type', 'text/xml');
  res.end(twiml);
}

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
  sendXml(res, twiml);
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}
