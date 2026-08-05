# Android: Publish Sivena to Google Play

The Google service account key has been copied from your existing Play account (buddi-mobile). Follow these steps in order.

---

## Step 1 — Create the App in Play Console

You're on the **Create app** screen. Fill in and scroll down to see all fields:

1. **App name** → type `Sivena`
2. **Default language** → select `English (United States)`
3. Scroll down → **App or game** → select **App**
4. Scroll down → **Free or paid** → select **Free**
5. Scroll down further → you'll see **Declarations** with two checkboxes:
   - ✅ *I acknowledge that my app must comply with the Google Play Developer Program Policies...*
   - ✅ *I acknowledge that as a developer, I am responsible for...*
   - Check both
6. Click **Create app** at the bottom right

> **Package name** is not entered here — it gets set automatically when you upload your first build (`com.sivena.app` from your `app.json`).

---

## Step 2 — Grant the Service Account Access to Sivena

Your existing service account (`eas-submit@mybuddy-492119.iam.gserviceaccount.com`) needs permission to manage Sivena specifically.

1. Play Console → **Users and permissions** (left sidebar, under Setup)
2. Click **Invite new users**
3. Email: `eas-submit@mybuddy-492119.iam.gserviceaccount.com`
4. Under **App permissions**, click **Add app** → select **Sivena**
5. Set role to **Release manager**
6. Click **Invite user** → **Send invite**

---

## Step 3 — Upload Store Assets

### App icon (already generated)
File is at `misc/android/icon-512.png` (512×512px). Upload it in:
Play Console → **Sivena** → **Grow** → **Store presence** → **Main store listing** → **App icon**

### Feature graphic (you need to create this)
Required size: **1024×500 PNG**. Make a simple banner:
- Background color: `#0F1020`
- App name **Sivena** in white text
- Tagline: *Life, together.*

Use [Canva](https://canva.com) — create a blank 1024×500px design, add the text, export as PNG → save to `misc/android/feature-graphic.png` → upload it.

### Screenshots
Upload at least 2 screenshots (minimum 1080×1920px).
You can reuse your iPhone screenshots from `misc/ios/` — they are close enough in size for Play Store to accept them.

### Short description (copy-paste this — max 80 chars)
```
Life coordination: shared tasks, calendar & memories for every stage.
```

### Full description (copy-paste this)
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

---

## Step 4 — Complete Required Policy Sections

Go to Play Console → **Sivena** → **Policy** → **App content**

### Content rating
- Click **Content rating** → **Start questionnaire**
- Category: **Utility**
- Answer **No** to all sensitive content questions
- Submit → expected rating: **Everyone**

### Data safety

#### Step 2 — Data collection and security
- Does your app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes**
- Which account creation methods does your app support?
  - ✅ Username and password
  - ✅ OAuth *(Google Sign-In and Apple Sign-In)*
- Delete account URL: `https://sivena.app/delete-account`
- Do you provide a way to delete some data without deleting the account? **No**

#### Step 3 — Data types (select these, skip everything else)
- **Personal info** → Name, Email address, User IDs
- **Financial info** → Purchase history *(RevenueCat subscription data)*, Other financial info *(in-app expense/budget tracker)*
- **Health and fitness** → Health info *(mood, sleep, water intake, wellness notes)*, Fitness info *(exercise tracking)*
- **Photos and videos** → Photos
- **Files and docs** → Files and docs
- **Calendar** → Calendar events
- **Contacts** → Contacts *(invited emails/phone numbers for household invites)*
- **App activity** → App interactions, Other user-generated content *(tasks, journals, goals, meal plans, baby logs, etc.)*
- **App info and performance** → Crash logs, Diagnostics
- **Device or other IDs** → Device or other IDs *(push tokens sent to Expo, device ID for sync)*

> Do NOT select: Location, Messages, Audio files, Web browsing

#### Step 4 — Data usage and handling (answer per data type)

For each data type, Play Console asks: Is it collected? Shared with third parties? Required or optional? Why?

**Name**
Collected. Not shared with third parties. Required — users must provide a name to create an account. Purpose: Account management.

**Email address**
Collected. Shared with Resend (transactional email delivery service) so we can send account-related emails. Required — used for login and account recovery. Purpose: Account management, App functionality.

**User IDs**
Collected. Shared with Sentry (error ID only, no personal info) and RevenueCat (to link subscriptions to accounts). Required. Purpose: App functionality.

**Purchase history**
Collected. Shared with RevenueCat — they manage subscription tracking and entitlements. Required for subscription users. Purpose: App functionality.

**Other financial info** *(in-app expense/budget tracker)*
Collected. Not shared with third parties — stored only on our servers. Optional — users choose whether to log expenses. Purpose: App functionality.

**Health info** *(mood, sleep hours, water intake, wellness notes)*
Collected. Not shared with third parties. Optional — users choose whether to log wellness data. Purpose: App functionality.

**Fitness info** *(exercise tracking)*
Collected. Not shared with third parties. Optional. Purpose: App functionality.

**Photos**
Collected. Not shared with third parties — photos are stored on our servers and visible only to members of the same household. Optional. Purpose: App functionality.

**Files and docs**
Collected. Not shared with third parties. Optional. Purpose: App functionality.

**Calendar events**
Collected. Not shared with third parties — synced only within the user's household. Optional. Purpose: App functionality.

**Contacts** *(invited emails/phone numbers for household invites)*
Collected. Not shared with third parties. Optional — only stored when a user sends a household invite. Purpose: App functionality.

**App interactions** *(notification preferences, settings)*
Collected. Not shared with third parties. Required for core app behaviour. Purpose: App functionality.

**Other user-generated content** *(tasks, journals, goals, meal plans, baby logs, polls, routines, lists, memories)*
Collected. Not shared with third parties — visible only to household members. Optional. Purpose: App functionality.

**Crash logs**
Collected. Shared with Sentry for error monitoring. PII is stripped before sending — only a user ID is included, no names or emails. Optional (user cannot opt out, but no personal info is sent). Purpose: Analytics.

**Diagnostics** *(performance data)*
Collected. Shared with Sentry. Optional. Purpose: Analytics.

**Device or other IDs** *(push notification tokens, device ID for sync)*
Collected. Push tokens are shared with Expo to deliver push notifications. Device IDs are stored on our servers for offline sync tracking. Optional — only collected if the user grants notification permission. Purpose: App functionality.

- Privacy policy URL: `https://sivena.app/privacy`

### Target audience
- Click **Target audience** → select **18 and over** → **No**, the app does not target children

### App access
- Click **App access** → select **All functionality requires sign-in**
- Add a test account:
  - Email: (create a test account in your app)
  - Password: (set a simple password)
  - Notes: `Sign in with email/password. No special permissions needed.`

---

## Step 5 — Build & Submit

Run this from your terminal (in `apps/mobile`):

```bash
cd /Users/nonso/Desktop/valen/apps/mobile
eas build --platform android --profile production --auto-submit
```

This builds the AAB on EAS servers and automatically uploads it to Play Console's **Internal testing** track using the service account key.

---

## Step 6 — Publish

After the build is uploaded:

1. Play Console → **Sivena** → **Testing** → **Internal testing**
2. Confirm the build appears
3. Add testers → share the opt-in link
4. When ready for public: **Production** → **Create new release** → select the build → **Start rollout to production**

---

## Notes

- `google-service-account.json` is in `.gitignore` — it will never be committed
- EAS auto-increments `versionCode` on every build (`autoIncrement: true`)
- For quick JS-only updates after launch (no full build): `eas update --branch production --message "your update"`
