'use client';

import { useEffect } from 'react';
import { CartDrawer } from './CartDrawer';
import { ToastViewport } from '@/components/ui/Toast';

export function StorefrontProviders() {
  // Lock body scroll for any future fixed-position UI (drawer does its own)
  useEffect(() => {
    // No-op for now
  }, []);
  return (
    <>
      <CartDrawer />
      <ToastViewport />
    </>
  );
}