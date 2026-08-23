'use client';

/**
 * Open an external URL in the system browser, not the in-app WebView.
 *
 * Why this exists:
 *   Apple App Store guideline 5.1.1(v) requires that any "delete your
 *   account" link opens OUTSIDE the app. If we used `window.open(url, '_blank')`
 *   on iOS, the URL would open in the Capacitor WebView, which Apple
 *   rejects. The `@capacitor/browser` plugin calls the iOS/Android system
 *   browser instead, satisfying the rule.
 *
 *   On web (no native plugin), we fall back to a standard `window.open` with
 *   `noopener` for safety. This is fine because web users expect new-tab
 *   navigation to use a new tab.
 *
 * Safe to call server-side: it short-circuits if `window` is undefined.
 *
 * @param url  Absolute URL (http/https only). Caller is responsible for
 *             validating that the URL is trustworthy — we do not.
 * @param _target Optional target hint (currently ignored; reserved for
 *                future use, e.g. opening in a specific webview).
 */
export async function openExternal(url: string, _target?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!url || !/^https?:\/\//i.test(url)) {
    // Refuse to open anything that isn't http(s). Defensive.
    if (typeof console !== 'undefined') console.warn('openExternal: refusing non-http(s) URL', url);
    return;
  }

  // Try Capacitor's Browser plugin first. It's a dynamic import so web
  // builds don't fail when the plugin isn't installed.
  try {
    // @ts-ignore — plugin may not be installed; the catch handles it.
    const mod = await import('@capacitor/browser');
    const Browser = mod?.Browser;
    if (Browser && typeof Browser.open === 'function') {
      // Browser.open handles iOS (SFSafariViewController / external app)
      // and Android (Intent.ACTION_VIEW), both of which leave the WebView.
      await Browser.open({ url });
      return;
    }
  } catch {
    // Plugin not installed or import failed — fall through to web fallback.
  }

  // Web fallback: open in a new tab. `noopener,noreferrer` prevent the
  // destination from gaining a reference to our window.
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) return;
  } catch {
    // Some browsers (or strict CSP) may throw — fall through to the
    // location assignment below, which is the last-resort path.
  }

  // Last resort: navigate the current tab. Only used if everything else
  // is blocked (e.g. a popup blocker killed the new tab).
  window.location.href = url;
}
