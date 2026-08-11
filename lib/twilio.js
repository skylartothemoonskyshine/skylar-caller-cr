// Shared Twilio helpers. Kept tiny so api/* handlers can reuse.

const twilio = require('twilio');

function env(name, required = true) {
  const v = process.env[name];
  if (required && (!v || v.startsWith('ACxxxx') || v.startsWith('SKxxxx') || v.includes('xxxxxxxx'))) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill in your Twilio credentials.`);
  }
  return v;
}

function client() {
  return twilio(env('TWILIO_ACCOUNT_SID'), env('TWILIO_AUTH_TOKEN'));
}

function mintVoiceToken(identity) {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(
    env('TWILIO_ACCOUNT_SID'),
    env('TWILIO_API_KEY_SID'),
    env('TWILIO_API_KEY_SECRET'),
    { identity: identity || env('TWILIO_IDENTITY', false) || 'skylar-caller', ttl: 3600 }
  );
  const grant = new VoiceGrant({
    outgoingApplicationSid: env('TWILIO_TWIML_APP_SID'),
    incomingAllow: true,
  });
  token.addGrant(grant);
  return token.toJwt();
}

// Public base URL for Twilio callbacks. Twilio reached us over the public
// host, so the request headers are the most reliable source (works on Vercel
// and tunnels alike). Falls back to PUBLIC_URL for direct/local testing.
function requestBase(req) {
  const host = (req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  const proto = (req.headers && req.headers['x-forwarded-proto']) || 'https';
  if (host && !/^(localhost|127\.)/.test(host)) return `${proto}://${host}`;
  return (process.env.PUBLIC_URL || '').replace(/\/$/, '');
}

function isConfigured() {
  try {
    env('TWILIO_ACCOUNT_SID');
    env('TWILIO_AUTH_TOKEN');
    env('TWILIO_API_KEY_SID');
    env('TWILIO_API_KEY_SECRET');
    env('TWILIO_TWIML_APP_SID');
    env('TWILIO_FROM_NUMBER');
    return true;
  } catch {
    return false;
  }
}

module.exports = { twilio, client, mintVoiceToken, env, isConfigured, requestBase };
