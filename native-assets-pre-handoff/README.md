# Breeez App Store Handoff Package

Everything the App Store submission needs is pre-prepared for **both** platforms.
You (Naz) only need to follow the checklists below — the dev/preflight work is done.

---

## TL;DR

| Platform | Status | Needs you | Needs Mac |
|---|---|---|---|
| Android (Google Play) | ✅ Signed AAB ready | Browser only (Play Console) | ❌ No |
| iOS (Apple App Store) | ✅ Pre-configured, needs archive+upload | 25-min AnyDesk to a Mac | ✅ Yes (any Mac) |

---

# 1. ANDROID → Google Play Store

## What's already done
- ✅ Keystore signed and stored at `/home/safai/android-keystore/breez-upload-key.keystore`
- ✅ Release AAB built at `/home/safai/breeez/android/app/build/outputs/bundle/release/app-release.aab`
- ✅ AAB SHA256: `6187fe54b5484542ec0d768c120e9362210ad9fa23709c1d86fc0438893e2261`
- ✅ Keystore SHA256: `07c3b617a799f09a2535e361c95536d22e094158d0c3e2c3d83ea76d011cfd38`
- ✅ AAB size: 1.6 MB
- ✅ Version: 1.0.0 (versionCode 1)
- ✅ Bundle ID: `co.za.breeez.app`
- ✅ Min SDK: 23 (Android 6.0+)
- ✅ Permissions: POST_NOTIFICATIONS + CAMERA + Network state
- ✅ Network: HTTPS only (no cleartext)
- ✅ Deep links: `https://breeez-lyart.vercel.app/*` + `breeez://app/*`
- ✅ Minify + shrink enabled

## Submit checklist (30–60 min)

### Step 1 — Create the app in Play Console (browser)
1. Go to https://play.google.com/console
2. **Create app** → Name: `Breeez` → Default language: English (South Africa)
3. App type: **App**, Free
4. Skip default category, you'll set it in step 3

### Step 2 — Store listing (under "Grow" → "Store presence" → "Main store listing")
Fill in this exact text (you can customise later):

| Field | Value |
|---|---|
| App name | Breeez |
| Short description (80 chars max) | `South Africa's everyday essentials marketplace — 10 categories, ZAR.` |
| Full description (4000 chars max) | See `ANDROID_STORE_LISTING.md` (in this folder) |
| App icon (512×512 PNG) | Drop final Breeez icon into `play-assets/icon-512.png` (slot) |
| Feature graphic (1024×500 PNG) | Drop into `play-assets/feature-graphic-1024x500.png` (slot) |
| Screenshots | See `ANDROID_SCREENSHOTS.md` (in this folder) |

### Step 3 — Content rating
1. Dashboard → **Policy** → **App content** → **Content rating**
2. Questionnaire answers:
   - Violence: No
   - Sexual content: No
   - Language: No
   - Controlled substances: No
   - User-generated content: **No** (admin uploads only)
   - Personal data collection: Yes (account email + address)
   - Ads: No
   - In-app purchases: No
3. Submit → Google gives you a rating (usually Everyone/IARC)

### Step 4 — Target audience & data safety
1. **Target audience**: 13+
2. **Data safety form** under App content:
   - Collected: email (account), name (account), address (orders), payment info (handled by PayFast/Yoco, NOT stored by us)
   - Encrypted in transit: Yes
   - Users can request deletion: Yes (via account settings, or email support@breeez.shop)
   - All required by app function: Yes

### Step 5 — Upload the AAB
1. Dashboard → **Release** → **Production** → **Create new release**
2. Upload `app-release.aab`
3. Release name: `1.0.0`
4. Release notes (drop your own or use these):
   ```
   • Welcome to Breeez — your one-stop shop for kitchen, home & lifestyle essentials.
   • Browse 10 categories: apparel, bags, bathroom, bedroom, curtains & more.
   • Save your wishlist.
   • Fast checkout with PayFast, Yoco or Ozow.
   • South African couriers: Pargo, The Courier Guy, Dawn Wing.
   ```
5. **Review release** → **Start rollout to Production**
6. **First review** takes 1–7 days. After approval, app is live in Play Store.

### Keystore passwords (store somewhere secure)
| What | Value |
|---|---|
| Keystore path | `/home/safai/android-keystore/breez-upload-key.keystore` |
| Keystore password | `breezapp2026` |
| Key alias | `breez` |
| Key password | `breezapp2026` |

⚠️ **You CANNOT update or re-upload the app if you lose this keystore.** Move it to 1Password/Bitwarden/keymanager NOW.

---

# 2. iOS → Apple App Store

## What's already done
- ✅ iOS folder pre-built at `/home/safai/breeez/ios/`
- ✅ Xcode project at `ios/App/App.xcodeproj`
- ✅ Bundle identifier: `co.za.breeez.app` (matches Android)
- ✅ Marketing version: 1.0.0
- ✅ Build number: 1
- ✅ Targets: iPhone + iPad
- ✅ Deep link: `breeez://` (matches Android)
- ✅ HTTPS only (App Transport Security)
- ✅ All required permissions declared (camera, photos, location, notifications)
- ✅ Capacitor + web assets already wired to `https://breeez-lyart.vercel.app`

