# Payment Setup: RevenueCat + App Stores

Everything you need to do to activate subscriptions in Sivena.

---

## Step 1: Create a RevenueCat Account

1. Go to https://www.revenuecat.com and sign up (free tier covers up to $2.5k/mo revenue)
2. Create a new **Project** named **Sivena**

---

## Step 2: Connect App Stores

### Apple App Store

1. In RevenueCat dashboard: **Project Settings > Apps > + New App > Apple App Store**
2. You need your **App Store Connect Shared Secret**:
   - Go to https://appstoreconnect.apple.com
   - Select your app > **General > App Information > App-Specific Shared Secret**
   - Copy and paste into RevenueCat
3. Set the **Bundle ID**: `com.sivena.app`

### Google Play Store

1. In RevenueCat: **Project Settings > Apps > + New App > Google Play Store**
2. You need a **Google Play Service Account JSON**:
   - Go to Google Cloud Console > **IAM & Admin > Service Accounts**
   - Create a service account with **Pub/Sub Admin** and **Monitoring Viewer** roles
   - Create a JSON key and download it
   - In Google Play Console: **Settings > API access** > grant this service account access
   - Upload the JSON to RevenueCat
3. Set the **Package Name**: `com.sivena.app`

---

## Step 3: Create Products in the App Stores

### Apple App Store Connect

1. Go to https://appstoreconnect.apple.com > your app > **Subscriptions**
2. Create a **Subscription Group** named **Sivena Pro**
3. Add these subscriptions:

| Reference Name | Product ID | Duration | Price |
|---|---|---|---|
| Pro Monthly | `sivena_pro_monthly` | 1 Month | $4.99 |
| Pro Yearly | `sivena_pro_yearly` | 1 Year | $39.99 |
| Family Monthly | `sivena_family_monthly` | 1 Month | $7.99 |

4. For each subscription:
   - Add a **Localization** (display name + description)
   - Set the **Subscription Price**
   - Enable **Family Sharing** for `sivena_family_monthly`

### Google Play Console

1. Go to Google Play Console > your app > **Monetize > Subscriptions**
2. Create these subscriptions:

| Product ID | Base Plan | Duration | Price |
|---|---|---|---|
| `sivena_pro_monthly` | monthly | 1 Month | $4.99 |
| `sivena_pro_yearly` | yearly | 1 Year | $39.99 |
| `sivena_family_monthly` | monthly | 1 Month | $7.99 |

3. For each: add a base plan, set the price, activate

---

## Step 4: Configure Products in RevenueCat

### Add Products

1. In RevenueCat: **Products > + New Product**
2. Add all 3 products for each platform (6 total):

| Identifier | App Store Product ID | Play Store Product ID |
|---|---|---|
| `sivena_pro_monthly` | `sivena_pro_monthly` | `sivena_pro_monthly` |
| `sivena_pro_yearly` | `sivena_pro_yearly` | `sivena_pro_yearly` |
| `sivena_family_monthly` | `sivena_family_monthly` | `sivena_family_monthly` |

### Create Entitlements

1. Go to **Entitlements > + New Entitlement**
2. Create two entitlements:

| Entitlement ID | Description | Linked Products |
|---|---|---|
| `pro` | Sivena Pro access | `sivena_pro_monthly`, `sivena_pro_yearly` |
| `family` | Sivena Family access | `sivena_family_monthly` |

### Create Offerings

1. Go to **Offerings** — a "Default" offering already exists
2. Add packages to the Default offering:
   - **Monthly** package > attach `sivena_pro_monthly`
   - **Annual** package > attach `sivena_pro_yearly`
   - **Custom** package (identifier: `family_monthly`) > attach `sivena_family_monthly`

---

## Step 5: Get Your API Keys

1. In RevenueCat: **Project Settings > API Keys**
2. Copy the **Public SDK Keys** (one per platform):
   - **Apple** — starts with `appl_...`
   - **Google** — starts with `goog_...`
3. These go into your environment variables (see Step 6)

---

## Step 6: Set Environment Variables

### Mobile (EAS Secrets or .env)

