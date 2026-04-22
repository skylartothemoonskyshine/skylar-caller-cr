# Deploy Skylar Caller CRM to Vercel

Takes ~5 minutes. End result: a permanent `https://your-app.vercel.app` URL that your workers can open from any device, without your laptop running.

## One-time setup

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Deploy
From the project folder:
```bash
vercel
```

First run asks:
- **Set up and deploy?** → yes
- **Which scope?** → your personal account
- **Link to existing project?** → no
- **Project name?** → `skylar-crm` (or whatever)
- **Directory?** → `.` (the default)
- **Override settings?** → no

When it finishes, you get a preview URL like `https://skylar-crm-xxxxxx.vercel.app`.

### 3. Add your Twilio environment variables
Paste each one. The CLI will prompt for the value, then ask which environments — pick **Production** (space-bar to select), then Enter.

```bash
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_API_KEY_SID
vercel env add TWILIO_API_KEY_SECRET
vercel env add TWILIO_FROM_NUMBER
vercel env add TWILIO_TWIML_APP_SID
vercel env add TWILIO_IDENTITY
vercel env add PUBLIC_URL
```

**PUBLIC_URL** should be your production URL (the one ending in `.vercel.app`). You may need to deploy once with a placeholder, then update after.

### 4. Deploy to production
```bash
vercel --prod
```
You now have `https://skylar-crm.vercel.app` (or similar) — permanent.

### 5. Point Twilio at the production URL
- Open your TwiML App at https://console.twilio.com/us1/develop/voice/manage/twiml-apps
- Click **Skylar Outbound**
- Voice Configuration → Request URL: `https://skylar-crm.vercel.app/api/voice`
- Save

Or give me the Vercel URL and I'll update it via the Twilio API.

## Redeploys after code changes

Just `git push` if you connect a GitHub repo (Vercel auto-deploys), or run `vercel --prod` again.

## Verifying it works

Open your new `https://skylar-crm.vercel.app` URL. The top-right Twilio status pill should go green ("Twilio connected"). Click any lead → Call → call connects as usual.

## Notes about Vercel's free tier

- Unlimited bandwidth for low-traffic apps
- Serverless functions: 10s max execution (plenty for all our endpoints)
- Recording webhook: fires once per call, returns 200 immediately — fine on free tier
- Recordings get attached to call logs via polling (every 20s) — no long-lived connections needed
