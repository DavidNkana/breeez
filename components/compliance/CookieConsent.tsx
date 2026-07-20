'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'breeez:cookie_consent_v1';

type Consent = {
  necessary: true; // always
  analytics: boolean;
  marketing: boolean;
  ts: number;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getConsent(): Consent | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const consent = parsed as Consent;
    // 30-day expiry — after that, ask again (GDPR best practice)
    if (typeof consent.ts === 'number' && Date.now() - consent.ts > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return consent;
  } catch {
    return null;
  }
}

export function setConsent(c: Omit<Consent, 'ts'>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...c, ts: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * POPIA-compliant cookie banner. Shows once on first visit.
 * Three modes: Accept All | Reject Optional | Customise (per-bucket toggles).
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!isBrowser()) return;
    const existing = getConsent();
    if (!existing) {
      // Small delay so it doesn't fight first paint
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  function acceptAll() {
    setConsent({ necessary: true, analytics: true, marketing: true });
    setVisible(false);
  }
  function rejectOptional() {
    setConsent({ necessary: true, analytics: false, marketing: false });
    setVisible(false);
  }
  function saveCustom() {
    setConsent({ necessary: true, analytics, marketing });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl p-3 sm:p-4"
    >
      <div className="rounded-xl border border-brand-300 bg-white shadow-2xl">
        {!showCustom ? (
          <div className="p-5">
            <p className="text-sm font-semibold text-brand-950">
              We use cookies
            </p>
            <p className="mt-1 text-xs text-brand-600 leading-relaxed">
              Necessary cookies keep your cart and login working. Optional analytics cookies help us understand how Trends Day-to-Day is used so we can improve it. You can choose what you allow.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="inline-flex items-center rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={rejectOptional}
                className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50"
              >
                Reject optional
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="inline-flex items-center rounded-md px-2 py-2 text-sm text-brand-700 underline hover:text-brand-900"
              >
                Customise
              </button>
            </div>
            <p className="mt-3 text-[10px] text-brand-500">
              Read our{' '}
              <Link href="/legal/privacy" className="underline hover:text-brand-700">
                Privacy Notice
              </Link>{' '}
              or change your choice anytime on the legal page.
            </p>
          </div>
        ) : (
          <div className="p-5">
            <p className="text-sm font-semibold text-brand-950">Cookie preferences</p>
            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked disabled className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-700" />
                <span>
                  <span className="block font-medium text-brand-900">Necessary</span>
                  <span className="block text-xs text-brand-500">
                    Cart, login, security. Always on.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-700"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                />
                <span>
                  <span className="block font-medium text-brand-900">Analytics</span>
                  <span className="block text-xs text-brand-500">
                    Anonymous usage stats so we can improve Trends Day-to-Day.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-700"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />
                <span>
                  <span className="block font-medium text-brand-900">Marketing</span>
                  <span className="block text-xs text-brand-500">
                    Personalised offers. (Off by default — not currently used.)
                  </span>
                </span>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={saveCustom}
                className="inline-flex items-center rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
