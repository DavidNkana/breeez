# iOS App Store Submission — Mac Person Instructions

## What you need

- [ ] Mac with Xcode 15+ installed
- [ ] Access to Chris's Apple Developer account (login at developer.apple.com)
- [ ] This project repo cloned to your Mac
- [ ] The app icon SVG: `public/brand/app-icon.svg`

## Step 1 — Clone & Install

```bash
git clone https://github.com/DavidNkana/breeez.git
cd breeez
npm install
npx cap sync ios
```

## Step 2 — Create the app icon

The icon SVG is at `public/brand/app-icon.svg` — a white "T" on a Trends red (#C72E28) rounded square.

**Option A — Use Preview (simplest):**
1. Open `public/brand/app-icon.svg` in Preview
2. File → Export → PNG → 1024×1024
3. Save as `AppIcon-1024.png` on your desktop

**Option B — Use Figma/Sketch:**
1. Import the SVG
2. Export at 1024×1024 PNG

**Then create ALL required icon sizes.** The Xcode asset catalog needs these exact sizes:
| Size | Use |
|------|-----|
| 1024×1024 | App Store submission icon (also goes in App Store Connect) |
| 180×180 | iPhone 60pt @3x |
| 120×120 | iPhone 60pt @2x / Settings |
| 167×167 | iPad Pro |
| 152×152 | iPad @2x |
| 76×76 | iPad @1x |
| 40×40 | Spotlight |

**Quick method:** Resize the 1024×1024 PNG to each size above and drop them into the Xcode asset catalog.

## Step 3 — Set the Team in Xcode

1. Open `ios/App/App.xcworkspace` (NOT .xcodeproj) in Xcode
2. Click the "App" project in the left navigator
3. Under **Signing & Capabilities**, set:
   - **Team**: Select Chris's Apple Developer team
   - **Bundle Identifier**: `co.za.breeez.app`
4. If Xcode complains about provisioning profiles, check "Automatically manage signing"

## Step 4 — Add app icon to Xcode

1. In the Xcode project navigator, find `App/App/Assets.xcassets/AppIcon`
2. Drag each PNG file into the correct slot in the asset catalog
3. Replace the existing generic Capacitor icon (it's a default blue icon)
4. Verify all slots are filled

## Step 5 — Update the splash screen (optional)

The splash screen currently shows a plain white screen with no branding. To add the logo:

1. Open `public/brand/logo.png`
2. Resize to 2732×2732 (centered, with some padding)
3. Export as PNG
4. Replace `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png`

Or skip this — a white splash is acceptable for App Store.

## Step 6 — Archive & Upload

1. In Xcode, set the scheme target to **"App"** and destination to **"Any iOS Device (arm64)"**
2. Menu: **Product → Archive**
3. Wait for build to complete (1-3 minutes)
4. The Organizer window opens automatically. Select the archive.
5. Click **Distribute App** → **App Store Connect** → **Upload**
6. Follow the prompts. Xcode will:
   - Validate the binary
   - Upload to App Store Connect
7. This takes 5-10 minutes depending on your internet speed.

## Step 7 — App Store Connect (browser)

Go to https://appstoreconnect.apple.com and fill in:

| Field | Value |
|-------|-------|
| **App name** | `Trends Day-to-Day` |
| **Subtitle** | `Home, Kitchen & Lifestyle` |
| **Bundle ID** | `co.za.breeez.app` |
| **SKU** | `BREEZ001` |
| **Primary category** | Shopping |
| **Secondary category** | Lifestyle |
| **App icon** | Upload your 1024×1024 PNG |
| **Privacy policy URL** | `https://breeez-lyart.vercel.app/legal/privacy` |
| **Support URL** | `https://breeez-lyart.vercel.app/contact` |
| **Copyright** | `© 2026 Trends Day-to-Day` |

**Full description** — copy from `native-assets-pre-handoff/IOS_STORE_LISTING.md`

**Promotional text:**
```
South Africa's curated marketplace for everyday essentials. Browse 10 categories, nationwide delivery, secure local checkout.
```

## Step 8 — Screenshots

App Store requires screenshots for **6.7" iPhone** (1290×2796) — these are the biggest and will scale down for other sizes.

**Do this in the iOS Simulator:**
1. In Xcode, open the Simulator (Xcode → Open Developer Tool → Simulator)
2. Choose iPhone 15 Pro Max (or any 6.7" device)
3. Run the app in the Simulator
4. Take screenshots (Cmd+S or File → Save Screen) of:
   - Home page with category grid
   - Product listing page
   - Product detail page
   - Cart
   - Checkout
   - Account/Orders

**Required:** At least 3 screenshots. Apple recommends 6-8.

## Step 9 — Submit for Review

1. In App Store Connect, select your app
2. Go to **App Store** tab → **iOS App** → **Prepare for Submission**
3. Fill in all required fields (screenshots, description, keywords, etc.)
4. Click **Submit for Review**
5. Apple review takes 24-48 hours

## Notes

- The app is a **Capacitor WebView wrapper** — it loads the live website from `https://breeez-lyart.vercel.app`. All content changes happen on the web, no app updates needed.
- Bundle ID `co.za.breeez.app` is the internal identifier. The display name "Trends Day-to-Day" is what users see.
- If Apple rejects for "minimal functionality" (common with WebView apps), we can add native features (push notifications, camera, etc.) that are already configured in the code.
- The Info.plist has all required privacy descriptions (camera, photos, location, notifications).
- App Transport Security is configured for HTTPS-only.
- The deep link scheme is `breeez://` — handles links that open the app.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing signing certificate" | Go to Xcode → Preferences → Accounts → Download Manual Profiles |
| "Provisioning profile not found" | In developer.apple.com → Certificates → create a new iOS Distribution profile |
| Archive fails | Check that the Bundle ID in Xcode matches what's registered in App Store Connect |
| Upload rejected (ITMS-9000) | Usually a missing icon or screenshot size mismatch |
