'use client';

import { useEffect } from 'react';

/**
 * Keeps native status-bar chrome aligned with the app's dark-only UI, and
 * keeps the payment flow inside the app.
 *
 * Status bar:
 * The app chrome is dark on BOTH platforms, but the meaning of
 * `Style.Dark` / `Style.Light` is platform-specific:
 *
 *   iOS     — Style.Dark  = DARK status-bar text  (invisible on a dark header)
 *             Style.Light = LIGHT status-bar text (what we want)
 *   Android — Style.Dark  = DARK status-bar background (what we want)
 *             Style.Light = LIGHT background (a white bar — not what we want)
 *
 * On iOS the status-bar BACKGROUND is always transparent; it can only be
 * controlled by what is rendered behind it. That is handled in CSS — the
 * header paints behind the status bar (`ios.contentInset: 'never'` in
 * capacitor.config.ts + `viewportFit: 'cover'` in app/layout.tsx), with
 * `.safe-top` keeping the header content clear of the clock.
 *
 * Payment windows:
 * The hosted PayFast checkout opens its payment steps in a new window
 * (`window.open`). Inside an Android WebView the default behaviour is to hand
 * that URL to the EXTERNAL browser — which kicks the customer out of the app,
 * loses the session, and means the return to our success page happens in a
 * browser instead of back in the app. Overriding `window.open` so the target
 * loads in the SAME webview keeps the entire payment — including the
 * first-time payer's email verification step — inside the app, and makes the
 * PayFast return URL land back on our own origin.
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

    // Keep any window.open (PayFast's payment steps) inside this webview.
    const originalOpen = window.open;
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      try {
        const href = url ? String(url) : '';
        // Same-window navigation for the payment flow; anything without a URL
        // (a bare window.open()) is simply ignored rather than opening an
        // external browser window.
        if (href) window.location.assign(href);
        return null;
      } catch {
        return originalOpen.call(window, url as string, target, features);
      }
    }) as typeof window.open;

    // Links that open a new tab are another way out of the app: on iOS the
    // native delegate hands them to Safari, on Android to the system browser.
    // Capture the click before the browser acts and navigate in place.
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const opensNewWindow =
        anchor.target === '_blank' ||
        anchor.getAttribute('target') === '_blank' ||
        (anchor.target === '' && anchor.getAttribute('rel')?.includes('noopener'));
      if (!opensNewWindow) return;
      const href = anchor.href;
      if (!href || href.startsWith('#')) return;
      event.preventDefault();
      window.location.assign(href);
    };
    document.addEventListener('click', onClick, true);

    return () => {
      cancelled = true;
      window.open = originalOpen;
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}
