export type SignupState = 'error' | 'check-email' | 'authenticated';

/** Classifies Supabase's signup response so UI cannot claim an email was sent on failure. */
export function getSignupState({
  error,
  user,
  session,
}: {
  error: { message: string } | null;
  user: unknown;
  session: unknown;
}): SignupState {
  if (error || !user) return 'error';
  return session ? 'authenticated' : 'check-email';
}

/** Query-string email values are UI convenience only, never an auth credential. */
export function getSafeEmailPrefill(value: string | string[] | undefined): string {
  const email = (Array.isArray(value) ? value[0] : value)?.trim() || '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}
