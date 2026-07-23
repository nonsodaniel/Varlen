# Platform Credentials & Integration Guide

This document explains how to obtain and configure credentials for every external service Sivena uses. Follow in order — some services depend on others.

---

## 1. Cloudflare R2 (File Storage)

The backend currently writes uploaded files to `uploads/` on disk. Railway's filesystem is **ephemeral** — files are wiped on every deploy. R2 is the fix: S3-compatible object storage with a generous free tier.

### Why R2 instead of AWS S3?

- Zero egress fees
- S3-compatible API (minimal code change)
- Free: 10 GB storage, 1M Class A ops/month

### Steps

1. **Create a Cloudflare account** at https://cloudflare.com (free)

2. **Create an R2 bucket**
   - Dashboard → R2 Object Storage → Create bucket
   - Bucket name: `sivena-uploads`
   - Location: Automatic (or pick closest to Railway region)

3. **Enable public access** (for serving uploaded images)
   - Click the bucket → Settings → Public Access
   - Enable "Allow public access"
   - Copy the **Public bucket URL** (looks like `https://pub-xxxx.r2.dev`)

4. **Create R2 API credentials**
   - R2 → Manage R2 API tokens → Create API token
   - Permissions: **Object Read & Write** on your `sivena-uploads` bucket
   - Copy these values:
     - **Access Key ID: 14f7454fbc1b8b53989cad0c3ccffa6c**
     - **Secret Access Key: ff1e1bff2475cd1ee32cbb037f0a524d911c842ac5b1d584d6c3f73123016519**

5. **Get your Account ID**
   - Top right of Cloudflare dashboard → copy Account ID

### Environment Variables to Add

**Backend (`apps/backend/.env` and Railway)**:

```
# Cloudflare R2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=sivena-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

The R2 endpoint URL format is: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### Code Change Required

`apps/backend/src/modules/upload/upload.service.ts` needs to be updated to use the AWS SDK (`@aws-sdk/client-s3`) pointed at R2 instead of writing to local disk. Install: `npm install @aws-sdk/client-s3`.

---

## 2. Sentry (Error Tracking)

Sentry captures crashes, exceptions, and performance issues in both the mobile app and backend.

### Steps

1. **Create a Sentry account** at https://sentry.io (free tier: 5,000 errors/month)

2. **Create two projects**: one for each platform
   - New Project → React Native → Name: `sivena-mobile`
   - New Project → Node.js (Express) → Name: `sivena-backend`

3. **Get DSN for each project**
   - Project Settings → Client Keys (DSN)
   - Copy the DSN string (format: `https://xxxxx@oXXX.ingest.sentry.io/NNNN`)

4. **Install Sentry in the backend**

   ```bash
   cd apps/backend
   npm install @sentry/node @sentry/profiling-node
   ```

   Add to top of `apps/backend/src/main.ts`:

   ```typescript
   import * as Sentry from "@sentry/node";
   Sentry.init({
     dsn: process.env.SENTRY_DSN_BACKEND,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   });
   ```

5. **Install Sentry in the mobile app**

   ```bash
   cd apps/mobile
   npx expo install @sentry/react-native
   ```

   Add to `apps/mobile/app/_layout.tsx`:

   ```typescript
   import * as Sentry from "@sentry/react-native";
   Sentry.init({
     dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
     environment: __DEV__ ? "development" : "production",
   });
   ```

### Environment Variables to Add

**Backend (`apps/backend/.env` and Railway)**:

```
SENTRY_DSN_BACKEND=https://xxxxx@oXXX.ingest.sentry.io/NNNN
```

**Mobile (`apps/mobile/.env`)**:

```
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@oXXX.ingest.sentry.io/NNNN
```

---

## 3. Custom Email Address (e.g. app@sivena.com)

You need two separate things:

- **Sending** email from `noreply@sivena.com` → handled by **Resend** (transactional)
- **Receiving** email at `app@sivena.com` or `support@sivena.com` → handled by **Cloudflare Email Routing** (free) or **Google Workspace** (paid)

