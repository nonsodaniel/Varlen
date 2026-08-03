# iOS: Publishing (Existing Account)

Streamlined guide for publishing Sivena to the App Store using an existing Apple Developer account and EAS setup.

---

## Remaining Blockers — Fix These First

| # | Blocker | Where |
|---|---------|-------|
| 1 | Sentry DSN is empty | `apps/mobile/.env` |
| 2 | RevenueCat iOS key is empty | `apps/mobile/.env` |
| 3 | Bundle ID `com.sivena.app` not yet registered in Apple Developer Portal | developer.apple.com (Step 2) |
| 4 | App Store Connect app listing does not exist yet — create it to get the numeric App ID | appstoreconnect.apple.com (Step 3) |
| 5 | `eas.json` missing `ascAppId` — fill in numeric App ID from Step 3 (all other credentials already set) | `apps/mobile/eas.json` (Step 4) |
| 6 | App Store Connect listing needs screenshots, description, privacy URL, review info | appstoreconnect.apple.com (Step 5) |

---

## Step 1: Fill in `apps/mobile/.env`

Open `apps/mobile/.env` and set the two empty values:

```env
# Sentry DSN
# → sentry.io → your project (sivena-mobile) → Settings → Client Keys (DSN)
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@oXXXXX.ingest.sentry.io/XXXXXXX

# RevenueCat iOS key
# → app.revenuecat.com → Project → API Keys → Public app-specific keys → iOS
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> The Google OAuth keys are already filled in. Do not change them.

---

## Step 2: Register the App ID in Apple Developer Portal

The bundle ID `com.sivena.app` must be registered before App Store Connect will allow you to create a listing.

1. Go to [developer.apple.com](https://developer.apple.com) → **Account** → **Certificates, Identifiers & Profiles** → **Identifiers** → **+**
2. Select **App IDs** → **Continue**
3. Select type **App** → **Continue**
4. Fill in:
   - **Description:** `Sivena`
   - **Bundle ID:** Explicit → `com.sivena.app`
   - **Capabilities** — enable:
     - **Sign In with Apple** (required — app uses it)
     - **Push Notifications**
     - **Associated Domains** (for `applinks:sivena.app`)
5. Click **Continue** → **Register**

---

## Step 3: Create the App Store Connect Listing

You must do this before filling in `eas.json` — you need the numeric App ID that ASC generates.

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**
2. Fill in:
   - Platform: **iOS**
   - Name: **Sivena**
   - Bundle ID: **com.sivena.app** (select from dropdown — it appears after Step 2)
   - Primary language: **English (U.S.)**
   - SKU: `sivena-ios-001`
3. Click **Create**
4. On the next screen go to **App Information** — note the **Apple ID** value (a numeric ID like `6743291234`). You'll need this in the next step.

---

## Step 4: Fill in `ascAppId` in `eas.json`

All credentials are already set from your existing Apple account. The only remaining placeholder is `ascAppId` — replace it after completing Step 3:

```json
"ascAppId": "6796857233"
```

Replace with the numeric Apple ID shown in App Store Connect → Sivena → **App Information** (e.g. `6743291234`).

**Already filled in (from existing account):**

| Field | Value |
|-------|-------|
| `appleId` | `mybuddi.ai@gmail.com` |
| `appleTeamId` | `6UATB3SSW3` |
| `ascApiKeyId` | `3KW4XXHLVG` |
| `ascApiKeyPath` | `./misc/ios/AuthKey_3KW4XXHLVG.p8` |

---

## Step 5: Complete the App Store Connect Listing

Work through each tab in App Store Connect → Sivena.

---

### Tab: App Information

| Field | Value |
|-------|-------|
| Name | `Sivena` |
| Subtitle (30 chars) | `Life coordination for everyone` |
| Primary Category | **Productivity** |
| Secondary Category | **Lifestyle** |
| Content Rights | No third-party content |

---

### Tab: Pricing and Availability

Set price to **Free**. Leave availability as all territories unless you want to restrict.

---

### Tab: App Store (version 1.0)

Click on **English (U.S.)** under the localizations section to enter text fields.

#### Screenshots (required)

Take screenshots on a physical iPhone or via the iOS Simulator (**Cmd+S** to save).

| Device | Resolution | Required |
|--------|-----------|----------|
| iPhone 6.7" (15 Pro Max) | 1290×2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242×2688 | Yes |

Recommended screens to capture (min 2, max 10 per size):
1. Home/dashboard
2. Calendar view
3. Tasks & lists
4. Expenses view
5. Memories / add memory flow

#### Description (4000 chars max)

```
Life is better when you're in sync.

