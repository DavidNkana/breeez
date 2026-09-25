export const EVASALE_APP_BASE_URL = 'https://play.google.com/store/apps/details?id=com.breeez.app';
const EVASALE_APP_ATTRIBUTION = {
  utm_source: 'evasale_web',
  utm_medium: 'app_prompt',
  utm_campaign: 'app_install',
} as const;

// Play's install referrer receives campaign context from the encoded referrer payload.
// This is aggregate attribution only: no user identifier or analytics request is sent.
export const EVASALE_APP_URL = `${EVASALE_APP_BASE_URL}&${new URLSearchParams({
  referrer: new URLSearchParams(EVASALE_APP_ATTRIBUTION).toString(),
}).toString()}`;
export const EVASALE_PROMOTION_VERSION = 1;
export const EVASALE_PROMOTION_KEY = `evasale:app-promotion:v${EVASALE_PROMOTION_VERSION}`;
export const EVASALE_SUPPRESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type EvasalePlatform = 'android' | 'ios' | 'desktop';
export type PromotionRecord = {
  version: number;
  suppressedUntil: number;
  action: 'dismissed' | 'store-clicked';
};

export function getEvasalePlatform(userAgent: string): EvasalePlatform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  return 'desktop';
}

export function isPromotionSuppressed(record: PromotionRecord | null, now = Date.now()): boolean {
  return Boolean(
    record &&
      record.version === EVASALE_PROMOTION_VERSION &&
      Number.isFinite(record.suppressedUntil) &&
      record.suppressedUntil > now,
  );
}

export function readPromotionRecord(storage: Pick<Storage, 'getItem'> | null, now = Date.now()): PromotionRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(EVASALE_PROMOTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PromotionRecord>;
    if (
      parsed.version !== EVASALE_PROMOTION_VERSION ||
      typeof parsed.suppressedUntil !== 'number' ||
      (parsed.action !== 'dismissed' && parsed.action !== 'store-clicked')
    ) return null;
    return isPromotionSuppressed(parsed as PromotionRecord, now) ? parsed as PromotionRecord : null;
  } catch {
    return null;
  }
}

export function writePromotionSuppression(
  storage: Pick<Storage, 'setItem'> | null,
  action: PromotionRecord['action'],
  now = Date.now(),
): void {
  if (!storage) return;
  try {
    storage.setItem(EVASALE_PROMOTION_KEY, JSON.stringify({
      version: EVASALE_PROMOTION_VERSION,
      suppressedUntil: now + EVASALE_SUPPRESSION_MS,
      action,
    } satisfies PromotionRecord));
  } catch {
    // Storage can be disabled or full. The in-memory component state remains safe.
  }
}
