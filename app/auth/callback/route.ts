import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getAuthOrigin, getSafeNextPath } from '@/lib/auth/redirect';

/**
 * Auth callback handler.
 *
 * Supabase email confirmation + magic links land here with `?code=...` in the URL.
 * Recovery links may use `token_hash` instead; verification establishes the
 * session cookie before sending the user to the password form.
 *
 * Configured in supabase/config.toml as one of the redirect URLs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getAuthOrigin(new URL(request.url).origin);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const tokenType = searchParams.get('type');
  const next = getSafeNextPath(searchParams.get('next'));

  const isSupportedTokenType = tokenType === 'signup' || tokenType === 'email' || tokenType === 'magiclink' || tokenType === 'recovery';
  const redirectPath = tokenType === 'recovery' ? '/auth/reset-password' : next;

  if (code || (tokenHash && isSupportedTokenType)) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          }
        }
      }
    );

    try {
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({
            token_hash: tokenHash!,
            type: tokenType as 'signup' | 'email' | 'magiclink' | 'recovery'
          });
      if (!error) {
        return NextResponse.redirect(new URL(redirectPath, origin));
      }
    } catch {
      // Fall through to the safe login error redirect.
    }
  }

  // Something went wrong — redirect to login with an error
  return NextResponse.redirect(new URL('/auth/login?error=auth_callback_failed', origin));
}
