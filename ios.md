# iOS: From Here to the App Store

Complete step-by-step guide to publish Sivena on Apple's App Store.

---

## Prerequisites

- A Mac with Xcode 15+ installed
- An Apple ID
- $99/year for the Apple Developer Program

---

## Phase 1: Apple Developer Account

### 1.1 Enroll in the Apple Developer Program
1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID
3. Choose **Individual** or **Organization**:
   - **Individual**: Use your legal name, faster approval (24-48h)
   - **Organization**: Requires a D-U-N-S number, longer approval (1-2 weeks)
4. Pay the **$99/year** fee
5. Wait for enrollment approval

### 1.2 Accept Agreements
1. Log in to https://appstoreconnect.apple.com
2. Go to **Agreements, Tax, and Banking**
3. Accept the **Paid Applications** agreement (even for free apps)
4. Add your bank account and tax information

---

## Phase 2: Certificates & Provisioning

### Option A: Let EAS Handle Everything (Recommended)

EAS Build manages certificates automatically:

```bash
# Login to Expo
eas login

# EAS will create/manage certificates for you
eas build --platform ios --profile production
```

When prompted:
- Select **Let Expo handle it** for both Distribution Certificate and Provisioning Profile
- EAS will create an Apple Distribution Certificate and App Store Provisioning Profile

### Option B: Manual Setup

If you need manual control:

#### 2.1 Create a Distribution Certificate

1. Open **Keychain Access** on your Mac
2. **Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority**
   - Email: your Apple ID email
   - Common Name: your name
   - Save to disk
3. Go to https://developer.apple.com/account/resources/certificates
4. Click **+** > **Apple Distribution**
5. Upload the CSR file
6. Download the `.cer` file
7. Double-click to install in Keychain

#### 2.2 Register the App ID

1. Go to https://developer.apple.com/account/resources/identifiers
2. Click **+** > **App IDs** > **App**
3. Fill in:
   - Description: **Sivena**
   - Bundle ID: **com.sivena.app** (Explicit)
4. Enable capabilities:
   - **Push Notifications**
   - **Associated Domains** (for deep links)
   - **Sign In with Apple** (if adding later)
5. Click **Continue** > **Register**

#### 2.3 Create a Provisioning Profile

1. Go to https://developer.apple.com/account/resources/profiles
2. Click **+** > **App Store Connect**
3. Select the **com.sivena.app** App ID
4. Select your Distribution Certificate
5. Name it: **Sivena App Store**
6. Download and double-click to install

#### 2.4 Configure Push Notifications

1. Go to **Identifiers** > **com.sivena.app** > **Push Notifications** > **Configure**
2. Create an **APNs Authentication Key** (or certificate):
   - Go to **Keys** > **+**
   - Name: **Sivena Push Key**
   - Check **Apple Push Notifications service (APNs)**
   - Download the `.p8` file
   - Record the **Key ID** and your **Team ID**
3. Configure your backend to use this key for sending push notifications

---

## Phase 3: Update iOS Entitlements for Production

### 3.1 Fix APS Environment

The entitlements file is currently set to "development". For App Store builds:

Edit `apps/mobile/ios/Sivena/Sivena.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>aps-environment</key>
    <string>production</string>
</dict>
</plist>
```

> **Note**: If using EAS Build, this is handled automatically based on the build profile.

### 3.2 Add Associated Domains (for Deep Links)

If using universal links (e.g., `sivena.app/join/...`):

Add to entitlements:
```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:sivena.app</string>
</array>
```

Then host an `apple-app-site-association` file at `https://sivena.app/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.sivena.app",
        "paths": ["/join/*"]
      }
    ]
  }
}
```

---

## Phase 4: Build for App Store

### Option A: EAS Build (Recommended)

```bash
# Build for App Store submission
eas build --platform ios --profile production
```

This produces an `.ipa` file signed for App Store distribution.

### Option B: Local Build via Xcode

```bash
cd apps/mobile

# Install pods
npx pod-install

# Open in Xcode
open ios/Sivena.xcworkspace
```

In Xcode:
1. Select **Sivena** target
2. **Signing & Capabilities** tab:
   - Team: Your Apple Developer Team
   - Bundle Identifier: `com.sivena.app`
   - Provisioning Profile: **Sivena App Store** (or Automatic)
3. Select **Any iOS Device (arm64)** as the build target
4. **Product > Archive**
5. Once archived, **Distribute App > App Store Connect**

