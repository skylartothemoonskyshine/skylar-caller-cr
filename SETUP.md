# Skylar Caller CRM — Twilio Setup

The CRM does browser-based calling, SMS, and call recording via Twilio. Without a Twilio account the dialer falls back to the OS `tel:` handler.

## 1. Create a Twilio account

1. Go to https://www.twilio.com and sign up. You get ~$15 free trial credit.
2. Verify your email + phone number.
3. From the Console home, copy your **Account SID** and **Auth Token** — you'll paste them into `.env` in step 5.

## 2. Buy a phone number

1. In the console, go to **Phone Numbers → Manage → Buy a Number**.
2. Pick a number that supports **Voice** and **SMS** (most US local numbers do).
3. The number format will be `+15551234567` — copy it for step 5.

## 3. Create an API Key

1. **Account → API keys & tokens → Create API Key**.
2. Name it `skylar-crm`. Type: **Standard**.
3. On the next screen, copy **SID** (starts with `SK...`) and **Secret** — this secret is shown **once**.

## 4. Create a TwiML App

This is what tells Twilio how to route outbound calls from the browser.

1. **Voice → TwiML → TwiML Apps → Create new TwiML App**.
2. Friendly name: `Skylar Outbound`.
3. Voice Configuration → **Request URL**:
   - Local dev with ngrok: `https://YOUR-TUNNEL.ngrok-free.app/api/voice`
   - Production (Vercel): `https://YOUR-DEPLOYMENT.vercel.app/api/voice`
   - Request Method: `POST`
4. Save. Copy the **TwiML App SID** (starts with `AP...`).

## 5. Configure `.env`

Copy `.env.example` to `.env` in the project root and fill in:

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=...
TWILIO_FROM_NUMBER=+15551234567
TWILIO_TWIML_APP_SID=AP...
PUBLIC_URL=https://YOUR-TUNNEL.ngrok-free.app
```

Never commit `.env`. It's already in `.gitignore`.

## 6. Expose your localhost to Twilio (dev only)

Twilio needs to reach your `/api/voice` endpoint from the public internet. Use ngrok:

```bash
# in a second terminal
npx ngrok http 5173
```

Copy the `https://...ngrok-free.app` URL — put it in `.env` as `PUBLIC_URL`, and update the TwiML App's Voice Request URL in step 4 to point at it. Restart `npm run dev` after editing `.env`.

## 7. Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/. Click a lead's **Call now**. Your browser will ask for mic permission — allow it. The call connects via WebRTC.

Recordings arrive a few seconds after hangup and auto-attach to the matching call log (look under **Activity** on the lead detail page — there's an audio player inline).

## 8. Deploy to Vercel (optional, for sharing with your team)

```bash
npm i -g vercel
vercel
# follow prompts; accept defaults
vercel env add TWILIO_ACCOUNT_SID       # paste value when prompted
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_API_KEY_SID
vercel env add TWILIO_API_KEY_SECRET
vercel env add TWILIO_FROM_NUMBER
vercel env add TWILIO_TWIML_APP_SID
vercel env add PUBLIC_URL               # use https://your-app.vercel.app
vercel --prod
```

Update the TwiML App's Voice Request URL to your Vercel URL. Done — any caller can log in from a browser on any device.

## How the plumbing works

- `/api/token` — mints a short-lived Voice SDK access token. The browser fetches this on "Call" click.
- `/api/voice` — Twilio hits this when the Voice SDK initiates a call. Returns TwiML that dials the destination with `record="record-from-answer-dual"` enabled.
- `/api/sms` — POST `{ to, body, leadId }`. Sends SMS via Twilio REST API.
- `/api/recording` — Twilio posts here when a recording finishes. The endpoint also serves an SSE stream at `/api/recording/stream` so the browser UI can attach recording URLs in real time.

## Troubleshooting

- **Mic permission denied** → click the lock icon in the address bar → allow microphone.
- **Call fails immediately** → check the server terminal for `[api voice]` / `[api token]` errors. Most likely: missing env var or wrong TwiML App Request URL.
- **Twilio free trial** → outbound calls play a "trial account" intro message and only work to verified numbers. Upgrade (add a card) to call any number with no intro.
- **Recordings don't show up** → check `PUBLIC_URL` in `.env` is your ngrok/Vercel URL, not localhost. Twilio can't reach localhost.
- **E.164 format** → phone numbers in leads should be US-style `(512) 555-0142` or `+15125550142`. The dialer normalizes common formats.

## Costs (ballpark, USD)

- Phone number: ~$1/mo
- Outbound calls: ~2¢/minute (US)
- SMS: ~0.8¢ per segment (US)
- Recording storage: ~0.05¢/minute

A caller doing 2 hours of talk time/day costs roughly $50/month all-in.
