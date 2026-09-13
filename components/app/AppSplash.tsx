'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/lib/brand';

const SPLASH_KEY = 'breeez:splash_shown_v1';

/**
 * Full-screen splash screen shown on app startup.
 * White background with the Evasale logo centered.
 * Fades out quickly while native splash is controlled by Capacitor.
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

    // Keep JS splash short; native splash is controlled independently.
    const hide = () => setVisible(false);
    const hideTimer = setTimeout(hide, 650);
    window.addEventListener('evasale:appReady', hide);

    let nativeHide: (() => void) | undefined;
    void import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      nativeHide = () => { void SplashScreen.hide({ fadeOutDuration: 250 }); };
      nativeHide();
    }).catch(() => {});

    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('evasale:appReady', hide);
      nativeHide?.();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-white transition-opacity duration-300"
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