## What still needs a Mac (AnyDesk session — 25–40 min)
Apple requires Xcode for the final archive + upload. Three things happen in that session:

1. **Open Xcode** on the Mac → sign in with **your** Apple ID
2. **Open the project** at `ios/App/App.xcodeproj`
3. Configure signing → **Archive** → **Distribute to App Store Connect**

## Pre-Mac checklist
Before the AnyDesk session, in **App Store Connect** (browser, ~15 min):

1. Go to https://appstoreconnect.apple.com
2. **My Apps → "+" → New App**
3. Platform: **iOS**, Name: **Breeez**, Primary language: **English (South Africa)**, Bundle ID: **co.za.breeez.app**
4. SKU: `breeez-001` (any unique string works)
5. **Pricing and availability**: Free
6. **App Information**:
   - Category: Shopping (or Lifestyle)
   - Subtitle (30 chars max): `Home, kitchen & lifestyle essentials`
7. Done — leave App Privacy, screenshots etc for step 4

## Mac AnyDesk session — step-by-step (give this to your Mac friend)

Once the Mac has Xcode installed + your Apple ID added:
1. Receive the `breeez` folder from Naz (via AnyDesk file transfer or USB/cloud)
2. Open Xcode → File → Open → select `breeez/ios/App/App.xcodeproj`
3. Wait ~30 sec for Xcode to index
4. Select the **App** target (left sidebar) → **Signing & Capabilities** tab
5. Tick **Automatically manage signing**
6. **Team**: drop down → select Naz's Apple Developer Team
7. Bundle Identifier should show `co.za.breeez.app` (already set, don't change)
8. Verify the 4 capabilities are present (or add them):
   - Push Notifications
   - Background Modes → Remote notifications
   - App Groups (none needed)
   - No Associated Domains needed (we use URL scheme only)
9. **Product → Archive** (top menu) — wait 5–15 min
10. When done → **Window → Organizer** opens automatically
11. Select the new archive → click **Distribute App**
12. Choose **App Store Connect** → **Upload**
13. Choose **Automatically manage signing** → Next
14. Wait for upload (~2–5 min) → Done

That's it. The Mac user's job ends there. Upload lands in App Store Connect.

## iOS — after the AnyDesk session
1. Back in **App Store Connect** (browser) → My Apps → Breeez
2. **TestFlight** tab → your build appears in ~5 min
3. (Optional) Test yourself before submitting
4. **App Store** tab → fill in:
   - Screenshots: same as Android, see `IOS_SCREENSHOTS.md`
   - Description, keywords, what's new — use `IOS_STORE_LISTING.md`
   - Privacy policy URL: `https://breeez-lyart.vercel.app/legal/privacy`
   - Support URL: `https://breeez-lyart.vercel.app/contact`
   - Age rating: 4+
5. **Submit for review** — Apple review typically 24–48 hours
6. After approval → app goes live in App Store (select countries)

---

# 3. What your Mac friend needs

If using AnyDesk with a personal contact:

**Required on their Mac:**
- macOS 13+ (Ventura or later)
- Xcode 15 or 16 installed (free download: Mac App Store → Xcode → ~13 GB)
- 20–30 GB free disk space

**Apple IDs they should NOT need:**
- Their Apple ID should NOT be used. You sign into Xcode with YOUR Apple ID during the session.
- They just need to provide the Mac + screen time. Their Apple ID doesn't touch the build.

**You need to give them:**
- Read access to `breeez/ios/` folder
- Your Apple ID + password for the Xcode login
- 2FA code (your phone) when prompted

**Bonus: anyone can also do this from a Mac rental:**
- **MacStadium** — $50/month dedicated Mac mini, instant provisioning
- **AWS EC2 Mac** — $1.08/hr, terminate when done (~R26/hr, R520 for 8 hours)

---

# 4. Files in this folder

```
native-assets-pre-handoff/
├── README.md                      ← you are here
├── ANDROID_STORE_LISTING.md       ← short + long description text, ready to paste
├── IOS_STORE_LISTING.md           ← iOS equivalent
├── ANDROID_SCREENSHOTS.md         ← screenshot checklist + how to capture
├── IOS_SCREENSHOTS.md             ← iPhone 6.7" + iPad 13" required sizes
├── icons/                         ← (empty slot — drop Breeez icon files here)
├── screenshots/                   ← (empty slot — drop captured screenshots here)
└── KEYSTORE_BACKUP.txt            ← copy of credentials for password manager
```

---

# 5. Order of operations

1. **Today**: Move AAB + keystore passwords to 1Password/Bitwarden
2. **Today or tomorrow**: Read `ANDROID_STORE_LISTING.md` and capture/create assets
3. **Android first**: Submit to Play Store (no Mac needed). Wait 1–7 days.
4. **In parallel**: Arrange Mac AnyDesk session
5. **iOS second**: Run Xcode archive + upload via AnyDesk
6. **Both apps live**: Breeez is now on every phone in SA
