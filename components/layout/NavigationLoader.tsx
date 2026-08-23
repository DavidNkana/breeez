'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Shows a centered loading overlay during client-side navigations.
 * Fires on Link clicks, router.push(), etc. — not on initial page load.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When the route changes, we were navigating — hide the loader
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept all <a> and button clicks that trigger navigation
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Check if it's a link or inside a link
      const link = target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;
      // Skip: external links, anchors, tel:, mailto:, javascript:, download links
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('tel:') ||
          href.startsWith('mailto:') || href.startsWith('javascript:') ||
          link.hasAttribute('download') || link.getAttribute('target') === '_blank') return;
      // Skip: links that just toggle UI (cart drawer, search, etc.)
      if (href === '#' || link.getAttribute('role') === 'button' || link.hasAttribute('aria-label')) return;
      // Skip: actual click target is a <button> (e.g. wishlist heart, add-to-cart, etc.)
      // — the button's own handler controls what happens, not the parent <Link>.
      // Without this, clicking a button inside a card Link sets loading=true but
      // e.preventDefault() on the button blocks the actual nav, so loading never resets.
      if (target.closest('button')) return;
      // Skip: link points to the current page. Next.js makes this a no-op so no
      // navigation fires, leaving the loader stuck "loading" forever. Covers the
      // logo on home (clicking it while already on /), current-page nav links,
      // and any other Link that has nothing to actually navigate to.
      try {
        const resolved = new URL(link.href, window.location.href);
        if (resolved.origin === window.location.origin &&
            resolved.pathname === window.location.pathname &&
            resolved.search === window.location.search) return;
      } catch { /* malformed URL — fall through to setLoading */ }
      setLoading(true);
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-brand-600 animate-pulse">Loading…</p>
      </div>
    </div>
  );
}
