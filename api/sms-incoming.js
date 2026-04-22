// POST /api/sms-incoming — Twilio posts here for inbound SMS.
// Matches the sender to an existing lead by phone (last 10 digits), then
// inserts a row into `messages`. Schema requires lead_id NOT NULL, so SMS
// from unknown numbers is logged and dropped — add the lead, then replies
// will thread correctly.
// Responds with empty TwiML so Twilio does not send an auto-reply.

const { admin, isConfigured: sbConfigured } = require('../lib/supabase');

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

function digitsOnly(s) {
  return String(s || '').replace(/\D+/g, '');
}

async function findLeadByPhone(sb, from) {
  const digits = digitsOnly(from);
  if (!digits) return null;
  const last10 = digits.slice(-10);
  const exact = await sb.from('leads').select('id, phone').eq('phone', from).limit(1);
  if (exact.error) {
    console.error('[/api/sms-incoming] lead lookup (exact) failed', exact.error);
  } else if (exact.data && exact.data.length) {
    return exact.data[0];
  }
  const fuzzy = await sb.from('leads').select('id, phone').ilike('phone', `%${last10}%`).limit(1);
  if (fuzzy.error) {
    console.error('[/api/sms-incoming] lead lookup (fuzzy) failed', fuzzy.error);
    return null;
  }
  return (fuzzy.data && fuzzy.data[0]) || null;
}

module.exports = async (req, res) => {
  const respond = () => {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/xml');
    res.end(EMPTY_TWIML);
  };

  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('POST required');
      return;
    }
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const from = params.From;
    const body = params.Body;
    const sid = params.MessageSid;
    const status = params.SmsStatus || params.MessageStatus || null;

    if (!from || !body || !sid) {
      console.warn('[/api/sms-incoming] missing From/Body/MessageSid', { from, sid });
      respond();
      return;
    }
    if (!sbConfigured()) {
      console.warn('[/api/sms-incoming] Supabase not configured — dropping inbound SMS');
      respond();
      return;
    }

    const sb = admin();
    const lead = await findLeadByPhone(sb, from);
    if (!lead) {
      console.warn(`[/api/sms-incoming] no lead matched ${from} — SMS dropped (sid=${sid})`);
      respond();
      return;
    }

    const ins = await sb.from('messages').insert({
      lead_id: lead.id,
      direction: 'in',
      body,
      sid,
      status,
    });
    if (ins.error) console.error('[/api/sms-incoming] insert messages failed', ins.error);
    else console.log(`[/api/sms-incoming] saved inbound SMS ${sid} for lead ${lead.id}`);

    respond();
  } catch (e) {
    console.error('[/api/sms-incoming]', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/xml');
    res.end(EMPTY_TWIML);
  }
};
