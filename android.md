# Android: From Here to Google Play Store

Complete step-by-step guide to publish Sivena on Google Play.

---

## Remaining Blockers — Fix These Before Building

| # | Blocker | Where |
|---|---------|-------|
| 1 | `google-service-account.json` missing | `apps/mobile/` (root of mobile app) |
| 2 | RevenueCat Android key is empty | `apps/mobile/.env` |
| 3 | Sentry DSN is empty (if not done for iOS already) | `apps/mobile/.env` |
| 4 | Play Store listing not complete | play.google.com/console |

---

## Fix 1: Create `google-service-account.json`

This is required for `eas submit` to upload the AAB to Google Play automatically. It is **not** the same as `google-services.json` for Firebase.

**Steps:**

1. Go to [Google Play Console](https://play.google.com/console) → **Setup** → **API access**
2. Click **Link to a Google Cloud project** (create a new one or link existing)
3. Under **Service accounts**, click **Create new service account**
4. Follow the link to Google Cloud Console:
   - Click **+ Create service account**
   - Name: `eas-submit`
   - Click **Create and continue**
   - Grant role: **Service Account User** → click **Continue** → **Done**
5. Back in Google Cloud Console → find the new service account → click the three-dot menu → **Manage keys**
6. **Add key** → **Create new key** → **JSON** → **Create**
7. A `.json` file downloads automatically
8. Rename it to `google-service-account.json` and place it at `apps/mobile/google-service-account.json`
9. Back in Play Console → **Setup** → **API access** → grant the service account **Release manager** permissions

> This file is already in `.gitignore` (it contains a private key — never commit it).

---

## Fix 2: Fill in `apps/mobile/.env`

```env
# RevenueCat Android key
# → app.revenuecat.com → Project → API Keys → Public app-specific keys → Android
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sentry DSN (if not set yet)
# → sentry.io → project (sivena-mobile) → Settings → Client Keys (DSN)
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@oXXXXX.ingest.sentry.io/XXXXXXX
```

---

## Fix 3: Complete the Play Store Listing

### 3.1 Short description (80 chars max)
```
Shared tasks, calendar & memories for couples, families & parents.
```

### 3.2 Full description (4000 chars max)
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

### 3.3 Screenshots

Capture screenshots on a physical Android device or emulator (Android Studio → Extended controls → Screenshot):

| Type | Resolution | Required |
|------|-----------|----------|
| Phone portrait | 1080×1920 or higher | Min 2, max 8 |
| 7" tablet | 1200×1920 | Optional |
| 10" tablet | 1600×2560 | Optional |

Recommended screens: home/dashboard, calendar, tasks, expenses, memories/together tab.

### 3.4 Feature graphic
- Size: **1024×500 PNG or JPG**
- Create a branded banner — app name + tagline on a solid or gradient background
- Tools: Canva, Figma, or Photoshop

### 3.5 App icon for Play Store
- Size: **512×512 PNG**, 32-bit, no alpha channel
- Export from `apps/mobile/assets/icon.png` and resize

### 3.6 Content rating questionnaire
Play Console → **Policy** → **App content** → **Content rating**:
- Category: **Utility**
- All violence/sexual/language/gambling questions: **No**
- User interaction: **Yes** → limited to closed group (household): **Yes** → location sharing: **No**
- Expected rating: **Everyone / PEGI 3**
- See Phase 1 → Section 1.4 for exact question-by-question answers

### 3.7 Data safety form
Play Console → **Policy** → **App content** → **Data safety**:

| Data type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Name | Yes | No | No | App functionality |
| Email address | Yes | No | Yes | Account management |
| User IDs | Yes | No | Yes | Account management |
| Photos | Yes | Yes (household members only) | No | App functionality |
| App interactions | Yes | No | No | Analytics |
| Crash logs | Yes | No | No | Analytics |
| Device identifiers | Yes | No | No | Analytics |

- Encryption in transit: **Yes**
- Users can request deletion: **Yes**
- Privacy policy URL: `https://sivena.app/privacy`
- See Phase 1 → Section 1.5 for exact form answers

---

## Phase 1: Google Play Console Setup

### 1.1 Create a Google Play Developer Account
- Go to https://play.google.com/console/signup
- Pay the one-time **$25 registration fee**
- Use a business or personal Google account (cannot change later)
- Verification takes **24-48 hours** for identity/address

### 1.2 Create the App Listing
1. Open Google Play Console > **All apps** > **Create app**
2. Fill in:
   - App name: **Sivena**
   - Default language: **English (US)**
   - App or game: **App**
   - Free or paid: **Free**
3. Accept all declarations

### 1.3 Complete the Store Listing
Navigate to **Grow > Store presence > Main store listing**:

| Field | Value |
|-------|-------|
| App name | Sivena |
| Short description | Shared tasks, calendar & memories for couples, families & parents (max 80 chars) |
| Full description | Use the full description from Fix 3.2 above |
| App icon | 512x512 PNG, 32-bit, no alpha — use `assets/icon.png` as base |
| Feature graphic | 1024x500 PNG — design a branded banner |
| Screenshots | Min 2, recommended 8 per device type (phone, tablet) |
| Phone screenshots | 1080x1920 or 1440x2560 (portrait) |

### 1.4 Content Rating
**Policy > App content > Content rating** → Start questionnaire

- Category: **Utility**
- Does the app contain violence? → **No**
- Cartoon or fantasy violence? → **No**
- Sexual content or nudity? → **No**
- Tobacco, alcohol, or drugs? → **No**
- Crude language or profanity? → **No**
- Gambling or simulated gambling? → **No**
- Users interact with each other? → **Yes**
  - Limited to a closed group (family/household)? → **Yes**
  - Users can share location? → **No**
- Horror or fear-inducing content? → **No**

→ Save questionnaire → Calculate rating → Apply rating
→ Result: **Everyone / PEGI 3**

---

### 1.5 Data Safety
**Policy > App content > Data safety**

**Data collection and security:**
- Does your app collect or share user data? → **Yes**
- Is data encrypted in transit? → **Yes**
- Can users request data deletion? → **Yes**

**Data types — check only these:**

| Category | Data type | Collected | Shared with | Required | Purpose |
|----------|-----------|-----------|-------------|----------|---------|
| Personal info | Name | Yes | No one | No | App functionality |
| Personal info | Email address | Yes | No one | Yes | Account management |
| Personal info | User IDs | Yes | No one | Yes | Account management |
| Photos & videos | Photos | Yes | Household members only | No | App functionality |
| App activity | App interactions | Yes | No one | No | Analytics |
| App activity | Crash logs | Yes | No one | No | Analytics |
| Device identifiers | Device or other IDs | Yes | No one | No | Analytics |

All other categories (location, messages, audio, files, calendar, contacts, web browsing, financial info) → **not collected**

**Security practices:**
- Uses encryption when transferring data? → **Yes**
- Follows Families Policy? → **No**

→ Save → Submit

---

### 1.6 App Access
**Policy > App content > App access** → Manage

- Access type: **All or some functionality is restricted**
- Click **Add new instructions**

| Field | Value |
|-------|-------|
| Instruction title | `Demo account login` |
| Username / Email | `alex.sivena.demo@gmail.com` |
| Password | *(your demo account password)* |
| Other instructions | `Sign in with the credentials above. Browse all tabs: Home, Calendar, Tasks, Expenses, Memories. To test household features, tap the profile icon → Household.` |

→ Save

---

### 1.7 Target Audience and Content
**Policy > App content > Target audience and content** → Manage

- Target age group: check **Ages 18 and over** only (uncheck all others)
- Does your app appeal to children? → **No, my app does not appeal to children**
- Does your app contain ads? → **No**

→ Save

---

### 1.8 Privacy Policy
**Policy > App content > Privacy policy** (or Store settings)

- Privacy policy URL: `https://sivena.app/privacy`

→ Save

---

### 1.8 Privacy Policy
Navigate to **Policy > App content > Privacy policy** (or **Grow > Store presence > Store settings**).

**Step 1 — Enter the URL**

| Field | Value |
|-------|-------|
| Privacy policy URL | `https://sivena.app/privacy` |

**Step 2** — Click **Save**.

> The privacy policy page must be publicly accessible (no login required). Verify it loads before submitting: open https://sivena.app/privacy in a browser. If the page is not live yet, deploy it before submitting for review — Google will reject the app without it.

---

## Phase 2: Generate Production Signing Key

### 2.1 Generate a Keystore

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore sivena-release.keystore \
  -alias sivena-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Sivena, OU=Mobile, O=Sivena, L=Lagos, ST=Lagos, C=NG"
```

When prompted, create a **strong password** and save it securely (password manager).

### 2.2 Store the Keystore Safely

**CRITICAL**: If you lose this keystore, you can NEVER update your app.

- Store `sivena-release.keystore` in a secure location (NOT in git)
- Back it up to an encrypted cloud drive
- Save the password in a password manager
- Record the alias (`sivena-key`)

### 2.3 Configure Gradle Signing

Create `apps/mobile/android/keystore.properties` (add to .gitignore):

```properties
SIVENA_RELEASE_STORE_FILE=../sivena-release.keystore
SIVENA_RELEASE_STORE_PASSWORD=your-keystore-password
SIVENA_RELEASE_KEY_ALIAS=sivena-key
SIVENA_RELEASE_KEY_PASSWORD=your-key-password
```

### 2.4 Update build.gradle

Edit `apps/mobile/android/app/build.gradle`:

```gradle
// Add at the top, before android block:
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['SIVENA_RELEASE_STORE_FILE'])
                storePassword keystoreProperties['SIVENA_RELEASE_STORE_PASSWORD']
                keyAlias keystoreProperties['SIVENA_RELEASE_KEY_ALIAS']
                keyPassword keystoreProperties['SIVENA_RELEASE_KEY_PASSWORD']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2.5 Move Keystore File
