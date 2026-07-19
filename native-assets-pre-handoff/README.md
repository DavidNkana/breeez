# Breeez — App Store Pre-Handoff Package

Everything the app store team needs to publish Breeez without touching the codebase.

---

## 📦 What's in this folder

```
android/app/build/outputs/
├── bundle/release/app-release.aab        ← UPLOAD THIS to Play Console
└── apk/release/app-release.apk          ← For direct device install / QA testing

android/app/src/main/res/
├── mipmap-*/ic_launcher*.png            ← Placeholder icons (replace with final)
├── mipmap-*/ic_launcher_round.png        ← (same)
└── values/strings.xml                   ← App name, etc.

docs/ANDROID_PRE_HANDOFF.md             ← This file
native-assets-pre-handoff/               ← THIS FOLDER
├── README.md
├── icons/                                ← Drop final app icons here (TODO before publishing)
├── screenshots/                          ← Drop Play Store screenshots here
└── keystore-info.md                      ← How to regenerate the upload keystore
```

---

## 🚀 How to publish to Google Play Store (Android)

### For the App Store team

1. **Open Google Play Console** → https://play.google.com → All apps → Create app
2. Fill in app details:
   - App name: **Breeez**
   - Default language: **English (South Africa)**
   - App or game: **App**
   - Free or paid: **Free**
3. Click **Create app**

### Upload the bundle

4. Production → Create new release
5. **Upload** `android/app/build/outputs/bundle/release/app-release.aab`
6. Add release notes (use the pre-written ones in `release-notes.md` in this folder)
7. **Review release → Start rollout to Production**

### Add store listing content

8. **Store presence → Main store listing**
   - App name: Breeez
   - Short description: "Shop SA — apparel, home, kitchen and more"
   - Full description: see `app-description.md` in this folder
   - Icon: upload `icons/play-store-icon-512.png` (1024×1024, no alpha)
   - Feature graphic: upload `screenshots/feature-graphic-1024x500.png`
   - Phone screenshots: upload `screenshots/phone-*.png` (at least 4)
9. Save → Submit for review (first review takes 1-7 days)

### Required assets the team needs to create

The icons currently in `android/app/src/main/res/mipmap-*` are placeholders showing a white "B". The app store team should replace them with final assets.

| Asset | Path | Size |
|---|---|---|
| App icon (foreground) | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | 192×192 |
| Round app icon | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` | 192×192 |
| Play Store icon | `native-assets-pre-handoff/icons/play-store-icon-512.png` | 512×512 (no alpha) |
| Feature graphic | `native-assets-pre-handoff/screenshots/feature-graphic-1024x500.png` | 1024×500 |
| Phone screenshots | `native-assets-pre-handoff/screenshots/phone-*.png` | 1080×1920 (at least 4) |
| Short description | (in Play Console) | max 80 chars |
| Full description | (in Play Console) | max 4000 chars |

---

## 🖼️ Current placeholder icons

The repo's `android/app/src/main/res/mipmap-*/ic_launcher*.png` files contain a simple white "B" on a default background. These are placeholders only — the final brand assets (purple/orange gradient Breeez logo, etc.) should be designed by the brand team and dropped in before publishing.

To replace at any time:
```bash
# Drop your final 1024x1024 PNG into:
native-assets-pre-handoff/icons/source-icon.png

# Then run:
cd android
./gradlew bundleRelease
```

The icons get regenerated automatically by Gradle from the source.

---

## 🔑 Keystore information

**The upload keystore was generated on the Linux machine at:**
`/home/safai/android-keystore/breez-upload-key.keystore`

**Password (store + key):** `breezapp2026`
**Alias:** `breez`
**Validity:** 10,000 days (~27 years)

**⚠️ Critical:** Without this keystore and password, you cannot push updates to the Play Store. If you ever lose it, the existing app on Play Store becomes "stuck" — you cannot publish updates. Store it in a password manager (1Password/Bitwarden) IMMEDIATELY and back up in two physical locations.

### To build locally (any environment)

```bash
export BREEZ_KEYSTORE_PATH=/path/to/breez-upload-key.keystore
export BREEZ_KEYSTORE_PASSWORD=breezapp2026
export BREEZ_KEY_ALIAS=breez
export BREEZ_KEY_PASSWORD=breezapp2026
cd android && ./gradlew bundleRelease
```

Without these env vars, build will use the debug keystore and the .aab won't be uploadable to Play Console.

---

## 🧪 Test build right now

The current builds are ready and signed:

- **AAB (upload to Play Console)**: `android/app/build/outputs/bundle/release/app-release.aab`
- **APK (for direct testing)**: `android/app/build/outputs/apk/release/app-release.apk`

To install on an Android device for QA:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 🍎 iOS - DEFERRED

**iOS app store builds are NOT ready and intentionally not being done now.** Chris needs to be involved for iOS because:
- Requires Mac (Xcode is Mac-only)
- Requires Apple signing certificates
- Requires App Store Connect account access
- Requires Apple ID for push notifications setup

**Current iOS state:**
- `capacitor.config.ts` is configured correctly (app ID, server URL, plugins)
- The iOS platform folder (`ios/`) is NOT yet created in the repo
- A future person can run `npx cap add ios` on a Mac to scaffold the Xcode project, then archive & upload

The web app serves identically to iOS users (because of `server.url` in capacitor config). Once the iOS Xcode project exists, building follows the standard Capacitor iOS flow.

---

## ✅ Current state — fully ready for Play Store

✓ Signed AAB built (`app-release.aab`)
✓ AndroidManifest with proper permissions (push notifications, camera)
✓ Network security config (HTTPS only)
✓ Splash screen configured
✓ App ID = `co.za.breeez.app` (matches the bundle ID Chris registered in Play Console)
✓ Version 1.0.0 / versionCode 1
✓ Backend integration verified working (live Vercel deployment)

**Action items for the app store team:**
1. Sign keystore password into 1Password / Bitwarden (CRITICAL — losing it means no updates ever)
2. Replace placeholder icons with final brand assets
3. Capture Play Store screenshots from the running APK
4. Write app description / privacy policy
5. Upload AAB to Play Console
6. Submit for review

No code changes needed — just the above 6 manual steps.