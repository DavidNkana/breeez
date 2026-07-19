# Breeez — Native App Setup Guide (iOS + Android)

This guide walks through turning the Breeez web app into App Store + Play Store apps using Capacitor.

The approach: the native app is a small **webview wrapper** that loads the live Vercel deployment (`https://breeez-lyart.vercel.app`). This is the simplest, fastest, and most maintainable approach. All dynamic features (auth, cart, checkout) just work because they hit the live server.

---

## Prerequisites (already done ✅)

- [x] Apple Developer account
- [x] Google Play Developer account  
- [x] Capacitor packages installed (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/cli`)
- [x] `capacitor.config.ts` configured with app IDs and live server URL
- [x] Push notifications + splash screen packages installed

## Prerequisites (still needed ⚠️)

You'll need these for the build process:

### macOS
- **Xcode** (free from App Store) — required for iOS builds and signing
- **CocoaPods** (`sudo gem install cocoapods`) — for iOS dependency management
- An iOS **distribution certificate** + provisioning profile (Apple generates when you set up your App ID)

### Cross-platform
- **Android Studio** — for Android builds, emulator testing, signing
- A **Java JDK 17** (Android Studio usually bundles this)
- An Android **keystore file** for signing (you generate once, reuse forever)

---

## Step 1: Add native platform folders (one-time per platform)

```bash
cd /home/safai/breeez

# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android
```

This creates two folders: `ios/` and `android/`. These are YOUR local native projects — you commit them to git so the team has a single source of truth.

## Step 2: Update native assets from the web app

```bash
npx cap sync
```

This copies the latest web assets (icons, splash) into both native projects.

---

## Step 3: iOS App Store setup (Apple)

### 3.1 — Register the App ID in App Store Connect

1. Go to https://appstoreconnect.apple.com → My Apps → + (new app)
2. Fill in:
   - **Name**: Breeez
   - **Primary language**: English (South Africa)
   - **Bundle ID**: `co.za.breeez.app`
   - **SKU**: BREEZZA (any unique string)
3. Create the app record

### 3.2 — Configure Xcode project

```bash
open ios/App/App.xcworkspace
```

In Xcode:
1. Select the `App` target → Signing & Capabilities → enable "Automatically manage signing" → select your Apple Developer team
2. Set **Bundle Identifier**: `co.za.breeez.app`
3. Set **Version**: `1.0.0` (build 1)
4. Set **Display Name**: `Breeez`
5. Add capabilities if needed (Push Notifications for the push plugin)

### 3.3 — Build for TestFlight / App Store

- **Archive**: Product → Archive → Distribute App → App Store Connect → Upload
- **TestFlight**: Once uploaded, the build appears in TestFlight within 30 mins. Add internal testers at App Store Connect → Users and Roles.
- **App Store submission**: Once ready, fill in the App Privacy questionnaire, screenshots, and submit for review.

## Step 4: Google Play setup (Android)

### 4.1 — Create the app in Play Console

1. Go to https://play.google.com → All apps → Create app
2. Fill in:
   - **App name**: Breeez
   - **Default language**: English (South Africa)
   - **App or game**: App
   - **Free or paid**: Free
3. Click "Create app" → fill in Store listing (descriptions, screenshots, etc.)

### 4.2 — Generate upload keystore (one time only)

```bash
keytool -genkey -v \
  -keystore ~/breeez-upload-key.keystore \
  -alias breeez \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Save the password!** You need it for every release. Store the keystore file + passwords in 1Password or similar.

### 4.3 — Configure Android Studio

```bash
open android/
```

In Android Studio:
1. File → Project Structure → Modules → app → Signing Configs → add upload keystore
2. Build Variants → set release buildType
3. Build → Generate Signed Bundle → AAB → release

The signed `.aab` file is what you upload to Play Console.

### 4.4 — Upload to Play Console

- Play Console → Your app → Release → Production → Create new release
- Upload the signed `.aab` file
- Fill out release notes → Review release → Start rollout to production

---

## Step 5: App Store assets (one-time)

You need:
- **App icon**: 1024×1024 PNG, no transparency (Apple strips alpha for store)
- **Splash screen**: Same icon or a logo variant
- **Screenshots**: 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), iPad 12.9", plus Android phone + tablet sizes

You can generate placeholders fast:
```bash
npx @capacitor/assets generate \
  --android \
  --ios \
  --assetPath resources/icon.png
```

Drop a 1024×1024 PNG into `resources/icon.png` first (use your Breeez "B" logo).

---

## Daily workflow: update the app after a code change

```bash
# 1. Web deploys to Vercel automatically on `git push` (continuous deployment)
git push origin main

# 2. Native apps point at the live URL (server.url in capacitor.config.ts)
#    so no rebuild needed for code changes. Just bump version for release.

# 3. When you want to release:
npx cap sync   # refreshes native assets
git push origin main   # commits the sync'd native folder changes

# iOS release: open Xcode → Product → Archive → Distribute App
# Android release: open Android Studio → Build → Generate Signed AAB → Upload to Play Console
```

The native apps auto-load the latest Vercel deployment. So in dev you just `git push` and the app shows the changes instantly.

---

## Push notifications (FCM for Android, APNs for iOS)

When you have real users, set up push notifications:

### iOS — APNs
1. Apple Developer → Certificates, Identifiers & Profiles → Keys → create APNs key
2. Download `.p8` key file
3. Push this key + your team ID + bundle ID to Firebase Cloud Messaging (FCM)
4. FCM auto-bridges APNs to your iOS app

### Android — FCM
1. Firebase Console → Project Settings → Cloud Messaging → enable
2. Download `google-services.json` → drop into `android/app/`
3. Modify `android/app/build.gradle` to apply the `google-services` plugin

When ready, push notifications use the `@capacitor/push-notifications` plugin (already installed).

---

## File structure summary

```
/home/safai/breeez/
├── capacitor.config.ts        ← main config (app IDs, server URL)
├── ios/                        ← Xcode project (generated by cap add ios)
│   └── App/
│       ├── AppDelegate.swift
│       ├── Info.plist          ← permissions, display name
│       └── Assets.xcassets/    ← icons + splash
├── android/                    ← Android Studio project (generated by cap add android)
│   └── app/
│       ├── build.gradle        ← version code, signing config
│       └── src/main/
│           ├── AndroidManifest.xml  ← permissions, app name
│           └── assets/          ← icons, splash
├── package.json                ← scripts for cap:sync, cap:build:*
└── this file (docs/CAPACITOR_SETUP.md)
```

---

## Common troubleshooting

### "App shows blank screen"
- Check `capacitor.config.ts` server.url — must be accessible from the device
- Check Vercel logs — maybe the app threw an error

### "Build fails on Xcode"
- Make sure signing cert isn't expired: Xcode → Settings → Accounts → Manage Certificates
- Run `npx cap sync` after any capacitor config changes

### "Build fails on Android Studio"
- Make sure ANDROID_HOME env var is set
- Verify keystore file exists and password is correct
- Try Build → Clean Project, then rebuild

### "Push notifications not received"
- iOS: check APNs key is correctly uploaded to FCM, bundle ID matches exactly
- Android: verify google-services.json is in `android/app/`, plugin applied in build.gradle
- Check `capacitor.config.ts` has the right `appId` matching FCM project

---

## Next: run `npx cap add ios && npx cap add android`

When you're ready, run these commands in the project directory and follow the steps above. I can help debug any specific failure along the way.

Total time investment for first-time setup: ~2-4 hours (most of it waiting on Apple/Google processing).
First App Store review: 24-48h.
First Play Store review: 1-7 days (Google is slower for new accounts).

Good luck! 🚀