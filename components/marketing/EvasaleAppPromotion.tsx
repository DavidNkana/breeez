'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isNative } from '@/lib/platform';
import { getConsent } from '@/components/compliance/CookieConsent';
import {
  EVASALE_APP_URL,
  EVASALE_COOKIE_CLOSED_EVENT,
  EVASALE_OPEN_EVENT,
  getEvasalePlatform,
  isPromotionSuppressed,
  readPromotionRecord,
  writePromotionSuppression,
  type EvasalePlatform,
} from '@/lib/evasale-promotion';

const AUTO_PROMPT_DELAY_MS = 1800;
const POST_CONSENT_DELAY_MS = 250;

function getPromotionStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isPreviewPromptRequested() {
  return new URLSearchParams(window.location.search).get('show-app-promotion') === '1';
}

export function EvasaleAppTrigger({ className = '' }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isNative());
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(EVASALE_OPEN_EVENT))}
      className={`inline-flex min-h-9 shrink-0 items-center rounded-md bg-accent-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 sm:px-3 sm:text-sm ${className}`}
    >
      <span className="sm:hidden">Get app</span>
      <span className="hidden sm:inline">Download the app</span>
    </button>
  );
}

export function EvasaleAppPromotion() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<EvasalePlatform>('desktop');
  const [eligible, setEligible] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const autoPrompted = useRef(false);

  const restoreFocus = useCallback(() => {
    previouslyFocused.current?.focus();
    previouslyFocused.current = null;
  }, []);

  const dismiss = useCallback(() => {
    writePromotionSuppression(getPromotionStorage(), 'dismissed');
    setOpen(false);
    restoreFocus();
  }, [restoreFocus]);

  const openManually = useCallback(() => {
    if (!eligible || isNative()) return;
    autoPrompted.current = true;
    previouslyFocused.current = document.activeElement as HTMLElement;
    setOpen(true);
  }, [eligible]);

  useEffect(() => {
    const native = isNative();
    setEligible(!native);
    if (native) return;
    setPlatform(getEvasalePlatform(navigator.userAgent));

    const maybeAutoPrompt = () => {
      if (autoPrompted.current) return;
      if (!isPreviewPromptRequested() && isPromotionSuppressed(readPromotionRecord(getPromotionStorage()))) return;
      autoPrompted.current = true;
      previouslyFocused.current = document.activeElement as HTMLElement;
      setOpen(true);
    };
    const onCookieConsentClosed = () => window.setTimeout(maybeAutoPrompt, POST_CONSENT_DELAY_MS);
    window.addEventListener(EVASALE_COOKIE_CLOSED_EVENT, onCookieConsentClosed);
    const afterInitialContent = window.setTimeout(() => {
      // A missing consent record means the cookie card is either visible or about to be visible.
      // Wait for its explicit close event instead of covering it with this promotion.
      if (getConsent()) {
        maybeAutoPrompt();
      }
    }, AUTO_PROMPT_DELAY_MS);
    window.addEventListener(EVASALE_OPEN_EVENT, openManually);
    return () => {
      window.clearTimeout(afterInitialContent);
      window.removeEventListener(EVASALE_COOKIE_CLOSED_EVENT, onCookieConsentClosed);
      window.removeEventListener(EVASALE_OPEN_EVENT, openManually);
    };
  }, [openManually]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const dialog = document.getElementById('evasale-app-promotion');
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
      if (event.key !== 'Tab') return;
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
    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [open, dismiss]);

  function handleStoreClick() {
    writePromotionSuppression(getPromotionStorage(), 'store-clicked');
    setOpen(false);
    restoreFocus();
  }

  if (!eligible) return null;

  return open ? (
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
        <p id="evasale-app-promotion-description" className="mt-2 text-sm leading-relaxed text-brand-600 dark:text-brand-300">Shop local finds faster from your phone, wherever you are.</p>
        {platform === 'ios' && <p className="mt-5 rounded-lg bg-brand-100 px-4 py-3 text-sm font-medium dark:bg-brand-800">iPhone app coming soon</p>}
        {platform !== 'ios' && (
          <a href={EVASALE_APP_URL} target="_blank" rel="noopener noreferrer" onClick={handleStoreClick} className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600">
            {platform === 'android' ? 'Get it on Google Play' : 'Get the Android app'}
          </a>
        )}
        {platform === 'desktop' && <p className="mt-3 text-center text-xs text-brand-500">Open this link on your Android phone to install.</p>}
        {platform === 'ios' && <p className="mt-3 text-center text-xs text-brand-500">The iPhone app will be available soon.</p>}
      </div>
    </div>
  ) : null;
}
