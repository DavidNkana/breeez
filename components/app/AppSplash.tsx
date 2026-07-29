'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/lib/brand';

const SPLASH_KEY = 'breeez:splash_shown_v1';

/**
 * Full-screen splash screen shown on app startup.
 * White background with the Trends logo centered.
 * Shows for 5 seconds then fades out.
 * Only shows once per browser session.
 */
export function AppSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already seen this session
    if (sessionStorage.getItem(SPLASH_KEY)) return;
    sessionStorage.setItem(SPLASH_KEY, '1');

    // Brief delay so the first paint happens, then show
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Auto-hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-white transition-opacity duration-500"
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
