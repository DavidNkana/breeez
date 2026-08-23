'use client';

import { useNetworkStatus } from '@/lib/utils/use-network-status';
import { OfflineScreen } from './OfflineScreen';

/**
 * Renders the branded OfflineScreen overlay whenever the device reports it
 * is offline. Mounted once in the root layout. Renders nothing when online.
 *
 * The hook handles both the browser `navigator.onLine` signal and (when
 * installed) the Capacitor Network plugin, so this works in both web and
 * native contexts without any extra wiring.
 *
 * Initial render is always `null` (we start with `online: true`) so the
 * server-rendered HTML never includes the offline overlay — preventing
 * a flash of the screen during hydration.
 */
export function OfflineGate() {
  const online = useNetworkStatus();
  if (online) return null;
  return <OfflineScreen />;
}
