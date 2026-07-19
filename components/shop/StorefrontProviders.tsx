'use client';

import { useEffect } from 'react';
import { CartDrawer } from './CartDrawer';
import { ToastViewport } from '@/components/ui/Toast';
import { CartFlyProvider } from './CartFly';

export function StorefrontProviders() {
  useEffect(() => {
    // No-op for now
  }, []);
  return (
    <CartFlyProvider>
      <CartDrawer />
      <ToastViewport />
    </CartFlyProvider>
  );
}