Sivena is the all-in-one coordination app for every chapter of life — whether you're navigating it solo, building something with a partner, raising a family, or in the beautiful chaos of parenthood.

No more missed appointments. No more "who's doing the shopping?" No more scattered notes and forgotten moments.

— FOR YOU (Personal Mode) —
Your tasks, your calendar, your expenses, your memories — all in one place. Stay on top of your life without the overwhelm.

— FOR YOU & YOUR PARTNER (Couple Mode) —
A shared space for two. Plan together, split expenses, stay on top of tasks, and build a private album of your moments. Stay in sync without the constant check-ins.

— FOR YOUR FAMILY (Family Mode) —
Everyone on the same page — finally. Assign chores, coordinate schedules, manage the household budget, and keep a shared album the whole family can add to.

— FOR PARENTS (Parenting Mode) —
Track milestones, coordinate routines, manage school schedules, and capture memories as your kids grow. Because the chaos of parenting deserves great tools.

FEATURES
• Shared Calendar — real-time syncing for everyone in your household
• Tasks & Lists — create, assign, and check off tasks and shopping lists
• Expenses — log spending, split costs, and view summaries
• Memories — a shared album for your best moments, big and small
• Insights — weekly recaps to help you stay connected and on track
• Household Invites — add a partner, family member, or co-parent in seconds

Switch between modes any time as your life evolves. Your data always comes with you.

Privacy-first: all data is encrypted in transit. We never sell your information. You can delete your account and all data at any time from within the app.

Download Sivena. Get life sorted.
```

#### Keywords (100 chars max, comma-separated)

```
couple,family,tasks,calendar,shared,planner,parenting,expenses,memories,household,coordination
```

#### Promotional Text (170 chars — updateable without resubmission)

> Found under **English (U.S.)** localization, above the Description field.

```
From solo living to parenting — Sivena keeps your tasks, calendar, expenses & memories in sync for every stage of life.
```

#### Other text fields

| Field | Value |
|-------|-------|
| Support URL | `https://sivena.app/support` |
| Marketing URL | `https://sivena.app` |
| What's New in This Version | `Sivena is now available on the App Store. Shared life coordination for couples, families, individuals, and parents.` |

---

### Tab: App Privacy

1. Set **Privacy Policy URL** → `https://sivena.app/privacy`
2. Click **Get Started**

**Question: "Do you or your third-party partners collect data from this app?"**
→ Select **Yes, we collect data from this app** → Next

**Question: "Select all data types your app collects"**
→ Check these categories only:
- **Contact Info** (name, email address)
- **User Content** (photos or videos, other user content — notes, tasks)
- **Identifiers** (user ID — the account ID stored on your servers)
- **Diagnostics** (crash data, performance data — from Sentry)

→ Leave everything else unchecked (no location, no health, no financial, no contacts, no browsing history, no purchases) → **Save**

---

Apple will now ask follow-up questions for each category you selected:

**Contact Info → Name**
- Purpose → **App Functionality**
- Linked to user's identity? → **Yes**
- Used for tracking? → **No**

**Contact Info → Email Address**
- Purpose → **App Functionality**
- Linked to user's identity? → **Yes**
- Used for tracking? → **No**

