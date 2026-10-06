const DEFAULT_PRODUCTION_ORIGIN = 'https://www.evasale.co.za';
const APPROVED_PRODUCTION_ORIGINS = new Set([
  'https://www.evasale.co.za',
  'https://breeez-lyart.vercel.app',
]);
const APPROVED_LOCAL_ORIGINS = new Set(['http://localhost:3000']);

function isLocalOrigin(origin: string): boolean {
  return APPROVED_LOCAL_ORIGINS.has(origin);
}

function isApprovedProductionOrigin(origin: string): boolean {
  return APPROVED_PRODUCTION_ORIGINS.has(origin);
}

/**
 * Return the origin Supabase should redirect to after an email action.
 * Production links must never be built from an arbitrary browser Origin.
 * Local development remains convenient when no explicit site URL is set.
 */
export function getAuthOrigin(currentOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (currentOrigin) {
    try {
      const origin = new URL(currentOrigin).origin;
      if (isLocalOrigin(origin) || isApprovedProductionOrigin(origin)) return origin;
    } catch {
      // Fall through to the configured approved origin.
    }
  }

  try {
    const url = new URL(configured || DEFAULT_PRODUCTION_ORIGIN);
    if (isLocalOrigin(url.origin)) return url.origin;
    if (url.protocol === 'https:' && isApprovedProductionOrigin(url.origin)) return url.origin;
  } catch {
    // Fall through to the approved production origin.
  }
  return DEFAULT_PRODUCTION_ORIGIN;
}

export function getAuthCallbackUrl(next = '/account', currentOrigin?: string): string {
  const url = new URL('/auth/callback', getAuthOrigin(currentOrigin));
  url.searchParams.set('next', getSafeNextPath(next));
  return url.toString();
}

export function getAuthResetUrl(currentOrigin?: string): string {
  return new URL('/auth/reset-password', getAuthOrigin(currentOrigin)).toString();
}

export function getLoginNextPath(searchParams?: { next?: string | string[] }): string {
  const next = Array.isArray(searchParams?.next) ? searchParams.next[0] : searchParams?.next;
  return getSafeNextPath(next);
}

/** Only allow an internal path; never redirect to a user-controlled origin. */
export function getSafeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/account';
  try {
    const parsed = new URL(next, 'https://breeez.invalid');
    return parsed.origin === 'https://breeez.invalid' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : '/account';
  } catch {
    return '/account';
  }
}
