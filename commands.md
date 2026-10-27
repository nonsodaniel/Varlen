# Sivena — Commands Reference

All mobile commands run from `apps/mobile/` unless noted.

---

## Backend

```bash
# Start dev server (with watch)
cd apps/backend && npm run start:dev

# Start production
cd apps/backend && npm run start:prod

# Docker (Postgres + Redis)
cd apps/backend && npm run docker:up
cd apps/backend && npm run docker:down

# Prisma
cd apps/backend && npm run prisma:migrate      # run dev migrations
cd apps/backend && npm run prisma:migrate:deploy  # deploy migrations (prod)
cd apps/backend && npm run prisma:generate     # regenerate client
cd apps/backend && npm run prisma:studio       # open Prisma Studio UI
cd apps/backend && npm run prisma:seed         # seed database

# Deploy backend
cd apps/backend && npm run deploy
```

---

## Mobile — Local Dev

```bash
# Start Expo dev server (requires dev client build installed on device)
cd apps/mobile && npm start

# iOS simulator — default device (iPhone 17 Pro)
cd apps/mobile && npm run ios:sim

# iOS simulator — specific simulator
cd apps/mobile && npx expo run:ios --device "iPhone 17 Pro Max"
cd apps/mobile && npx expo run:ios --device "iPad Pro 13-inch (M5)"

# Android emulator / connected device
cd apps/mobile && npm run android

# Web
cd apps/mobile && npm run web

# Rebuild native shell from scratch (iOS)
cd apps/mobile && npm run ios:rebuild
```

### Available iOS Simulators

| Simulator | UDID |
|---|---|
| iPhone 17 Pro | 56881537-FE3F-4071-8451-8B74FA6DDA5F |
| iPhone 17 Pro Max | B0A5FE76-9E74-43B7-A186-BFB8117F8508 |
| iPhone 17e | FA5663AE-5E87-49A5-9700-56E6560A5526 |
| iPhone Air | 21E4F0D8-FCB7-4ABE-A1A7-2BCB1EEB2648 |
| iPhone 17 | D1ACFEE9-A5A9-4638-8078-5F8D87016A3D |
| iPad Pro 13-inch (M5) | 9761E6C1-B7EC-4712-97F5-4F262BB66585 |
| iPad Pro 11-inch (M5) | 6601AB7A-941B-4811-BF3C-09F03C65BCBC |
| iPad mini (A17 Pro) | D5E4775E-51F6-4243-9BAE-7BE3DF8C46CA |
| iPad Air 13-inch (M4) | B7EC68F2-33EE-4CC1-ABFE-54D6FEEBC596 |
| iPad Air 11-inch (M4) | 206C7BAC-2E4D-4864-9BD6-3EE0DB33BE9A |
| iPad (A16) | AD3B07D8-CA15-493E-91EB-6A49A4F0A7CB |

```bash
# Target by UDID
cd apps/mobile && npx expo run:ios --udid 56881537-FE3F-4071-8451-8B74FA6DDA5F
```

---

## EAS Builds

> All `eas` commands run from `apps/mobile/`.

### Development Build (dev client)

```bash
# iOS simulator
cd apps/mobile && eas build --profile development --platform ios

# Android APK (for emulator/device)
cd apps/mobile && eas build --profile development --platform android

# Both platforms
cd apps/mobile && eas build --profile development --platform all
```

### Preview Build (internal distribution)

```bash
# iOS (ad-hoc, internal)
cd apps/mobile && eas build --profile preview --platform ios

# Android APK (internal)
cd apps/mobile && eas build --profile preview --platform android

# Both
cd apps/mobile && eas build --profile preview --platform all
```

### Production Build (App Store / Play Store)

```bash
# iOS (.ipa)
cd apps/mobile && eas build --profile production --platform ios

# Android (.aab)
cd apps/mobile && eas build --profile production --platform android

# Both
cd apps/mobile && eas build --profile production --platform all
```

---

## Prebuild (generate native projects)

```bash
# Generate ios/ and android/ folders
cd apps/mobile && npx expo prebuild

# Clean prebuild
cd apps/mobile && npx expo prebuild --clean

# iOS only
cd apps/mobile && npx expo prebuild --platform ios --clean

# Android only
cd apps/mobile && npx expo prebuild --platform android --clean
```

---

## Submit to Stores

### TestFlight (iOS)

```bash
# Submit latest iOS build to TestFlight
cd apps/mobile && eas submit --profile production --platform ios

# Submit a specific build ID
cd apps/mobile && eas submit --platform ios --id <build-id>
```

Apple credentials (stored in `eas.json`):
- Apple ID: `mybuddi.ai@gmail.com`
- App Store Connect App ID: `6796857233`
- Team ID: `6UATB3SSW3`
- API Key: `AuthKey_3KW4XXHLVG.p8`

### Google Play Store (Android)

```bash
# Submit latest Android build to internal track
cd apps/mobile && eas submit --profile internal --platform android

# Submit latest Android build to production track
cd apps/mobile && eas submit --profile production --platform android

# Submit a specific build ID
cd apps/mobile && eas submit --platform android --id <build-id>
```

Service account key: `apps/mobile/google-service-account.json`

### Build + Submit in one command

```bash
# iOS production: build then submit to TestFlight
cd apps/mobile && eas build --profile production --platform ios --auto-submit

# Android production: build then submit to Play Store
cd apps/mobile && eas build --profile production --platform android --auto-submit
```

---

## OTA Updates (expo-updates)

```bash
# Push OTA update to production channel
cd apps/mobile && eas update --branch production --message "describe the update"

# Push to preview channel
cd apps/mobile && eas update --branch preview --message "describe the update"

# Push to development channel
cd apps/mobile && eas update --branch development --message "describe the update"
```

> Runtime version is pinned to `1.0.0` in `app.json`. OTA updates only work within the same runtime version.

---

## Versioning

Current versions (in `apps/mobile/app.json`):
- App version: `1.0.2`
- iOS build number: `64`
- Android version code: `19`

`eas.json` is configured with `autoIncrement: true` for production builds — build numbers are bumped automatically by EAS.

---

## Type Check & Lint

```bash
# TypeScript check (mobile)
cd apps/mobile && npx tsc --noEmit

# TypeScript check (backend)
cd apps/backend && npx tsc --noEmit

# Lint backend
cd apps/backend && npm run lint
```

---

## Useful EAS Commands

```bash
# List all builds
eas build:list

# View build details
eas build:view <build-id>

# List submissions
eas submit:list

# Cancel a running build
eas build:cancel <build-id>

# View project info
eas project:info

# Login to EAS
eas login

# Who is logged in
eas whoami
```

---

## App Info

| Field | Value |
|---|---|
| App name | Sivena |
| Bundle ID (iOS) | `com.sivena.app` |
| Package (Android) | `com.sivena.app` |
| EAS Project ID | `cdbcc2a8-ede1-41d0-8e14-e27dbe1fa285` |
| EAS Owner | `sivena-mobile` |
| Updates URL | `https://u.expo.dev/cdbcc2a8-ede1-41d0-8e14-e27dbe1fa285` |
