'use client';

import { useEffect } from 'react';

/** Keeps native status-bar chrome aligned with the app's dark-only UI. */
export function NativeChrome() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cap = await import('@capacitor/core');
        if (!cap.Capacitor.isNativePlatform() || cancelled) return;
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        if (cancelled) return;
        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        await StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
      } catch {
        // Web or plugin unavailable — silently ignore.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}
