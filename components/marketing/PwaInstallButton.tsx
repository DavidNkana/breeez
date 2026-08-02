'use client';

import { useEffect, useState } from 'react';
import { isNative } from '@/lib/platform';

/**
 * PWA install button — only shown to web users whose browser
 * supports the "Add to Home Screen" prompt and who haven't already installed.
 * Hidden entirely in the Capacitor native app.
 */
export function PwaInstallButton() {
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Never show in the native app
    if (isNative()) return;

    // Already installed (standalone / fullscreen mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Listen for the beforeinstallprompt event
    function onPrompt(e: Event) {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    }

    // If already installed while the page is open
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setVisible(false);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', onChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', onChange);
    };
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setPrompt(null);
  }

  if (!visible) return null;

  return (
    <div className="mt-8 rounded-lg border border-accent-200 bg-accent-50 p-5 text-center">
      <p className="text-sm font-semibold text-brand-950">
        Install Trends Day-to-Day on your phone
      </p>
      <p className="mt-1 text-xs text-brand-600">
        Add to your home screen for quick access — no app store needed.
      </p>
      <button
        type="button"
        onClick={handleInstall}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Add to Home Screen
      </button>
    </div>
  );
}
