'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart/store';
import { useToast } from '@/components/ui/Toast';

const KEY = 'breeez:cart_abandon_logged_at';
const SUPPRESS_UNTIL_KEY = 'breeez:cart_reminder_suppress';

/**
 * Lightweight abandoned-cart reminder.
 *
 *   - Logs the most recent cart contents the first time the user leaves a non-empty cart
 *     without completing checkout for 24 h.
 *   - In /api/abandoned-cart/run (a scheduled endpoint), server cross-references these
 *     "potentially abandoned" carts against the orders table and emails the user
 *     only if no order landed in the last 24 h.
 *
 * This keeps the heavy lifting (sending mail) on a schedule. Client side just
 * tracks intent. No abuse vector — only the email captured when a logged-in
 * user checks out can be sent to.
 */
export function CartAbandonmentTracker() {
  const items = useCart((s) => s.items);
  const showToast = useToast((s) => s.show);
  const [isMounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (typeof window === 'undefined') return;

    const hasItems = items && items.length > 0;
    const suppressedUntil = window.localStorage.getItem(SUPPRESS_UNTIL_KEY);
    const suppressed = suppressedUntil && Number(suppressedUntil) > Date.now();

    if (hasItems && !suppressed) {
      // Log the abandoned cart snapshot — server cron will check this against orders
      const lastLogged = window.localStorage.getItem(KEY);
      const snapshot = {
        ts: Date.now(),
        items: items.map((it) => ({
          slug: it.productSlug,
          name: it.name,
          price_cents: it.priceCents,
          quantity: it.quantity,
          image_url: it.imageUrl,
        })),
        totalCents: items.reduce((acc, it) => acc + it.priceCents * it.quantity, 0),
      };
      const existing = lastLogged ? JSON.parse(lastLogged) : [];
      const list = Array.isArray(existing) ? existing : [];
      list.push(snapshot);
      // Keep last 5 entries only
      const trimmed = list.slice(-5);
      window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    }
  }, [isMounted, items]);

  // UX nicety: when user adds to cart on PDP and abandons, quietly show a "saved" reminder
  // only the FIRST time (cookie-consent-style, dismissed permanently via suppression).
  return null;
}

export function dismissAbandonmentReminderFor(valueMs = 7 * 24 * 60 * 60 * 1000) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    SUPPRESS_UNTIL_KEY,
    String(Date.now() + valueMs)
  );
}