---

## Phase 5: App Store Connect Setup

### 5.1 Create the App

1. Go to https://appstoreconnect.apple.com
2. **My Apps** > **+** > **New App**
3. Fill in:
   - Platform: **iOS**
   - Name: **Sivena** (unique on the App Store)
   - Primary language: **English (U.S.)**
   - Bundle ID: **com.sivena.app**
   - SKU: **sivena-ios-001** (internal reference)
   - Full Access: **Yes**

### 5.2 App Information

Navigate to **App Information**:

| Field | Value |
|-------|-------|
| Name | Sivena |
| Subtitle | Life coordination made simple |
| Category | Lifestyle (Primary), Productivity (Secondary) |
| Content Rights | Does not contain third-party content |
| Age Rating | 4+ (no objectionable content) |

### 5.3 Pricing and Availability

- Price: **Free**
- Availability: **All territories** (175+ countries)
- Pre-order: Optional

### 5.4 App Privacy (Required)

Navigate to **App Privacy**:

| Data Type | Linked to Identity | Used for Tracking |
|-----------|--------------------|--------------------|
| Contact Info (Name, Email) | Yes | No |
| User Content | Yes | No |
| Identifiers (Device ID) | No | No |
| Usage Data | No | No |

- Privacy Policy URL: `https://sivena.app/privacy` (must be publicly accessible)
- Tracking: **No** (unless you add analytics SDKs later)

### 5.5 Prepare the Version

Navigate to your app version (1.0):

**Screenshots** (required per device):

| Device | Size | Required |
|--------|------|----------|
| iPhone 6.7" (15 Pro Max) | 1290x2796 | Yes (covers all iPhones) |
| iPhone 6.5" (11 Pro Max) | 1242x2688 | Yes |
| iPhone 5.5" (8 Plus) | 1242x2208 | Optional |
| iPad Pro 12.9" (6th gen) | 2048x2732 | If supporting iPad |

Minimum 2 screenshots, maximum 10 per device class.

**App Preview Videos** (optional but recommended):
- 15-30 second video showing key features
- Same dimensions as screenshots

**Other fields**:

| Field | Value |
|-------|-------|
| Promotional Text | Can be updated without a new version (170 chars) |
| Description | Full app description (4000 chars max) |
| Keywords | sivena, planner, couple, family, tasks, calendar, shared, coordination (100 chars max, comma-separated) |
| Support URL | https://sivena.app/support |
| Marketing URL | https://sivena.app |
| What's New | First release |

### 5.6 Review Information

| Field | Value |
|-------|-------|
| First Name | Your first name |
| Last Name | Your last name |
| Phone | Your phone number |
| Email | Your email |
| Demo Account | Provide test credentials for the reviewer |
| Notes | Brief description of app functionality for the reviewer |

**Demo Account**: Create a test account with pre-populated data so the Apple reviewer can test all features without needing to register.

---

## Phase 6: Submit the Build

### 6.1 Upload via EAS

```bash
# Submit the latest EAS build to App Store Connect
eas submit --platform ios --latest
```

Or specify a build:
```bash
eas submit --platform ios --id <build-id>
```

### 6.2 Upload via Xcode

If you archived locally:
1. **Xcode > Window > Organizer**
2. Select the archive
3. **Distribute App** > **App Store Connect** > **Upload**

### 6.3 Upload via Transporter

1. Download **Transporter** from the Mac App Store
2. Drag and drop the `.ipa` file
3. Click **Deliver**

### 6.4 Select the Build in App Store Connect

1. After upload, wait 5-15 minutes for processing
2. Go to your app version in App Store Connect
3. Under **Build**, click **+** and select the uploaded build
4. If prompted about Export Compliance, select **No** (app uses standard HTTPS only, and `ITSAppUsesNonExemptEncryption` is already set to `false` in app.json)

---

## Phase 7: App Review

### 7.1 Submit for Review

1. Ensure all fields are filled (screenshots, description, privacy policy, etc.)
2. Click **Add for Review**
3. Click **Submit to App Review**

### 7.2 Review Timeline

- **First submission**: 24-48 hours (can be longer)
- **Updates**: Usually 24 hours
- **Expedited review**: Request at https://developer.apple.com/contact/app-store/?topic=expedite if critical

### 7.3 Common Rejection Reasons and How to Avoid Them

