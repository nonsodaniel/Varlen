# iOS: Publishing Sivena to the App Store

Complete guide covering the build pipeline, TestFlight testing, and App Store submission using your existing Apple Developer account and EAS setup.

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
| Subtitle (30 chars) | `Family Planner & Shared Tasks` |
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

> Do NOT repeat words already in your app name or subtitle (Sivena, Family, Planner, Shared, Tasks) — Apple won't index duplicates.

```
couple,chores,grocery,parenting,baby,milestone,organizer,household,expenses,calendar,tracker,sync
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

Run this command from `apps/mobile`:

```bash
eas build --platform ios --profile production
```

### What happens during the build

When you run this command, EAS takes over completely — you don't need Xcode open or any local tools beyond the EAS CLI:

1. **EAS reads your config** — it picks up `app.json`, `eas.json`, and your credentials from Expo's secure credential storage (certificates and provisioning profiles are managed remotely since `credentialsSource: "remote"`).

2. **Build queues on Expo's servers** — your source code is uploaded to Expo's build infrastructure. You'll see a build ID and a link to follow progress at `expo.dev`. The terminal will show queue position and then live build logs.

3. **Native compilation** — Expo compiles the React Native JavaScript bundle using Hermes, links native modules, signs the app with your Apple distribution certificate, and packages everything into an `.ipa` file.

4. **Build completes** — typically takes 15–25 minutes. When done, the status shows **finished** and an `.ipa` download link appears on expo.dev. At this point the build is ready to submit to Apple.

To check build status at any time:
```bash
eas build:list --platform ios --limit 3
```

The `Status` field will show one of: `in queue` → `in progress` → `finished` (or `errored` if something went wrong).

---

## Step 8: Submit to App Store Connect

Once the build shows `finished`, submit it to Apple:

```bash
eas submit --platform ios --profile production --latest
```

Or trigger build + submit in one command (recommended for future releases):

```bash
eas build --platform ios --profile production --auto-submit
```

### What happens during submission

EAS takes the `.ipa` from the finished build and uploads it to Apple using your App Store Connect API key (`AuthKey_3KW4XXHLVG.p8`). This step typically completes in 2–5 minutes. After EAS finishes uploading, Apple processes the build on their end — this processing step takes an additional 5–30 minutes before the build becomes available in App Store Connect and TestFlight.

You can track submission status in App Store Connect → **TestFlight** tab → **iOS Builds** — the build will appear with a yellow "Processing" badge that turns green when it's ready.

---

## Step 9: Attach the Build to the App Store Version

Once processing is complete:

1. Go to **App Store Connect** → **My Apps** → **Sivena** → **App Store** tab → version 1.0
2. Scroll down to the **Build** section and click **+**
3. Select the build that just appeared (it will show version 1.0.0 and the build number)
4. If Apple asks about export compliance (encryption): select **No** — `ITSAppUsesNonExemptEncryption: false` is already set in `app.json`, so this is pre-answered

---

## Step 10: TestFlight — Internal Testing

Before submitting for App Store review, use TestFlight to test the build with your team. Internal testers (up to 100 people) can install the build immediately with no Apple review required.

### Setting up an Internal Testing Group

1. Go to **App Store Connect** → **Sivena** → **TestFlight** tab
2. In the left sidebar under **Internal Testing**, you'll see a default group called **App Store Connect Users** — click it, or click **+** to create a new group with a custom name (e.g. "Core Team")
3. Click **+** next to **Testers** to add testers:
   - You can only add people who already have an App Store Connect role on your account (Admin, Developer, etc.)
   - Enter their Apple ID email address
   - They'll receive an email invitation from Apple
4. Click **+** next to **Builds** to add the build to this group:
   - Select the build you just submitted (1.0.0, build number 8 or whichever is latest)
   - Click **Done**

### How testers install the app

Once you've added a tester and a build to the group, the tester receives an email from Apple with the subject **"You have been invited to test [Sivena]"**. Here's what they do:

1. On their iPhone, open the email and tap **View in TestFlight**
2. This opens the **TestFlight app** (they may need to download it from the App Store first — it's free)
3. Inside TestFlight, they'll see Sivena listed under **Apps**
4. Tap **Install** — the app installs like any normal app but with a small orange dot on the icon indicating it's a test build
5. Open the app and test normally

### Sharing a direct install link (easier)

Instead of email invitations, you can share a direct link:
1. In TestFlight → your Internal Testing group → click **Enable Public Link** (top right of the group page)
2. Copy the link (format: `https://testflight.apple.com/join/XXXXXXXX`)
3. Send this link to any tester — they tap it on their iPhone, which opens TestFlight and installs the app directly

