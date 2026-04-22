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

module.exports = { twilio, client, mintVoiceToken, env, isConfigured };
