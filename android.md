# Android: From Here to Google Play Store

Complete step-by-step guide to publish Sivena on Google Play.

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
| Short description | Life coordination for couples, families & individuals (max 80 chars) |
| Full description | Write a compelling 300-500 word description covering features |
| App icon | 512x512 PNG, 32-bit, no alpha — use `assets/icon.png` as base |
| Feature graphic | 1024x500 PNG — design a branded banner |
| Screenshots | Min 2, recommended 8 per device type (phone, tablet) |
| Phone screenshots | 1080x1920 or 1440x2560 (portrait) |

### 1.4 Content Rating
Navigate to **Policy > App content > Content rating**:
- Complete the IARC questionnaire
- Sivena has no violence, gambling, or mature content
- Expected rating: **Everyone / PEGI 3**

### 1.5 Data Safety Section
Navigate to **Policy > App content > Data safety**:

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name, Email | Yes | No | Account management |
| User-generated content | Yes | Yes (household members) | App functionality |
| Push notification tokens | Yes | No | Notifications |
| Device identifiers | Yes | No | Analytics |

Encryption: Select **Yes, my app uses encryption** (HTTPS/TLS).
Deletion: Select **Users can request data deletion** (you have the `/users/me` DELETE endpoint).

### 1.6 Target Audience
- Target age group: **18+** (avoid COPPA requirements)
- Ads: **No ads**

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
