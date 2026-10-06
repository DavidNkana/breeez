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
