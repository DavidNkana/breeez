# Brand Assets — Source Files

Drop your **source** brand assets here, NOT the per-platform resized ones.

The Android build pipeline will downsize from these sources to the
required density buckets.

## Required files

### `app-icon-source.png` (REQUIRED for app icon)

- Format: PNG with transparency (RGBA), square
- Recommended size: **1024 × 1024 px** (Android adaptive icon safe zone = the center 66% × 66% of the canvas)
- The icon design should leave **17% padding on every side** so that when Android
  masks the icon (circle, squircle, teardrop on different OEMs), the logo
  isn't clipped.
- **What we'll do with it:** resize down to all Android density buckets
  (mdpi 48×48, hdpi 72×72, xhdpi 96×96, xxhdpi 144×144, xxxhdpi 192×192),
  update `ic_launcher.png` in each mipmap-* folder, update `ic_launcher_foreground.png`
  for the adaptive icon masks, regenerate `release/play-store-icon-512.png`,
  rebuild the AAB, and give you the new download URL.

### `app-icon-source-square.png` (OPTIONAL, only for splash)

If you want a different version of the logo for the in-app splash screen
(loaded by `AppSplash.tsx` on first paint, separate from Android's native
launcher splash), drop it here. Used in `public/brand/splash.png` after
running the build.

## What NOT to put in this folder

- Per-density already-resized PNGs (`mipmap-*/*.png`) — these are
  generated from the source
- Square round-masked versions — Android does the masking, don't pre-mask
- Anything smaller than 512×512 for the source — we'll lose detail

## Rebuild flow

When `app-icon-source.png` is added or changed:

1. Run the build script: `bash scripts/rebuild-android-icon.sh`
   (script lives at the repo root, reads from this folder)
2. The script regenerates all density buckets, the foreground file for
   adaptive icons, and the Play Store listing icon
3. Build the AAB: `cd android && ./gradlew bundleRelease`
4. The AAB will be at `android/app/build/outputs/bundle/release/app-release.aab`
5. Copy it to `release/app-release.aab` and push

If you want me to do it instead of running scripts manually, just push
the new file and tell me — I'll handle the rest.
