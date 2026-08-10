// Shared caller-ID resolution for /api/voice and /api/caller-number.
// Source of truth is Supabase (caller_numbers + rep_numbers, see
// numbers_setup.sql): owners may use every number, other reps only what
// they've been assigned. Falls back to the legacy env-var routing
// (TWILIO_FROM_NUMBER_RAYAN etc.) when Supabase isn't configured or the
// tables don't exist yet, so calls keep working either way.

const { env } = require('./twilio');
const supa = require('./supabase');

function legacyNumberFor(identity) {
  let from = env('TWILIO_FROM_NUMBER');
  const rayanId = env('RAYAN_IDENTITY', false);
  const caller2Id = env('CALLER2_IDENTITY', false);
  if (rayanId && identity === rayanId) {
    const n = env('TWILIO_FROM_NUMBER_RAYAN', false);
    if (n) from = n;
  } else if (caller2Id && identity === caller2Id) {
    const n = env('TWILIO_FROM_NUMBER_CALLER2', false);
    if (n) from = n;
  }
  return from;
}

// -> { defaultFrom, allowed: [{ phone, label }] } for this identity.
async function allowedNumbersFor(identity) {
  const legacy = legacyNumberFor(identity);
  const fallback = { defaultFrom: legacy, allowed: [{ phone: legacy, label: '' }] };
  if (!supa.isConfigured()) return fallback;
  try {
    const sb = supa.admin();
    const [repR, numsR] = await Promise.all([
      sb.from('reps').select('id, role').eq('username', identity).maybeSingle(),
      sb.from('caller_numbers').select('phone, label').order('phone'),
    ]);
    const rep = repR.data;
    const nums = numsR.data;
    if (!nums || !nums.length) return fallback;
    if (rep?.role === 'owner') return { defaultFrom: legacy, allowed: nums };
    if (rep) {
      const { data: rows } = await sb.from('rep_numbers').select('phone').eq('rep_id', rep.id);
      const mine = new Set((rows || []).map(r => r.phone));
      const allowed = nums.filter(n => mine.has(n.phone));
      if (allowed.length) return { defaultFrom: legacy, allowed };
    }
    return fallback;
  } catch (e) {
    console.error('[caller-numbers]', e);
    return fallback;
  }
}

// Number a call should go out from: the requested one if this rep is
// allowed to use it, else their default, else the first allowed number.
// Never trusts `requested` blindly — that param is client-controlled.
async function resolveCallerId(identity, requested) {
  const { defaultFrom, allowed } = await allowedNumbersFor(identity);
  if (requested && allowed.some(n => n.phone === requested)) return { from: requested, allowed };
  if (allowed.some(n => n.phone === defaultFrom)) return { from: defaultFrom, allowed };
  return { from: allowed[0]?.phone || defaultFrom, allowed };
}

module.exports = { allowedNumbersFor, resolveCallerId, legacyNumberFor };