```bash
# Set via EAS for builds
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_your_key_here"
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_your_key_here"
```

Or add to your local `.env` in `apps/mobile/`:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_key_here
```

### Backend (Railway / .env)

```
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

Generate any random secret string for this (e.g. `openssl rand -hex 32`).

---

## Step 7: Configure the Webhook

1. In RevenueCat: **Project Settings > Integrations > Webhooks**
2. Click **+ New Webhook**
3. Configure:

| Field | Value |
|---|---|
| Webhook URL | `https://your-api-url.up.railway.app/api/v1/webhooks/revenuecat` |
| Authorization header | `Bearer your_webhook_secret_here` |

Use the same secret from Step 6.

4. Enable these events:
   - Initial Purchase
   - Renewal
   - Cancellation
   - Billing Issue
   - Product Change
   - Expiration
   - Subscriber Alias
   - Transfer

5. Click **Save** then **Send Test Event** to verify

---

## Step 8: Test in Sandbox

### iOS Sandbox Testing

1. On your iPhone: **Settings > App Store > Sandbox Account**
2. Create a sandbox tester in App Store Connect: **Users and Access > Sandbox Testers**
3. Build with `eas build --profile development --platform ios`
4. Open the app, navigate to the paywall, attempt a purchase
5. Sandbox purchases are free and auto-renew every few minutes

### Android Test Purchases

1. In Google Play Console: **Settings > License Testing**
2. Add your Gmail address as a license tester
3. Build with `eas build --profile development --platform android`
4. Test purchases go through but are not charged

### What to Verify

- [ ] Paywall screen loads and shows correct prices
- [ ] Monthly plan purchase completes successfully
- [ ] After purchase, gated screens (meal plan, savings, etc.) are accessible
- [ ] Premium badge appears next to name on profile
- [ ] "Manage subscription" link appears on profile
- [ ] Upgrade prompt disappears after purchase
- [ ] Restore purchases works after reinstall
- [ ] Webhook arrives at your backend (check Railway logs)
- [ ] `GET /api/v1/app-subscriptions/status` returns `isPremium: true` after purchase

---

## Step 9: Go Live

Once sandbox testing passes:

1. Submit your app to App Store / Play Store review (see `ios.md` and `android.md`)
2. Ensure your backend is deployed with `REVENUECAT_WEBHOOK_SECRET` set
3. RevenueCat automatically switches from sandbox to production when your app is live

---

## Pricing Summary

| Plan | Price | Billing | Entitlement |
|---|---|---|---|
| Pro Monthly | $4.99/mo | Monthly | `pro` |
| Pro Yearly | $39.99/yr (~$3.33/mo) | Yearly | `pro` |
| Family Monthly | $7.99/mo | Monthly | `family` |
| Free | $0 | — | Limited features |

### Free Tier Limits

| Feature | Limit |
|---|---|
| Circles | 1 |
| List items | 50 |
| History | 30 days |
| Saved date ideas | 5 |

### Gated Screens (Pro/Family only)

- Meal Planning
- Savings Goals
- Wellness Trends
- Budget Insights
- Expense Insights
- Weekly Recap
- Countdowns

---

## Troubleshooting

### "No offerings available"
- Products must be in **"Ready to Submit"** or **"Approved"** state in App Store Connect
- Google Play products must have an **active base plan**
- Ensure products are linked to the correct offering in RevenueCat

### Purchase fails with "product not found"
- Product IDs must match exactly between the store and RevenueCat
- Wait 15-30 minutes after creating products for them to propagate

### Webhook not received
- Verify the webhook URL includes `/api/v1/` prefix
- Check that the Authorization header matches `Bearer {secret}`
- Check Railway logs for incoming requests

### Premium status not updating after purchase
- Ensure `syncWithRevenueCat()` is called after purchase (already handled in paywall.tsx)
- Check that entitlement IDs in RevenueCat match `pro` and `family` exactly

### Restore purchases shows "no subscription found"
- User must be signed in with the same Apple ID / Google account that made the purchase
- Sandbox purchases expire quickly — test with a fresh purchase
