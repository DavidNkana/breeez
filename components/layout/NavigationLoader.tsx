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