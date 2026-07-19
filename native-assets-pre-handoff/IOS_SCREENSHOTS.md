# iOS Screenshots — same images, different sizes

iOS App Store is stricter than Play Store: you MUST provide at least one screenshot per device family you support, plus they must be exact sizes.

## Required sizes (App Store Connect → My App → Breeez → App Store → iOS Screenshots)

| Device class | Size | Required? | Notes |
|---|---|---|---|
| 6.7" iPhone (15 Pro Max) | 1290 × 2796 | ✅ Required if you support iPhone | Recommended primary |
| 6.5" iPhone (11 Pro Max) | 1242 × 2688 | Optional | Adds older iPhones |
| 5.5" iPhone (8 Plus) | 1242 × 2208 | Optional | Add for backwards compat |
| 12.9" iPad Pro | 2048 × 2732 | ✅ Required if you support iPad | We DO support iPad |
| 11" iPad Pro | 1668 × 2388 | Optional | Common secondary |

App Store Connect lets you upload ONE size and it remaps, but be safe and make at least 6.7" + 12.9".

## How to resize Android screenshots

If you use the same screenshots from Android (1080×1920), you need to resize them:

```bash
# Install imagemagick (if not already)
sudo apt install imagemagick

# Resize to iPhone 6.7"
magick 01-home.png -resize 1290x2796 01-home-ios-67.png

# Resize to iPad 12.9" (different ratio, may need padding)
magick 01-home.png -resize 1200x1900 -background white -gravity center -extent 2048x2732 01-home-ipad.png
```

## Or — easier

Use a free online tool:
- https://www.appicon.co (also does app icons)
- https://www.screely.com (frame + background)

## Alternative — just capture iPhone-sized directly

Open Chrome DevTools at the exact viewport:
- iPhone 15 Pro Max: **430×932** with DPR 3 (renders to 1290×2796)
- iPad 12.9": **1024×1366** with DPR 2 (renders to 2048×2732)

Same Ctrl+Shift+P capture sequence.

## Upload order in App Store Connect

1. App Store tab → iOS Screenshots section
2. Drop 6.7" first (4–8 images)
3. Then 12.9" if you include iPad (1–8 images)
4. Order matters — first 3 are visible above the fold

## What if I don't want to support iPad?

You can deselect iPad from the Supported Devices list in App Store Connect (My App → Breeez → App Store → Required device info). Then you only need 6.7" screenshots.

For a v1 launch, **recommend supporting iPhone only** until you have iPad-specific screenshots. iPad users still see the iPhone app (centered + upscaled). Disable iPad in Settings → General → App Information → Supported Devices if you only want iPhone.
