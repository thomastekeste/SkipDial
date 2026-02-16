# 🇺🇸 VetScript Power Dialer — Setup Guide

## What You're Setting Up
A browser-based power dialer that:
- Makes real phone calls from your browser (laptop or phone)
- Auto-dials through your lead list
- Detects voicemail and auto-drops your pre-recorded message
- Shows your script with lead info auto-filled
- Auto-advances to next lead after disposition

## Total Cost
- Telnyx number: $1/month
- Call minutes: ~$0.014/min (~$50/mo at heavy volume)
- Hosting: FREE (Vercel free tier)
- **Total: ~$20-50/month**

---

## Step 1: Telnyx Account (5 minutes)

1. Go to **https://telnyx.com/sign-up** — create free account
2. Verify your account (Level 1 — just email + phone)
3. Add $20 credit (Settings → Billing → Add Funds)

## Step 2: Buy a Phone Number (2 minutes)

1. In Telnyx Mission Control: **Numbers → Search & Buy**
2. Pick a local area code matching where most leads are (e.g., 817 for Texas)
3. Buy it ($1/month)
4. Note the number in +E.164 format: `+18175551234`

## Step 3: Create SIP Connection (3 minutes)

1. Go to **Voice → SIP Connections**
2. Click **+ Add SIP Connection**
3. Name it: `VetScript Dialer`
4. Connection Type: **Credentials**
5. Note the auto-generated **username** and **password**
6. Under Settings → **Receive SIP URI Calls**: set to **Only from my Connections**
7. Click **Done**
8. Note the **Connection ID** (shown in the connection details, starts with a long string)

## Step 4: Create Outbound Voice Profile (2 minutes)

1. Go to **Voice → Outbound Voice Profiles**
2. Click **Add New Profile**
3. Name it: `VetScript Outbound`
4. **Add Connection**: search for "VetScript Dialer" and add it
5. **Traffic Type**: Conversational
6. **Allowed Destinations**: US & Canada (or wherever you're calling)
7. Set a **Daily Spend Limit**: $25 (safety net)
8. Click **Save**

## Step 5: Assign Number to Connection

1. Go to **Numbers → My Numbers**
2. Find your purchased number
3. Click the pencil icon in the **SIP Connection** column
4. Select **VetScript Dialer**
5. Save

## Step 6: Get API Key (1 minute)

1. Go to **Account → API Keys** (or Auth V2 → API Keys)
2. Click **Create API Key**
3. Copy the key — you'll need this

## Step 7: Deploy to Vercel (10 minutes)

### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project folder
cd vetscript-dialer

# Deploy
vercel

# Set environment variables
vercel env add TELNYX_API_KEY        # Paste your API key
vercel env add TELNYX_CONNECTION_ID  # Paste your SIP connection ID  
vercel env add TELNYX_PHONE_NUMBER   # Your Telnyx number: +18175551234

# Optional: VM drop audio URL (host an MP3 somewhere)
vercel env add VM_DROP_AUDIO_URL     # https://your-site.com/vm-message.mp3

# Redeploy with env vars
vercel --prod
```

### Option B: Using Vercel Dashboard
1. Push project to GitHub
2. Go to **vercel.com** → Import Project → Select repo
3. Add Environment Variables:
   - `TELNYX_API_KEY` = your API key
   - `TELNYX_CONNECTION_ID` = your SIP connection ID
   - `TELNYX_PHONE_NUMBER` = +18175551234
   - `VM_DROP_AUDIO_URL` = (optional) URL to your VM audio file
4. Click Deploy

## Step 8: Configure Webhook URL

1. Back in Telnyx Mission Control
2. Go to your **SIP Connection → Settings**
3. Under **Webhook URL**, enter: `https://your-app.vercel.app/api/webhook`
4. Webhook API Version: **v2**
5. Save

## Step 9: Test It!

1. Open your deployed URL: `https://your-app.vercel.app`
2. Upload a CSV or load demo data
3. You should see "📡 Connected" in top right corner
4. Click a lead → it should dial through your browser
5. Talk through your AirPods/headset!

---

## File Structure
```
vetscript-dialer/
├── index.html          # Full dialer frontend (single file)
├── api/
│   ├── token.js        # Generates Telnyx WebRTC auth tokens
│   ├── call.js         # Call control (dial, hangup, VM drop)
│   └── webhook.js      # Receives Telnyx call events (AMD, status)
├── package.json        # Dependencies
└── vercel.json         # Vercel routing config
```

## Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| TELNYX_API_KEY | Your Telnyx API v2 key | KEY_abc123... |
| TELNYX_CONNECTION_ID | SIP Connection ID | 123456789... |
| TELNYX_PHONE_NUMBER | Your Telnyx number (E.164) | +18175551234 |
| VM_DROP_AUDIO_URL | URL to pre-recorded VM (optional) | https://... |

## Troubleshooting

**"📡 Not Connected"**
- Check that your API key is correct
- Check that your SIP connection has "Receive SIP URI Calls" set to "Only from my Connections"
- Check browser console for errors

**Calls not going through**
- Make sure your Outbound Voice Profile has the SIP connection added
- Make sure your number is assigned to the SIP connection
- Check your Telnyx balance

**No audio**
- Allow microphone access when browser asks
- Check your AirPods/headset are connected
- Try Chrome (best WebRTC support)

**Fallback: tel: links**
- If Telnyx WebRTC can't connect, the dialer falls back to `tel:` links
- On iPhone this opens your native dialer
- On laptop this opens your default calling app
- You still get the script, auto-advance, and disposition tracking

---

## Coming Soon
- Answering Machine Detection (AMD) auto-VM drop
- Call recording
- Multi-agent team support
- Supabase lead sync across devices
- Pre-recorded VM drop management
