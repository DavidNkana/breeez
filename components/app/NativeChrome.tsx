'use client';

import { useEffect } from 'react';

/**
 * Keeps native status-bar chrome aligned with the app's dark-only UI.
 *
 * The app chrome is dark on BOTH platforms, but the meaning of
 * `Style.Dark` / `Style.Light` is platform-specific:
 *
 *   iOS     — Style.Dark  = DARK status-bar text  (invisible on a dark header)
 *             Style.Light = LIGHT status-bar text (what we want)
 *   Android — Style.Dark  = DARK status-bar background (what we want)
 *             Style.Light = LIGHT background (a white bar — not what we want)
 *
 * So iOS gets light text, Android gets a dark background. Setting one style
 * for both is what made the iOS status bar look like an empty transparent
 * strip.
 *
 * On iOS the status-bar BACKGROUND is always transparent; it can only be
 * controlled by what is rendered behind it. That is handled in CSS — the
 * header paints behind the status bar (`ios.contentInset: 'never'` in
 * capacitor.config.ts + `viewportFit: 'cover'` in app/layout.tsx), with
 * `.safe-top` keeping the header content clear of the clock.
 */
export function NativeChrome() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cap = await import('@capacitor/core');
        if (!cap.Capacitor.isNativePlatform() || cancelled) return;
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        if (cancelled) return;

        if (cap.Capacitor.getPlatform() === 'ios') {
          // White clock/battery/wifi glyphs over the dark header.
          await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        } else {
          // Android: dark status-bar background with light icons.
          await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
          await StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
        }
      } catch {
        // Web or plugin unavailable — silently ignore.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}
