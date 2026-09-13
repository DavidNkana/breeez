'use client';

import { useEffect } from 'react';

/** Keeps native status-bar chrome aligned with the app's dark-only UI. */
export function NativeChrome() {
  useEffect(() => {
    void import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      void StatusBar.setStyle({ style: Style.Dark });
      void StatusBar.setBackgroundColor({ color: '#000000' });
    }).catch(() => {
      // The Capacitor plugin is unavailable in a regular browser.
    });
  }, []);

  return null;
}
