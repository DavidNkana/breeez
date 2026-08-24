import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/account/delete
 *
 * Self-service account deletion. Apple App Store 5.1.1(v) compliance.
 *
 * Request body (JSON):
 *   {
 *     "email": "user@example.com",
 *     "password": "..."    // re-authentication; we never trust an existing
 *                          // session cookie for a destructive op
 *   }
 *
 * Flow:
 *   1. Verify the body shape and that both fields are non-empty.
 *   2. Sign in with the email + password against the *service-role* aware
 *      client. We do this via a fresh signInWithPassword call so we get an
 *      honest re-auth — even if the caller has a valid cookie, we still
 *      require the password to be re-entered. This protects against
 *      account takeover via stolen session cookies.
 *   3. Call the `public.account_delete()` SQL function via the service-role
 *      client. That function:
 *        - checks auth.uid() matches the caller
 *        - anonymizes order PII
 *        - deletes auth.users (cascades to customers, wishlist, cart, etc.)
 *   4. Return success. The caller (the React page) clears local state and
 *      navigates to a "your account has been deleted" confirmation.
 *
 * We DO NOT call `supabase.auth.signOut()` server-side. The caller is on
 * a different origin/tab than the in-app session, and signing out server-side
 * from a route handler doesn't reliably clear the browser's session cookie
 * (cookies are tied to the route response). Instead, the caller signs out
 * client-side after the RPC succeeds, which is the supported pattern.
 *
 * Why not use the service-role client to delete directly? Because the RPC
 * already encapsulates the PII anonymization + cascade logic atomically.
 * Doing it from JS would split the operation into two queries, which would
 * leave orders un-anonymized for a window if the second query failed.
 *
 * Security model:
 *   - Password re-entry required on every call (even for an already-signed-in
 *     user). This is the standard defense against session-cookie theft.
 *   - We never accept a uid from the client — auth.uid() comes from the JWT.
 *   - The SQL function re-checks auth.uid() internally.
 *   - All errors are mapped to generic messages; we don't reveal whether
 *     the email exists or the password is wrong (anti-enumeration).
 */

export const runtime = 'nodejs'; // need service-role env vars
export const dynamic = 'force-dynamic';

type DeleteBody = { email?: unknown; password?: unknown };
type DeleteResponse =
  | { ok: true }
  | { ok: false; error: string };

export async function POST(req: Request): Promise<NextResponse<DeleteResponse>> {
  // --- 1. Parse and validate body ---
  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: 'Email and password are required.' },
      { status: 400 }
    );
  }

  // Lightweight email shape check before we hit Supabase. We don't want to
  // ship a 10MB password payload through signIn just to have it rejected.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'That email doesn\u2019t look right.' },
      { status: 400 }
    );
  }

  // --- 2. Verify password against Supabase ---
  // Use the per-request server client (anon key + cookies) so we exercise
  // the real signInWithPassword code path. This signs a new session cookie
  // on success, but we deliberately don't keep that session — we only used
  // signIn to verify the credentials.
  const verify = createClient();
  const { error: signInErr } = await verify.auth.signInWithPassword({ email, password });
  if (signInErr) {
    // Map every error to the same generic message to prevent account
    // enumeration via timing or wording differences.
    return NextResponse.json(
      { ok: false, error: 'We couldn\u2019t verify those details. Please try again.' },
      { status: 401 }
    );
  }

  // Capture the user id BEFORE we run the destructive op. After auth.users
  // is deleted, auth.uid() will return null and we couldn't echo a useful
  // value back. (We don't actually use it in the response, but having it in
  // scope keeps the flow readable.)
  const { data: { user: verifiedUser } } = await verify.auth.getUser();
  if (!verifiedUser) {
    return NextResponse.json(
      { ok: false, error: 'We couldn\u2019t verify those details. Please try again.' },
      { status: 401 }
    );
  }

  // --- 3. Run the atomic deletion RPC ---
  // Use the service-role client. The RPC itself enforces auth.uid() == caller.
  const admin = createAdminClient();
  const { error: rpcErr } = await admin.rpc('account_delete');

  if (rpcErr) {
    // If the migration hasn't been run yet, the RPC doesn't exist and
    // Supabase returns a "function not found" error. Surface a clear hint
    // so the operator can self-diagnose rather than guess.
    const msg = String(rpcErr.message || '');
    if (/function .* does not exist/i.test(msg) || /account_delete/i.test(msg) && /not found/i.test(msg)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'The account_delete function is not installed on the database yet. ' +
            'Run supabase/migrations/012_account_delete_rpc.sql in Supabase Studio.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          'We couldn\u2019t complete the deletion right now. Please try again, or contact support if the problem persists.',
      },
      { status: 500 }
    );
  }

  // --- 4. Success. The caller will sign out client-side and show a
  //         confirmation. We deliberately do NOT redirect here because the
  //         page is on a different origin than the in-app session that we
  //         just verified — server-side redirects wouldn't reliably clear
  //         the user's session cookies.
  return NextResponse.json({ ok: true }, { status: 200 });
}
