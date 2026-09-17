'use client';

import { useEffect, useRef } from 'react';
import { brand } from '@/lib/brand';

const SPLASH_KEY = 'breeez:splash_shown_v3';
const MIN_DISPLAY_MS = 1500;
const MAX_DISPLAY_MS = 4000;

/**
 * Full-screen splash shown on app startup.
 *
 * Hides the DOM node directly (not via React state) so it works even when
 * the JS thread is busy (e.g. admin pages with heavy queries). A safety
 * MAX_DISPLAY_MS timeout guarantees the splash can never get stuck.
 *
 * Subsequent navigations within the same session skip the splash entirely
 * via sessionStorage — the DOM node is created but immediately hidden.
 */
export function AppSplash() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const hideNode = () => {
      if (node) node.style.display = 'none';
    };

    // Already shown this session? Hide immediately, no animation.
    try {
      if (sessionStorage.getItem(SPLASH_KEY)) {
        hideNode();
        return;
      }
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      // sessionStorage may throw in private browsing — fall through to normal hide
    }

    const startedAt = Date.now();

    const tryHide = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(hideNode, remaining);
    };

    if (document.readyState === 'complete') {
      tryHide();
    } else {
      window.addEventListener('load', tryHide, { once: true });
    }

    // Safety: never stay longer than MAX_DISPLAY_MS no matter what
    const maxTimer = setTimeout(hideNode, MAX_DISPLAY_MS);

    // Best-effort hide of the native Capacitor splash — no-op on web
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
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
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