2
```bash
cp sivena-release.keystore apps/mobile/android/sivena-release.keystore
```

Ensure `.gitignore` already excludes `*.keystore` (it does).

---

## Phase 3: Build the Production AAB

Google Play requires **Android App Bundle (AAB)**, not APK.

### Option A: Local Build

```bash
cd apps/mobile/android
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### Option B: EAS Build (Recommended)

```bash
# Install EAS CLI if not installed
npm install -g eas-cli

# Login
eas login

# Build production AAB
eas build --platform android --profile production
```

EAS handles signing automatically if you upload your keystore:

```bash
eas credentials
# Select Android > production > Keystore > Upload
```

---

## Phase 4: Pre-Launch Testing

### 4.1 Internal Testing Track
1. Google Play Console > **Testing > Internal testing**
2. Create a new release
3. Upload the `.aab` file
4. Add internal testers (up to 100 email addresses)
5. Testers get a private install link

### 4.2 Test Checklist

- [ ] App installs and opens correctly
- [ ] Registration and login work
- [ ] Google Sign-In works
- [ ] Push notifications received
- [ ] All tabs load without crashes
- [ ] Dark mode looks correct
- [ ] Onboarding flow completes
- [ ] Quick-add button works
- [ ] Deep links work (`sivena://join/...`)
- [ ] Offline mode gracefully degrades
- [ ] App handles poor network conditions
- [ ] Back button behavior is correct on all screens
- [ ] No ANR (Application Not Responding) errors
- [ ] Battery and memory usage reasonable

