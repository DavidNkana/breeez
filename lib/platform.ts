'use client';

import { Capacitor } from '@capacitor/core';

/** True when running inside Capacitor on a native device (iOS/Android). */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return isNativeEnvironment(
      Capacitor.isNativePlatform(),
      document.body.className,
      document.body.dataset.native,
    );
  } catch {
    return isNativeEnvironment(false, document.body?.className, document.body?.dataset.native);
  }
}

/**
 * Secondary native signals protect web-only UI when a shell sets a body marker
 * before Capacitor has finished booting (or when the bridge is unavailable).
 */
export function isNativeEnvironment(
  capacitorNative: boolean,
  bodyClass = '',
  bodyNativeAttribute?: string,
): boolean {
  return capacitorNative || bodyNativeAttribute === 'true' || /(?:^|\s)(?:native|capacitor)(?:[-_\s]|$)/i.test(bodyClass);
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
