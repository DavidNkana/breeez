# Screenshot checklist — what to capture

Screenshots sell the app. 4–8 per platform. Here's the priority list with what to do on each screen.

## How to capture (Android)
Use the Android emulator you already set up OR Chrome DevTools on Windows/Mac/Linux:
1. Open https://breeez-lyart.vercel.app in Chrome
2. F12 → toggle device toolbar (Ctrl+Shift+M) → set viewport to **1080×1920** (standard 9:16) or **1440×3120** (Pixel)
3. Set DPR to 2 or 3 for crisp images
4. Use Ctrl+Shift+P → "Capture full size screenshot" for each page
5. Save as PNG

## What to capture (priority order)

### Required (Android needs at least 2, iOS needs at least 1)
1. **Home page** — `https://breeez-lyart.vercel.app`
   - Should show: Categories strip + Today's picks + Featured
2. **Category / product listing** — `https://breeez-lyart.vercel.app/c/kitchen`
   - Should show: real products (need to add some first — see below)

### Recommended (more = better conversion)
3. **Product detail** — `https://breeez-lyart.vercel.app/p/ceramic-dinner-set`
   - Click into any real product
4. **Cart drawer / cart page** — empty cart with prompt
5. **Wishlist page** — `https://breeez-lyart.vercel.app/account/wishlist`
   - Don't need to be logged in (the page handles guests)
6. **Login / register screen** — `/account`
7. **Checkout step** — `/checkout` (won't be reachable if not logged in; you can capture the empty state)

## BEFORE capturing — add at least 8 real-looking products

Chris, before screenshots look good, you need products in the catalog. 30 minutes:
1. Go to https://breeez-lyart.vercel.app/admin (after adding your UUID to public.admins in Supabase)
2. Click "New product" 8+ times, add real-looking products
3. Use stock images from unsplash.com (no copyright issues)
4. Once 8 products are in, screenshots will look rich and convincing

## File sizes

| Platform | Required | Recommended |
|---|---|---|
| Android (Play Store) | At least 2 screenshots | 4–8 |
| Android (per size) | Phone 1080×1920 or larger | Add tablet 1200×1920 if you have the screenshot |
| iOS (App Store) | At least 1 (can't submit with 0) | 4–8 per device class |
| iOS 6.7" iPhone 15 Pro Max | 1290×2796 (required if you list for iPhone) | Recommended |
| iOS 6.5" iPhone 11 Pro Max | 1242×2688 | Optional |
| iOS 5.5" iPhone 8 Plus | 1242×2208 | Optional |
| iOS 12.9" iPad Pro | 2048×2732 | Optional |

## Where to save them
Save all screenshots into:
`/home/safai/breeez/native-assets-pre-handoff/screenshots/`

Use clear filename convention:
- `01-home.png`
- `02-category.png`
- `03-product.png`
- `04-cart.png`
- `05-wishlist.png`
- `06-account.png`
- `07-checkout.png`
- `08-mobile-sheet.png` (search sheet open)

## One more: feature graphic (Android only)
- Size: 1024×500 PNG
- Canva has free templates — search "Google Play feature graphic"
- Or use a single 1080×1920 hero screenshot cropped to 1024×500

## App icon
Both stores want a 512×512 PNG (no transparency on either store).
- Best: commission a designer or AI-generate one
- Fastest: use a brand font + the Breeez logomark on a solid red background
- Save as `play-assets/icon-512.png` and `play-assets/icon-1024.png` (Apple needs 1024)