**User Content → Photos or Videos**
- Purpose → **App Functionality**
- Linked to user's identity? → **Yes**
- Used for tracking? → **No**

**User Content → Other User Content** (tasks, notes, calendar events)
- Purpose → **App Functionality**
- Linked to user's identity? → **Yes**
- Used for tracking? → **No**

**Identifiers → User ID**
- Purpose → **App Functionality**
- Linked to user's identity? → **Yes**
- Used for tracking? → **No**

**Diagnostics → Crash Data**
- Purpose → **Analytics**
- Linked to user's identity? → **No**
- Used for tracking? → **No**

**Diagnostics → Performance Data**
- Purpose → **Analytics**
- Linked to user's identity? → **No**
- Used for tracking? → **No**

---

When done, click **Publish** to make the privacy label live.

---

### Tab: App Review Information

| Field | Value |
|-------|-------|
| First name | Your first name |
| Last name | Your last name |
| Phone | Your phone number |
| Email | Your email |

**Demo account** (required):
- Create a test account in the app
- Pre-populate it with a task, calendar event, and a memory
- Add the credentials in the **Notes** field:

```
Demo account:
Email: reviewer@sivena.app
Password: TestAccount123!

Couple-mode account with sample data pre-loaded (tasks, calendar event, memory).
Sign In with Apple and Google Sign-In are also available on the login screen.
```

---

## Step 6: Log in to EAS (if not already)

```bash
cd apps/mobile
eas whoami          # check current login
eas login           # log in if needed
```

---

## Step 7: Build for Production

```bash
cd apps/mobile
eas build --platform ios --profile production
```

- Certificates managed remotely (`credentialsSource: "remote"`) — no Xcode needed
- Build runs on Expo's cloud servers
- Build ID shown in output and at expo.dev

---

## Step 8: Submit to App Store Connect

Once the build shows a green checkmark on expo.dev (~15–25 min after triggering):

```bash
eas submit --platform ios --profile production --latest
```

Or trigger build + submit together:

```bash
eas build --platform ios --profile production --auto-submit
```

EAS will prompt for App Store Connect credentials (Apple ID password or API key) on first run — use the same account as always.

---

## Step 9: Select the Build in App Store Connect

1. Go to App Store Connect → **My Apps** → **Sivena**
2. Under the version, click **+** next to Build
3. Select the newly processed build
4. If asked about encryption: select **No** (`ITSAppUsesNonExemptEncryption: false` is already set in `app.json`)

---

## Step 10: Submit for Review

1. Confirm there are no red warnings on the version page
2. Click **Add for Review**
3. Click **Submit to App Review**

First submissions typically take 24–48 hours.

---

## Step 11: After Approval

Once approved, the release status changes to **Ready for Sale** (releases immediately unless you set a manual date).

**JS-only changes** (no new native modules, no permission changes):
```bash
eas update --branch production --message "Fix: <description>"
```
Ships to users OTA — no App Store review needed.

**Native changes** (new packages, new permissions, config changes):
Repeat Steps 7–10 with an incremented version.

---

## Quick Reference: Common Issues

| Issue | Fix |
|-------|-----|
| `No suitable application records found` | Bundle ID `com.sivena.app` must exist in App Store Connect |
| `Invalid credentials` on submit | Run `eas credentials` to reset or use an App Store Connect API key |
| Build stuck in `Processing` on ASC | Normal — wait 10–15 min after EAS reports it done |
| `ascAppId not found` | Use the **numeric** Apple ID from App Information, not the bundle ID string |
| Rejected: missing Sign In with Apple | Already implemented — confirm `usesAppleSignIn: true` is in `app.json` |

---

## Credentials Reference

| Item | Value |
|------|-------|
| Bundle ID | `com.sivena.app` |
| EAS Project ID | `cdbcc2a8-ede1-41d0-8e14-e27dbe1fa285` |
| EAS Owner | `sivena-mobile` |
| Min iOS | 14.0 |
| Runtime Version | `1.0.0` |
