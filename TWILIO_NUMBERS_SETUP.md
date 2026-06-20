# Twilio Numbers & Inbound Calling Setup

## Your 3 Twilio Numbers

| Number | Region | Features | Current Use |
|--------|--------|----------|-------------|
| **+14385335193** | Montreal, QC, Canada | SMS, MMS, Voice | Rayan's outbound caller ID |
| **+18392743154** | US, United States | SMS, MMS, Voice | Default outbound for all callers |
| **+14388393631** | QC, Canada | SMS, MMS, Voice | Caller2's outbound caller ID |

## What's Now Configured ✅

### 1. **Per-Rep Outbound Caller ID Routing**
Each team member can have their own caller ID:
- **Rayan** (username: `rayan`) → calls go out from +14385335193 (Montreal)
- **Caller2** (username: `caller2`) → calls go out from +14388393631 (QC)
- **Everyone else** → calls go out from +18392743154 (default)

### 2. **Dialer Now Shows Your Caller ID**
When you dial a number, the dialer displays: `📞 from [your-number]`
- Shows which number the prospect will see on their phone
- Helps explain callback routing to leads

### 3. **Inbound Calls → Voicemail Capture**
Incoming calls to ANY of your 3 numbers trigger:
- Greeting message plays: "Thanks for calling Skylar Partners..."
- Caller leaves voicemail (max 180 sec, auto-trim silence)
- Recording stored in Supabase `voicemails_recent` view
- Appears in app under Call Logs → Voicemails tab

### 4. **SMS/MMS Fully Enabled**
- Send SMS to leads from the app (SMS tab in lead detail)
- Send MMS (attach images/media)
- Inbound SMS/MMS auto-threads to the matching lead
- Realtime message updates via Supabase

---

## REQUIRED: Set Up Twilio Webhooks

To activate inbound calls + SMS, configure these in **Twilio Console** for EACH of your 3 numbers:

### For Inbound Voice (Voicemail Capture)
1. Go: **Phone Numbers** → Select a number → **Configure**
2. Under "A CALL COMES IN", select **Webhook**
3. Enter: `https://your-domain.com/api/incoming`
4. Save
5. **Repeat for all 3 numbers**

### For Inbound SMS
1. Go: **Phone Numbers** → Select a number → **Configure**
2. Under "Messaging", select **Webhook**
3. Enter: `https://your-domain.com/api/sms-incoming`
4. Save
5. **Repeat for all 3 numbers**

### Example URLs (replace with your domain)
- Local dev with ngrok: `https://abc123.ngrok.io/api/incoming`
- Production (Vercel): `https://skylar-caller-cr.vercel.app/api/incoming`
- Current: `https://citizen-soma-limits-package.trycloudflare.com/api/incoming`

---

## Environment Variables (Already Set)

```
TWILIO_FROM_NUMBER=+18392743154                    # Default number
TWILIO_FROM_NUMBER_RAYAN=+14385335193              # Rayan's number
TWILIO_FROM_NUMBER_CALLER2=+14388393631            # Caller2's number
RAYAN_IDENTITY=rayan                               # Rayan's username
CALLER2_IDENTITY=caller2                           # Caller2's username
```

---

## How It Works

### Outbound Calls
1. You sign in as `rayan` or `caller2`
2. Dial a number in the app
3. Twilio routes your outbound call through YOUR assigned number
4. Prospect sees YOUR number on caller ID, can call back

### Inbound Voicemail
1. Prospect calls any of your 3 numbers
2. Greeting plays, they leave a voicemail
3. Recording uploads to Supabase
4. You see it in: **Calls** → **Voicemails** tab
5. Listen/download from the app

### Inbound SMS
1. Prospect texts one of your numbers
2. Message matches lead by phone number
3. Appears in: **Lead detail** → **SMS tab**
4. Full thread history (sent + received)

---

## Test Checklist

- [ ] Sign in as `rayan`, make a test call, see "+14385335193" in dialer
- [ ] Sign in as `caller2`, make a test call, see "+14388393631" in dialer  
- [ ] Sign in as default user, see "+18392743154" in dialer
- [ ] Call one of your numbers from a mobile phone, leave a voicemail
- [ ] Voicemail appears in app within 10 seconds
- [ ] Send SMS to a lead from the app
- [ ] SMS appears in lead's SMS thread
- [ ] Have someone text one of your numbers
- [ ] Message threads correctly in the lead's SMS tab

---

## GitHub
**Repo:** `skylartothemoonskyshine/skylar-caller-cr`

---

## Troubleshooting

**No voicemail appearing?**
- Check Twilio Console → Logs for incoming call errors
- Verify webhook URL is correct and public (use ngrok for localhost)
- Ensure `PUBLIC_URL` env var matches your domain

**SMS not receiving?**
- Confirm inbound SMS webhook is set in Twilio
- Check that lead exists in database (SMS matches by phone number)
- Look at Supabase → messages table to see if row was created

**Caller ID not showing custom number?**
- Verify identity matches exactly (case-sensitive)
- Sign in with exact username (e.g., `rayan` not `Rayan`)
- Check .env has correct `RAYAN_IDENTITY` + `TWILIO_FROM_NUMBER_RAYAN`
- Restart dev server to reload env vars
