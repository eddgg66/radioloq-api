# Radioloq API — Vercel Backend

Payment webhook and session verification for radioloq.com

## Deploy to Vercel

### 1. Upload this folder to GitHub
Create a new repo called `radioloq-api` and upload all files.

### 2. Deploy on Vercel
- vercel.com → New Project → Import `radioloq-api` repo
- Framework: Other
- Click Deploy

### 3. Set Environment Variables on Vercel
Go to: Project Settings → Environment Variables

Add these two:
```
STRIPE_SECRET_KEY     =  sk_live_xxxx
STRIPE_WEBHOOK_SECRET =  whsec_xxxx
```

### 4. Your API URL will be:
```
https://radioloq-api.vercel.app/webhook   ← add this to Stripe webhook
https://radioloq-api.vercel.app/verify    ← used by frontend to verify
```

### 5. Add webhook in Stripe
- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: https://radioloq-api.vercel.app/webhook
- Events: checkout.session.completed

### 6. Set redirect URLs in Stripe Payment Links
- Basic:    https://radioloq.com?session={CHECKOUT_SESSION_ID}&pkg=basic
- Standard: https://radioloq.com?session={CHECKOUT_SESSION_ID}&pkg=standard
- Premium:  https://radioloq.com?session={CHECKOUT_SESSION_ID}&pkg=premium
