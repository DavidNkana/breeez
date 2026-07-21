'use client';

import { Capacitor } from '@capacitor/core';

/** True when running inside Capacitor on a native device (iOS/Android). */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Returns 'ios' | 'android' | 'web' for platform-specific branches. */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (!isNative()) return 'web';
  try {
    return Capacitor.getPlatform() as 'ios' | 'android';
  } catch {
    return 'web';
  }
}