---

### 3a. Domain — Get sivena.com

If you only own `sivena.app`, you need to register `sivena.com` separately (unless you want `app@sivena.app` which also works fine).

- Register at Cloudflare Registrar: https://cloudflare.com → Registrar → Register Domain
- `sivena.com` costs ~$10/year and Cloudflare charges at cost (no markup)
- Once registered, DNS is automatically managed in Cloudflare

> **Tip:** You can use `sivena.app` instead — it works identically. e.g. `app@sivena.app`.

---

### 3b. Sending Email with Resend (Transactional)

This lets you send FROM `noreply@sivena.com` (or any `@sivena.com` address).

1. **Go to** https://resend.com → Domains → Add Domain
2. Enter `sivena.com` (or `sivena.app`)
3. Resend shows you **DNS records to add** — 3 records:
   - **SPF** (TXT record): proves you're authorized to send
   - **DKIM** (TXT record): cryptographically signs emails
   - **DMARC** (TXT record): tells receivers what to do with failures

4. **Add these DNS records in Cloudflare:**
   - Cloudflare dashboard → your domain → DNS → Add record
   - Add all 3 records exactly as Resend shows

5. Click **Verify** in Resend — turns green within 5 minutes

6. **Update env var:**

   ```
   EMAIL_FROM=Sivena <noreply@sivena.com>
   ```

   Or use: `app@sivena.com`, `hello@sivena.com`, etc. — any address on the verified domain works.

7. **Addresses you can send from** (all free, no extra setup):
   - `noreply@sivena.com` — automated emails
   - `hello@sivena.com` — onboarding emails
   - `support@sivena.com` — support replies

---

### 3c. Receiving Email with Cloudflare Email Routing (Free)

This lets you RECEIVE emails sent to `app@sivena.com` and forward them to your personal Gmail/inbox.

1. **Cloudflare dashboard** → your domain → Email → Email Routing → Enable
2. Click **Get started**
3. Cloudflare adds the required MX records automatically
4. **Create routing rules:**
   - Custom address: `support@sivena.com` → forwards to `your-personal@gmail.com`
   - Custom address: `app@sivena.com` → forwards to `your-personal@gmail.com`
   - Catch-all: `*@sivena.com` → forwards to your inbox (catches anything)
5. **Verify** your personal email address when prompted

**Result:** Anyone emailing `support@sivena.com` lands in your regular inbox. Free. No mail server to manage.

---

### 3d. Alternative: Google Workspace (Paid, $6/month)

If you want to actually log in as `app@sivena.com` and send replies from it (not just receive forwarded copies):

1. https://workspace.google.com → Get started → $6/user/month
2. Add your domain → Google walks you through DNS setup
3. You get a full Gmail inbox at `app@sivena.com`
4. Can send FROM this address in Gmail
5. Also gives Google Drive, Meet, etc. for the team

**Recommended if:** You want customers to reply to `support@sivena.com` and you reply back from that same address.

---

### Summary: What to Use for What

| Use case                                 | Solution                 | Cost                   |
| ---------------------------------------- | ------------------------ | ---------------------- |
| Send transactional emails (welcome, OTP) | Resend                   | Free up to 3,000/month |
| Receive support emails                   | Cloudflare Email Routing | Free                   |
| Full inbox + reply as @sivena.com        | Google Workspace         | $6/user/month          |
| Domain registration                      | Cloudflare Registrar     | ~$10/year              |

---

### Updated Env Var

```
EMAIL_FROM=Sivena <noreply@sivena.com>
SUPPORT_EMAIL=support@sivena.com
```

---

## 4. Google OAuth — Already Partially Set Up

Used for "Sign in with Google" on mobile.

### Steps to complete setup

1. **Go to** https://console.cloud.google.com

2. **Create/select project** → APIs & Services → Credentials

