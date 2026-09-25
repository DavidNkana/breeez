'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isNative } from '@/lib/platform';
import {
  EVASALE_APP_URL,
  getEvasalePlatform,
  isPromotionSuppressed,
  readPromotionRecord,
  writePromotionSuppression,
  type EvasalePlatform,
  type PromotionRecord,
} from '@/lib/evasale-promotion';

const AUTO_PROMPT_DELAY_MS = 900;

function getPromotionStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function EvasaleAppPromotion() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<EvasalePlatform>('desktop');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const autoPrompted = useRef(false);
  const [mounted, setMounted] = useState(false);

  const restoreFocus = useCallback(() => {
    previouslyFocused.current?.focus();
    previouslyFocused.current = null;
  }, []);

  const dismiss = useCallback(() => {
    writePromotionSuppression(getPromotionStorage(), 'dismissed');
    setOpen(false);
    restoreFocus();
  }, [restoreFocus]);

  useEffect(() => {
    setMounted(true);
    if (isNative()) return;
    setPlatform(getEvasalePlatform(navigator.userAgent));
    const timer = window.setTimeout(() => {
      let record: PromotionRecord | null = null;
      record = readPromotionRecord(getPromotionStorage());
      if (autoPrompted.current || isPromotionSuppressed(record)) return;
      autoPrompted.current = true;
      previouslyFocused.current = document.activeElement as HTMLElement;
      setOpen(true);
    }, AUTO_PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget as HTMLElement;
      const focusable = dialog.querySelectorAll<HTMLElement>('button, a[href]');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const dialog = document.getElementById('evasale-app-promotion');
    dialog?.addEventListener('keydown', onKeyDown);
    return () => dialog?.removeEventListener('keydown', onKeyDown);
  }, [open, dismiss]);

  function openManually() {
    if (isNative()) return;
    autoPrompted.current = true;
    previouslyFocused.current = document.activeElement as HTMLElement;
    setOpen(true);
  }

  function handleStoreClick() {
    writePromotionSuppression(getPromotionStorage(), 'store-clicked');
    setOpen(false);
    restoreFocus();
  }

  if (!mounted || isNative()) return null;

  return (
    <>
      <button
        type="button"
        onClick={openManually}
        className="inline-flex items-center rounded-md bg-accent-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-600 sm:px-3 sm:text-sm"
      >
        Get the app
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-hidden="false">
          <button type="button" className="absolute inset-0 cursor-default bg-black/60" onClick={dismiss} aria-label="Close app promotion" />
          <div
            id="evasale-app-promotion"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evasale-app-promotion-title"
            aria-describedby="evasale-app-promotion-description"
            className="relative w-full max-w-md rounded-2xl border border-brand-200 bg-white p-6 text-brand-950 shadow-2xl dark:border-brand-700 dark:bg-brand-900 dark:text-white"
          >
            <button ref={closeButtonRef} type="button" onClick={dismiss} aria-label="Close" className="absolute right-4 top-4 rounded-md p-2 text-brand-500 hover:bg-brand-100 dark:hover:bg-brand-800">
              <span aria-hidden="true" className="text-xl leading-none">×</span>
            </button>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-600">Evasale on mobile</p>
            <h2 id="evasale-app-promotion-title" className="mt-2 pr-8 text-2xl font-bold">Take Evasale with you</h2>
            <p id="evasale-app-promotion-description" className="mt-2 text-sm leading-relaxed text-brand-600 dark:text-brand-300">
              Shop local finds faster from your phone, wherever you are.
            </p>
            {platform === 'ios' && (
              <p className="mt-5 rounded-lg bg-brand-100 px-4 py-3 text-sm font-medium dark:bg-brand-800">iPhone app coming soon</p>
            )}
            {platform !== 'ios' && (
              <a
                href={EVASALE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleStoreClick}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600"
              >
                {platform === 'android' ? 'Get it on Google Play' : 'Get the Android app'}
              </a>
            )}
            {platform === 'desktop' && <p className="mt-3 text-center text-xs text-brand-500">Open this link on your Android phone to install.</p>}
            {platform === 'ios' && <p className="mt-3 text-center text-xs text-brand-500">The iPhone app will be available soon.</p>}
          </div>
        </div>
      )}
    </>
  );
}
