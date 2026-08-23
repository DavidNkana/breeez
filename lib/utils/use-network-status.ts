'use client';

import { useEffect, useState } from 'react';

/**
 * useNetworkStatus — returns true when the browser believes it has internet
 * connectivity, false when it does not.
 *
 * Two signals are combined:
 *
 *  1. `navigator.onLine` — the browser's own opinion. Updates via the
 *     `online` / `offline` events on `window`. This is always available
 *     in the WebView (and on the web).
 *
 *  2. Optionally, the Capacitor `@capacitor/network` plugin — gives a more
 *     reliable signal on native (the OS can detect captive portals, real
 *     internet reachability, etc.). If the plugin isn't installed or
 *     fails to import (web-only environments), we silently fall back to
 *     the navigator.onLine signal.
 *
 * The hook is intentionally defensive: it never throws, and the worst
 * case is "always reports online" — which means the offline screen
 * never shows, which is the same as today's behaviour. So even if the
 * plugin is broken, the user is no worse off than before.
 */
export function useNetworkStatus(): boolean {
  // Default to true on the server (SSR) and on the very first client render
  // before useEffect runs. This avoids a flash of the offline screen during
  // initial hydration.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Start with the browser's current opinion.
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      setOnline(navigator.onLine);
    }

    // Listen for browser online/offline events.
    function handleOnline() { setOnline(true); }
    function handleOffline() { setOnline(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Optional: try to use the Capacitor Network plugin if it's installed.
    // Imported dynamically so the web build doesn't fail when the plugin
    // is missing (it ships with native builds, not web).
    let cleanupPlugin: (() => void) | null = null;
    (async () => {
      try {
        // @ts-ignore — the plugin may not be installed; we handle that.
        const mod = await import('@capacitor/network');
        const Network = mod.Network;
        if (Network && typeof Network.getStatus === 'function') {
          const status = await Network.getStatus();
          setOnline(Boolean(status?.connected));

          // Listen for changes if the plugin supports it.
          if (typeof Network.addListener === 'function') {
            const handle = await Network.addListener('networkStatusChange', (s: { connected: boolean }) => {
              setOnline(Boolean(s?.connected));
            });
            cleanupPlugin = () => {
              try { handle.remove(); } catch { /* ignore */ }
            };
          }
        }
      } catch {
        // Plugin not installed, or import failed — fall back silently.
      }
    })();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (cleanupPlugin) cleanupPlugin();
    };
  }, []);

  return online;
}
