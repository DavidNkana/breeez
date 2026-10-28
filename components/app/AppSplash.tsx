'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { brand } from '@/lib/brand';

const SPLASH_KEY = 'breeez:splash_shown_v3';
const MIN_DISPLAY_MS = 1500;
const MAX_DISPLAY_MS = 4000;

/**
 * Tagline artwork shown near the bottom of the splash.
 *
 * The asset is optional: if it has not been added to public/brand yet the
 * image request 404s and the element is removed, so the splash never shows a
 * broken-image icon.
 */
const SPLASH_TAGLINE = '/brand/evasale_tagline_high_res.png';

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
  const [taglineFailed, setTaglineFailed] = useState(false);

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
      // The splash is decorative and aria-hidden. It must never become a
      // touch target while hydration/native startup is still in progress.
      className="pointer-events-none fixed inset-0 z-[99999] flex items-center justify-center bg-black"
      aria-hidden="true"
    >
      <Image
        src={brand.logo}
        alt={brand.name}
        width={brand.logoWidth}
        height={brand.logoHeight}
        priority
        className="h-auto w-48 sm:w-56 animate-pulse"
        style={{ animationDuration: '2s' }}
      />

      {/* Tagline artwork, sitting just above the bottom edge of the splash. */}
      {!taglineFailed && (
        <div
          className="absolute inset-x-0 bottom-0 flex justify-center px-6"
          style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
        >
          {/* The box keeps the artwork's exact 2080x360 ratio so it is never
              letterboxed or distorted. */}
          <div className="relative aspect-[2080/360] w-[min(46vw,180px)] sm:w-[220px]">
            <Image
              src={SPLASH_TAGLINE}
              alt=""
              fill
              sizes="(max-width: 640px) 46vw, 220px"
              onError={() => setTaglineFailed(true)}
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
