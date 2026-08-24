# Release Artifacts

This folder holds built Android AABs ready for upload to Google Play Console.

## Files

### `app-release.aab` (latest)
- The most recent build, always overwritten by the next release.
- **DO NOT use this URL directly for uploading** — your browser, CDN, or
  Play Console may cache it. Use the versioned files below instead.

### `app-release-v<N>-<short-sha>.aab` (versioned, immutable)
- Each release commit gets its own filename with the version code and
  commit SHA, e.g. `app-release-v12-bd2deed.aab`
- These URLs **never change** once committed — what you downloaded is
  what's on disk forever
- **Use these for Play Console uploads** to bypass caching

### `play-store-icon-512.png`
- 512×512 PNG used for the Play Store listing thumbnail
- Rebuilt each release

## Version history

| Version | Date | Commit | Notes |
|---------|------|--------|-------|
| v12 | 2026-08-24 | bd2deed | Launcher icon scaled down (60% of canvas). versionCode 12 (11 was already used). |
| v11 | 2026-08-24 | bb32b98 | Same scaled icon. versionCode 11 (10 was already used). |
| v10 | 2026-08-24 | 562cb07 | First AAB build in this session. versionCode 10. |
| v9 | 2026-08-24 | f0923b8 | First AAB build attempt — known broken (MainActivity.java wouldn't compile). Replaced by v10. |
| v8 | 2026-08-05 | b336e4b | Pre-session. Same logo, no version bump fix. |

## Upload workflow

1. Open Play Console → your app → Release management → Create new release
2. Use the **versioned** file URL (NOT `app-release.aab`):
   ```
   https://github.com/DavidNkana/breeez/raw/main/release/app-release-v<N>-<sha>.aab
   ```
3. Hard-refresh your browser before uploading (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)
4. Verify versionCode matches what Play Console expects before submitting
