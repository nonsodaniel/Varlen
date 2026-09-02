# RevenueCat & App Store IAP Setup — Current Status

_Last updated: August 26, 2026_

---

## iOS — DONE

| Item | Status | Detail |
|---|---|---|
| Subscription Group "Sivena Pro" | ✅ | ID `22331804` |
| Group Localization (en-US) | ✅ | "Sivena Pro" |
| `com.sivena.app.pro.monthly` | ✅ READY_TO_SUBMIT | ID `6804718493`, $4.99/month, prices set for ~175 territories |
| `com.sivena.app.pro.yearly` | ✅ READY_TO_SUBMIT | ID `6804718623`, $39.99/year, prices set for ~175 territories |
| `com.sivena.app.pro.family` | ✅ READY_TO_SUBMIT | ID `6804718640`, $7.99/month, prices set for ~175 territories |
| English localizations (all 3) | ✅ | en-US with name + description |
| Review screenshots (all 3) | ✅ | COMPLETE, 2048×2732 |
| Promotional images (all 3) | ✅ | COMPLETE, 1024×1024 |
| Paid Applications agreement | ✅ | Active |
| Territory pricing (all ~175 countries) | ✅ | Fixed via API — was root cause of MISSING_METADATA |
| iOS build 20 | ✅ | Built + submitted to ASC via EAS |
| Android RC key in `.env` | ✅ | `goog_YUKLqXYoofXxKvIwGBYYCxOSmas` |

### Remaining iOS manual steps
- [ ] **ASC → submit app for App Review** — go to appstoreconnect.apple.com → Sivena → select build 20 → Add for Review → Submit (subscriptions reviewed together with app)
- [ ] **RevenueCat → add ASC API key** (web UI only, cannot be done via API):
  - [app.revenuecat.com](https://app.revenuecat.com) → your project → Store Configuration → App Store Connect API Key
  - Issuer ID: `f5f20725-eed0-42f3-9a7c-8b2ec089dec8`
  - Key ID: `3KW4XXHLVG`
  - Key file: `apps/mobile/misc/ios/AuthKey_3KW4XXHLVG.p8`

---

## Android — BLOCKED: Payments Profile Required

### What's done
| Item | Status | Detail |
|---|---|---|
| Android RC SDK key | ✅ | `goog_YUKLqXYoofXxKvIwGBYYCxOSmas` in `.env` |
| Google Play API access | ✅ | Service account `eas-submit@mybuddy-492119.iam.gserviceaccount.com` works |
| Google Play subscription products | ❌ NOT CREATED | Blocked by missing payments profile |
| RevenueCat Android products/offerings | ❌ NOT CONFIGURED | Depends on Play products existing first |

### Primary blocker: Google Play Payments Profile

Google Play returns `FAILED_PRECONDITION: Cannot create a subscription without first registering a payments profile for the developer account.`

**Steps to fix (manual, web UI only):**
1. Go to [play.google.com/console](https://play.google.com/console)
2. Left sidebar → **Setup** → **Payments profile**
3. Click **Create payments profile**
4. Fill in: business location (country — **cannot be changed later**), legal name & address (no PO boxes), contact info, public business info
5. Add a bank account for payouts (must be in same country as business location)

**If using Nigeria:**
- Nigeria is supported ✅
- Requires: Nigerian government-issued photo ID + proof of address
- Bank account must be a Nigerian bank

**Country cannot be changed after creation.** Choose whatever matches your actual legal business and bank.

### What I'll do automatically once payments profile is active

Come back and say "payments profile done" — I will then:
1. Create 3 Google Play subscription products via API:
   - `com.sivena.app.pro.monthly` — $4.99/month, base plan `monthly-auto`, period `P1M`
   - `com.sivena.app.pro.yearly` — $39.99/year, base plan `yearly-auto`, period `P1Y`
   - `com.sivena.app.pro.family` — $7.99/month, base plan `family-auto`, period `P1M`
2. Configure RevenueCat Android products, entitlements, and offerings to match iOS
3. Trigger new EAS build (both platforms) with updated `.env`

---

## RevenueCat Dashboard Config (iOS products — verify these exist)

### Products
Go to **RevenueCat → Products** and confirm all 3 exist for App Store:

| Product ID | Store | Type |
|---|---|---|
| `com.sivena.app.pro.monthly` | App Store | Subscription |
| `com.sivena.app.pro.yearly` | App Store | Subscription |
| `com.sivena.app.pro.family` | App Store | Subscription |

### Entitlements
Go to **RevenueCat → Entitlements** — must have exactly:

| Identifier | Attached Products |
|---|---|
| `pro` | monthly + yearly |
| `family` | family |

> The app code checks for exactly `pro` and `family` identifiers.

### Offering
Go to **RevenueCat → Offerings** → `default` offering (must be marked **Current**) with 3 packages:

| Package ID (must contain keyword) | Product |
|---|---|
| contains `monthly` | `com.sivena.app.pro.monthly` |
| contains `yearly` | `com.sivena.app.pro.yearly` |
| contains `family` | `com.sivena.app.pro.family` |

---

## How to Test iOS Payments (sandbox)

1. Create sandbox tester: App Store Connect → Users and Access → Sandbox Testers → +
2. On a **real device** (not simulator):
   - Settings → App Store → sign out of real Apple ID
   - Open Sivena → go to paywall → tap purchase
   - Sign in with sandbox tester account when prompted
3. Confirm purchase completes and premium features unlock
4. Test Restore Purchases button

---

## Master Checklist

### iOS
- [x] Products created in App Store Connect (all 3)
- [x] Prices set for all ~175 territories
- [x] Review screenshots uploaded
- [x] Promotional images uploaded
- [x] Paid Applications agreement Active
- [x] All 3 products: READY_TO_SUBMIT
- [x] iOS build 20 built + uploaded to ASC
- [x] Android RC key updated in `.env`
- [ ] Submit iOS app + subscriptions for App Review in ASC
- [ ] Add ASC API key to RevenueCat dashboard (web UI)
- [ ] Test full purchase flow on real device with sandbox tester after approval

### Android
- [x] Android RC SDK key set in `.env`
- [ ] **Create Google Play payments profile** ← CURRENT BLOCKER
- [ ] Create 3 Google Play subscription products (automated once profile exists)
- [ ] Configure RevenueCat for Android (automated once Play products exist)
- [ ] New EAS build for both platforms
- [ ] Add `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` to `.env` (from Google Cloud Console → Credentials → Android OAuth client for `com.sivena.app`)
