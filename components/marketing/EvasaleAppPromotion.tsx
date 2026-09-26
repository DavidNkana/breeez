'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isNative } from '@/lib/platform';
import { getConsent } from '@/components/compliance/CookieConsent';
import {
  EVASALE_COOKIE_CLOSED_EVENT,
  EVASALE_OPEN_EVENT,
  EVASALE_STORE_LINKS,
  isPromotionSuppressed,
  readPromotionRecord,
  writePromotionSuppression,
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

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 shrink-0">
      <path fill="#34A853" d="M2.5 3.2c-.3.4-.5 1-.5 1.8v14c0 .8.2 1.4.5 1.8L13.9 12 2.5 3.2Z" />
      <path fill="#4285F4" d="m15.1 13.1-2.9-2.2L2.5 3.2c.3-.4.8-.5 1.4-.2l13.2 7.5-2 2.6Z" />
      <path fill="#FBBC04" d="m15.1 13.1-2.9-2.2L2.5 20.8c.3.4.8.5 1.4.2l13.2-7.5-2-2.6Z" />
      <path fill="#EA4335" d="m17.1 10.5 4.1 2.3c.8.5.8 1.2 0 1.7l-4.1 2.3-2-2.6 2-3.7Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 shrink-0 fill-current">
      <path d="M17.05 12.54c-.02-2.08 1.7-3.08 1.78-3.13a3.82 3.82 0 0 0-3.01-1.63c-1.27-.13-2.5.76-3.15.76-.66 0-1.68-.75-2.76-.73a4.07 4.07 0 0 0-3.4 2.08c-1.47 2.55-.37 6.3 1.04 8.36.69 1 1.5 2.12 2.58 2.08 1.04-.04 1.44-.67 2.7-.67 1.26 0 1.62.67 2.72.65 1.13-.02 1.84-1 2.51-2.02a8.3 8.3 0 0 0 1.14-2.34 3.62 3.62 0 0 1-2.15-3.41Zm-2.07-6.1a3.63 3.63 0 0 0 .83-2.61 3.7 3.7 0 0 0-2.39 1.24 3.47 3.47 0 0 0-.86 2.51 3.05 3.05 0 0 0 2.42-1.14Z" />
    </svg>
  );
}

export function EvasaleAppPromotion() {
  const [open, setOpen] = useState(false);
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
      const focusable = dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
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
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Evasale app stores">
          {EVASALE_STORE_LINKS.map((store) => {
            const content = (
              <>
                {store.id === 'google-play' ? <GooglePlayIcon /> : <AppleIcon />}
                <span className="min-w-0 text-left">
                  <span className="block text-xs font-medium uppercase tracking-wide opacity-80">Download on</span>
                  <span className="block truncate text-sm font-bold">{store.label}</span>
                </span>
              </>
            );

            return store.href ? (
              <a
                key={store.id}
                href={store.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleStoreClick}
                aria-label={store.ariaLabel}
                className="inline-flex min-h-16 items-center gap-3 rounded-xl bg-accent-500 px-4 py-3 text-white shadow-sm hover:bg-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                {content}
              </a>
            ) : (
              <button
                key={store.id}
                type="button"
                disabled
                aria-disabled="true"
                aria-label={store.ariaLabel}
                className="inline-flex min-h-16 cursor-not-allowed items-center gap-3 rounded-xl border border-brand-300 bg-brand-100 px-4 py-3 text-brand-700 opacity-75 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-200"
              >
                {content}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-brand-500">The iPhone app will be available soon.</p>
      </div>
    </div>
  ) : null;
}