> Internal testing links are restricted to people on your Apple Developer account. For broader testing, use External Testing (below).

---

## Step 11: TestFlight — External Testing (Optional, Before App Store)

External testing lets you invite up to 10,000 testers using just their email — they don't need to be on your Apple Developer account. However, each build you add to an External group requires a one-time **Beta App Review** by Apple, which typically takes a few hours to 1–2 days.

### Setting up an External Testing Group

1. **TestFlight** tab → under **External Testing** → click **+** to create a new group (e.g. "Beta Users")
2. Click **+** next to **Testers**:
   - Enter the email address and first/last name of each tester
   - They don't need an Apple ID in advance — Apple will walk them through creating one if needed
   - Click **Add**
3. Click **+** next to **Builds** to add the build to this group
4. Fill in the **Test Information**:
   - **What to Test:** Describe what you'd like feedback on, e.g. `Please test the household invite flow, calendar sync, and expense splitting. Report any crashes or confusing UI.`
   - **App Description:** Brief description of the app
   - **Feedback Email:** `support@sivena.app`
5. Click **Submit for Review** — Apple reviews the build for beta (not a full App Store review, just checking for crashes and obvious issues)

### How external testers install the app

External testers receive an email from Apple with **"TestFlight Beta Invitation"**. The steps are identical to internal testers: install TestFlight, tap the link in the email, tap Install.

You can also enable a **Public Link** for external groups:
1. In the External Testing group → click **Enable Public Link**
2. You can set a cap on how many testers can use the link
3. Share the link anywhere (Twitter, Discord, email newsletter, etc.)

---

## Step 12: Collecting Feedback from Testers

TestFlight has a built-in feedback mechanism:

- **In-app feedback:** Testers can tap **Send Beta Feedback** from the TestFlight app while testing, or take a screenshot — TestFlight automatically prompts them to submit feedback on any screenshot taken while a TestFlight app is open
- **Crash reports:** Crashes are automatically captured and appear in App Store Connect → **Crashes** tab under each build
- **Feedback inbox:** All submitted feedback (screenshots, comments) appears in App Store Connect → **TestFlight** → your group → **Feedback** tab

You can also view crash symbolication (readable stack traces) in App Store Connect → **TestFlight** → **Crashes**.

---

## Step 13: Submit for App Store Review

When you're satisfied with testing:

1. Go to **App Store Connect** → **Sivena** → **App Store** tab → version 1.0
2. Confirm there are no red warning banners at the top of the page
3. Confirm all required fields are filled: screenshots, description, privacy policy, review info, build attached
4. Click **Add for Review** (top right)
5. On the confirmation screen, click **Submit to App Review**

Apple will review the app — first submissions typically take 24–48 hours. You'll receive an email when the status changes. Track status under **Activity** tab in App Store Connect.

If rejected, Apple provides a detailed rejection reason. Fix the issue and resubmit.

---

## Step 14: After Approval

Once approved, the status changes to **Ready for Sale** and the app goes live immediately (or on your scheduled release date).

**For JS-only updates** (bug fixes, UI changes — no new native modules or permission changes):
```bash
eas update --branch production --message "Fix: describe the change"
```
This ships the update over-the-air to all users within minutes — no App Store review needed.

**For native changes** (new packages with native code, new permissions, any `app.json` changes that affect native config):
- Increment the version or build number
- Repeat Steps 7–13

---

## Quick Reference: Common Issues

| Issue | Fix |
|-------|-----|
| `No suitable application records found` | Bundle ID `com.sivena.app` must exist in App Store Connect |
| `Invalid credentials` on submit | Run `eas credentials` to reset or use an App Store Connect API key |
| Build stuck in `Processing` on ASC | Normal — wait 10–30 min after EAS reports it done |
| `ascAppId not found` | Use the **numeric** Apple ID from App Information, not the bundle ID string |
| Rejected: missing Sign In with Apple | Already implemented — confirm `usesAppleSignIn: true` is in `app.json` |
| Tester says "no builds available" in TestFlight group | You haven't added the build to their group yet — go to the group → Builds → + |
| Internal tester didn't get email | Have them check spam, or use the direct public link instead |
| Beta review rejected | Usually crashes or missing metadata — fix and resubmit the build to the external group |

---

## Credentials Reference

| Item | Value |
|------|-------|
| Bundle ID | `com.sivena.app` |
| EAS Project ID | `cdbcc2a8-ede1-41d0-8e14-e27dbe1fa285` |
| EAS Owner | `sivena-mobile` |
| Min iOS | 14.0 |
| Runtime Version | `1.0.0` |