3. **Create OAuth 2.0 Client IDs** — you need three:
   - **Web client** (for backend token verification)
     - Type: Web application
     - Authorized origins: `https://sivena.app`, `http://localhost:3000`
   - **iOS client**
     - Type: iOS
     - Bundle ID: `com.sivena.app`
   - **Android client**
     - Type: Android
     - Package: `com.sivena.app`
     - SHA-1: run `cd apps/mobile/android && ./gradlew signingReport`

4. **Enable Google Sign-In API**
   - APIs & Services → Library → search "Google Sign-In" → Enable

### Environment Variables

**Backend**:

```
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com  # Web client ID
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

**Mobile (`apps/mobile/app.json`)**:

```json
"@react-native-google-signin/google-signin": {
  "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"
}
```

The `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` should be the **web** client ID (used for token verification).

---

## 5. OpenAI (AI Assistant) — Already Set Up

The AI assistant uses OpenAI's API.

1. **Get API key** at https://platform.openai.com/api-keys
2. Set spending limits: platform.openai.com → Billing → Usage limits
3. Recommended model: `gpt-4o-mini` (fast, cheap) or `gpt-4o` (better quality)

```
OPENAI_API_KEY=sk-proj-xxxx
```

---

## 6. RevenueCat (In-App Purchases) — Mobile

RevenueCat manages premium subscriptions across iOS and Android.

1. **Create account** at https://app.revenuecat.com
2. **Create a project** → Add app (iOS + Android separately)
3. **Get API keys**:
   - Project Settings → API Keys
   - Copy the **Public SDK key** (starts with `appl_` for iOS, `goog_` for Android)

4. **Set up products** in App Store Connect and Google Play Console first, then link them in RevenueCat

**Mobile env**:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxx
```

These map to `apps/mobile/src/services/revenueCat.ts`.

---

## 7. Expo EAS (OTA Updates & Builds) — Already Set Up

1. **Account**: https://expo.dev → sivena-mobile project
2. **Project ID** is in `apps/mobile/app.json` under `extra.eas.projectId`
3. Login: `npx eas login`
4. For OTA: `CI=1 eas update --branch production --message "..."`
5. For builds: `eas build --platform android --profile production`

---

## 8. Railway (Backend Hosting) — Already Deployed

1. **Login** at https://railway.app
2. **Project**: sivena-api-production
3. **Set env vars**: Railway dashboard → your service → Variables tab
4. **Deploy**: `railway up --detach` from `apps/backend/`
5. **Logs**: `railway logs` (or dashboard)

All env vars from this document need to be added to Railway's Variables tab for production.

---

## Summary: All Environment Variables

### Backend (`apps/backend/.env` + Railway Variables)

```env
# App
NODE_ENV=production
PORT=3000
APP_URL=https://sivena.app
CORS_ORIGIN=https://sivena.app

# Database (Railway provides this automatically)
DATABASE_URL=postgresql://...

# Auth
JWT_ACCESS_SECRET=<random 32+ char string>
JWT_REFRESH_SECRET=<different random 32+ char string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
ENCRYPTION_KEY=<32 char hex string>

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# Email
RESEND_API_KEY=re_xxxx
EMAIL_FROM=Sivena <noreply@sivena.app>

# AI
OPENAI_API_KEY=sk-proj-xxxx

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=xxxx
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_BUCKET_NAME=sivena-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# Error Tracking
SENTRY_DSN_BACKEND=https://xxxx@oXXX.ingest.sentry.io/NNNN

# Redis (Railway add-on)
REDIS_URL=redis://...
```

### Mobile (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=https://sivena-api-production.up.railway.app/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@oXXX.ingest.sentry.io/NNNN
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxx
```

---

## Priority Order

1. **R2** — Fix uploads now (files are being lost on every Railway deploy)
2. **Sentry** — Add before wide release so you can catch crashes
3. **Google OAuth** — Verify all 3 client IDs are correctly configured
4. **Resend domain** — Verify DNS records so emails don't land in spam
5. **RevenueCat** — Before enabling premium subscriptions
