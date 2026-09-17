'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/lib/brand';

const SPLASH_KEY = 'breeez:splash_shown_v2';
const MIN_DISPLAY_MS = 1500;   // at least this long so the brand actually shows
const MAX_DISPLAY_MS = 5000;   // safety: never stay longer than this

/**
 * Full-screen splash screen shown on app startup.
 * Shows until either:
 *   - the page has fully loaded AND the minimum display time has elapsed, OR
 *   - the maximum display time has elapsed (safety)
 *
 * Only shows once per browser session.
 */
export function AppSplash() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  useEffect(() => {
    if (!visible) return;

    sessionStorage.setItem(SPLASH_KEY, '1');

    const startedAt = Date.now();
    let hidden = false;

    const hide = () => {
      if (hidden) return;
      hidden = true;
      setVisible(false);
    };

    // Hide once both: page is fully loaded AND min display time has elapsed
    const tryHide = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(hide, remaining);
    };

    if (document.readyState === 'complete') {
      tryHide();
    } else {
      window.addEventListener('load', tryHide, { once: true });
    }

    // Safety: never stay longer than MAX_DISPLAY_MS
    const maxTimer = setTimeout(hide, MAX_DISPLAY_MS);

    // Best-effort hide of the native (Capacitor) splash — silently no-ops on web
    let nativeHide: (() => void) | undefined;
    void import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => {
        nativeHide = () => {
          void SplashScreen.hide({ fadeOutDuration: 250 });
        };
        nativeHide();
      })
      .catch(() => {});

    return () => {
      clearTimeout(maxTimer);
      window.removeEventListener('load', tryHide);
      nativeHide?.();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black transition-opacity duration-300"
      aria-hidden="true"
    >
      <img
        src={brand.logo}
        alt={brand.name}
        className="h-auto w-48 sm:w-56 animate-pulse"
        style={{ animationDuration: '2s' }}
      />
    </div>
  );
}
