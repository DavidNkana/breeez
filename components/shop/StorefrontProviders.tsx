'use client';

import { useEffect } from 'react';
import { CartDrawer } from './CartDrawer';
import { ToastViewport } from '@/components/ui/Toast';
import { CartFlyProvider } from './CartFly';
import { CookieConsent } from '@/components/compliance/CookieConsent';
import { logError } from '@/lib/utils/error-logger';

export function StorefrontProviders() {
  useEffect(() => {
    // Wire global error listeners — send to /api/log/error (error_log table).
    function onError(event: ErrorEvent) {
      logError({
        message: event.message ?? 'Uncaught error',
        stack: event.error?.stack,
        severity: 'error',
      });
    }
    function onRejection(event: PromiseRejectionEvent) {
      logError({
        message: `Unhandled rejection: ${event.reason?.message ?? event.reason}`,
        stack: event.reason?.stack,
        severity: 'error',
      });
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return (
    <CartFlyProvider>
      <CartDrawer />
      <ToastViewport />
      <CookieConsent />
    </CartFlyProvider>
  );
}
