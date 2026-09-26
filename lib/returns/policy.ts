export const RETURN_WINDOW_DAYS = 7;

const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isWithinReturnWindow(deliveredAt: string | Date, now = new Date()): boolean {
  const elapsed = now.getTime() - new Date(deliveredAt).getTime();
  return elapsed >= 0 && elapsed <= RETURN_WINDOW_MS;
}