| Reason | Prevention |
|--------|------------|
| **Guideline 2.1 - Crashes** | Test thoroughly on real devices |
| **Guideline 2.3 - Incomplete** | Provide demo account, fill all metadata |
| **Guideline 4.0 - Design** | Follow Human Interface Guidelines |
| **Guideline 5.1.1 - Privacy** | Clear privacy policy, data safety labels |
| **Guideline 5.1.2 - Data Use** | Don't collect unnecessary data |
| **Guideline 2.5.1 - Software Requirements** | Use public APIs only |
| **Login requirement** | Always provide Sign In with Apple if you have social login |

**Important**: Since Sivena has Google Sign-In, Apple requires you to also offer **Sign In with Apple**. You may need to implement this before submission.

### 7.4 If Rejected

1. Read the rejection reason carefully in **Resolution Center**
2. Fix the issue
3. Submit a new build or reply in Resolution Center
4. Resubmit for review

---

## Phase 8: Post-Launch

### 8.1 Monitor

- **App Analytics**: Downloads, sessions, retention
- **Crash Reports**: Xcode Organizer or a crash reporting service
- **Ratings & Reviews**: Respond promptly

### 8.2 OTA Updates with Expo

For JS-only changes (no native code changes):

```bash
eas update --branch production --message "Fix description"
```

### 8.3 Native Updates

For changes involving native modules:
1. Increment version in `app.json`
2. Build with `eas build --platform ios --profile production`
3. Submit with `eas submit --platform ios --latest`
4. Submit for review (updates are usually reviewed faster)

### 8.4 TestFlight for Beta Testing

Before each release, you can test via TestFlight:
1. Upload a build to App Store Connect
2. Add internal testers (up to 100, no review needed)
3. Add external testers (up to 10,000, requires brief review)
4. Testers install via the TestFlight app

---

## Required Assets Checklist

| Asset | Size | Status |
|-------|------|--------|
| App icon | 1024x1024 PNG (no alpha, no rounded corners) | Need to export |
| iPhone 6.7" screenshots (min 2) | 1290x2796 | Need to capture |
| iPhone 6.5" screenshots (min 2) | 1242x2688 | Need to capture |
| iPad screenshots (if supporting) | 2048x2732 | Optional |
| App preview video | Same as screenshot size, .mp4 | Optional |
| Privacy policy URL | Public URL | Need: sivena.app/privacy |
| Support URL | Public URL | Need: sivena.app/support |
| Marketing URL | Public URL | Need: sivena.app |
| Description | Max 4000 chars | Need to write |
| Keywords | Max 100 chars | Need to choose |
| Demo account credentials | For Apple reviewer | Need to create |

---

## Sign In with Apple (Required)

Since Sivena has Google Sign-In, Apple requires Sign In with Apple. Implementation overview:

### Backend

1. Add Apple Sign-In verification to your auth service
2. Validate the Apple identity token against Apple's public keys
3. Create/link the user account

### Mobile

1. Install: `npx expo install expo-apple-authentication`
2. Enable the **Sign In with Apple** capability in your App ID
3. Add the button to your login screen
4. Send the Apple credential to your backend for verification

### app.json

```json
{
  "ios": {
    "usesAppleSignIn": true
  }
}
```

---

## EAS Build Configuration

Your `eas.json` production profile is already configured:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "autoIncrement": true
      }
    }
  }
}
```

To submit automatically after build:

```bash
eas build --platform ios --profile production --auto-submit
```

---

## Troubleshooting

### "No suitable application records were found"
- Ensure the bundle ID in `app.json` matches the one in App Store Connect
- Ensure your Apple Developer Team ID is correct

### Push notifications don't work
- Verify the APNs key (.p8) is configured on your push notification service
- Ensure the `aps-environment` entitlement matches the build type
- Check that the device token is being sent to your backend

### Build fails with signing errors
- Run `eas credentials` and reconfigure certificates
- Or use automatic signing: let EAS manage everything

### Google Sign-In fails
- Add the iOS URL scheme to `app.json` (already done: `com.googleusercontent.apps.130358336300-...`)
- Ensure the iOS client ID is correct in Google Cloud Console
- Add the bundle ID to the OAuth client in Google Cloud Console

### App rejected for missing Sign In with Apple
- Implement Sign In with Apple before resubmitting
- This is mandatory if you offer any third-party social login

### Slow review times
- Avoid submitting on Fridays or before holidays
- Provide clear review notes and a working demo account
- Respond quickly in Resolution Center if questions arise