### 4.3 Pre-Launch Report
Google Play automatically runs pre-launch tests on Firebase Test Lab.
Check: **Quality > Pre-launch report** for accessibility, security, and crash issues.

---

## Phase 5: Production Release

### 5.1 Version Numbering
Update `app.json` before each release:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}
```

- `version`: Displayed to users (semver: 1.0.0 -> 1.1.0 -> 2.0.0)
- `versionCode`: Must increment with every upload (1, 2, 3, ...)

### 5.2 Create Production Release
1. Google Play Console > **Production**
2. **Create new release**
3. Upload the signed `.aab`
4. Add release notes (what's new)
5. Review and **Start rollout**

### 5.3 Staged Rollout (Recommended)
- Start with **10%** of users
- Monitor crash rate in **Quality > Android vitals**
- If stable after 24-48h, increase to 50%, then 100%
- Halt rollout immediately if crash rate exceeds 1%

---

## Phase 6: Post-Launch

### 6.1 Monitor
- **Android Vitals**: Crash rate, ANR rate, startup time
- **Reviews**: Respond to user reviews within 24h
- **Statistics**: Track installs, uninstalls, active users

### 6.2 OTA Updates with Expo
For JS-only changes (no native module changes):

```bash
eas update --branch production --message "Bug fix description"
```

Users receive the update on next app open without going through the Play Store.

### 6.3 Store Listing Experiments
- A/B test different icons, screenshots, and descriptions
- Use **Custom store listings** for different countries

---

## Required Assets Checklist

| Asset | Size | Status | 
|-------|------|--------|
| App icon (Play Store) | 512x512 PNG | Need to export from icon.png |
| Feature graphic | 1024x500 PNG | Need to create |
| Phone screenshots (min 2) | 1080x1920+ | Need to capture |
| 7-inch tablet screenshots | 1200x1920 | Optional but recommended |
| 10-inch tablet screenshots | 1600x2560 | Optional but recommended |
| Short description | Max 80 chars | Need to write |
| Full description | Max 4000 chars | Need to write |
| Privacy policy URL | Public URL | Need: sivena.app/privacy |

---

## Environment Variables for Production Build

Set these in EAS secrets or your CI/CD:

```
EXPO_PUBLIC_API_URL=https://sivena-api-production.up.railway.app/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>
```

---

## Troubleshooting

### "App not installed" error
- Ensure the APK/AAB is signed with the correct keystore
- Uninstall any debug builds first

### Google Sign-In fails in production
- Add the **release** SHA-1 fingerprint to Google Cloud Console:
  ```bash
  keytool -list -v -keystore sivena-release.keystore -alias sivena-key
  ```
- Copy the SHA-1 and add it to your OAuth consent screen

### Push notifications not received
- Ensure `google-services.json` from Firebase is in `android/app/`
- Verify FCM is configured in Firebase Console
- Check the server key is set in your backend

### App crashes on launch
- Check `adb logcat` for errors
- Ensure ProGuard rules don't strip required classes
- Test with `--minify` flag locally first

                                                           
⏺ The API can't tell us which specific precondition is     
  missing — Google Play requires several steps to be         
  completed in the Play Console web UI before a new app can  
  be submitted to production. These cannot be done via the 
  API.                                                       
                                                             
  Here's what you need to complete in Play Console for     
  com.sivena.app:                                            
                  
  Required steps (Play Console → Sivena → Policy section): 

  1. Content rating — Complete the IARC questionnaire (Takes
  ~5 min, rates the app for different regions). Go to: Policy
   → App content → Content rating
  2. Data safety form — Declare what user data the app
  collects/shares. Go to: Policy → App content → Data safety
  3. App access — Add demo account credentials for reviewers.
   Go to: Policy → App content → App access
    - You can use: alex.sivena.demo@gmail.com (already set on
   iOS)
  4. Target audience — Declare who the app targets (adults).
  Go to: Policy → App content → Target audience and content
  5. Privacy policy — Set the URL in store listing. Go to:
  Store presence → Store settings and set
  https://sivena.app/privacy

  What's already done:
  - ✅ Latest build (version code 3) on internal track
  - ✅ Feature graphic uploaded (1024x500, generated from
  mobile-banner.svg)
  - ✅ Store listing: title, description, short description,
  8 phone screenshots, icon
  - ✅ Contact details set

  Once those 5 items are complete, run this to push to
  production:

  cd apps/mobile && eas submit --platform android --profile
  production --latest

  But first update eas.json to change the Android track from
  "internal" to "production":