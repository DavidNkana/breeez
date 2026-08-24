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
 *   2. Sign in with the email + password against a fresh server client.
 *      We deliberately sign in even if the caller already has a valid
 *      session cookie, so account takeover via stolen cookies can't
 *      trigger deletion.
 *   3. Call the `account_delete_anonymize_orders()` RPC. That function:
 *        - checks auth.uid() matches the caller
 *        - anonymizes order PII (email, name, phone, address line1/line2;
 *          keeps city/province/postal + financial fields for tax)
 *   4. Then call `auth.admin.deleteUser(uid)` via the SERVICE ROLE client.
 *      This goes through Supabase's own admin machinery (same as deleting
 *      a user from the dashboard) and properly cascades to customers,
 *      wishlists, carts, reviews, addresses. We use the admin API instead
 *      of raw `delete from auth.users` because raw DELETE against auth.users
 *      is protected by Supabase internals and is the cause of the prior
 *      500 — auth.admin.deleteUser() is the supported, reliable path.
 *   5. Return success. The caller (the React page) clears local state
 *      and navigates to the "your account has been deleted" confirmation.
 *
 * We DO NOT call `supabase.auth.signOut()` server-side. The caller is on
 * a different origin/tab than the in-app session, and signing out
 * server-side from a route handler doesn't reliably clear the browser's
 * session cookie. Instead, the caller signs out client-side after the
 * RPC succeeds, which is the supported pattern.
 *
 * Security model:
 *   - Password re-entry required on every call (even for an already-signed-in
 *     user). Standard defense against session-cookie theft.
 *   - We never accept a uid from the client — auth.uid() comes from the JWT.
 *   - The SQL function re-checks auth.uid() internally.
 *   - All errors are mapped to generic messages; we don't reveal whether
 *     the email exists or the password is wrong (anti-enumeration).
 */

export const runtime = 'nodejs'; // need service-role env vars
export const dynamic = 'force-dynamic';

type DeleteBody = { email?: unknown; password?: unknown };
type DeleteResponse = { ok: true } | { ok: false; error: string };

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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'That email doesn\u2019t look right.' },
      { status: 400 }
    );
  }

  // --- 2. Verify password against Supabase ---
  // createClient() from lib/supabase/server is ASYNC (reads cookies via
  // next/headers, which is async in Next 14+). MUST await before use.
  const verify = await createClient();
  const { data: signInData, error: signInErr } = await verify.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !signInData?.user) {
    // Map every error to the same generic message to prevent account
    // enumeration via timing or wording differences.
    return NextResponse.json(
      { ok: false, error: 'We couldn\u2019t verify those details. Please try again.' },
      { status: 401 }
    );
  }

  const userId = signInData.user.id;

  // --- 3. Anonymize order PII via the SECURITY DEFINER RPC ---
  // Uses auth.uid() internally — only operates on the caller's orders.
  const { error: rpcErr } = await verify.rpc('account_delete_anonymize_orders');

  if (rpcErr) {
    const msg = String(rpcErr.message || '');
    // Function-not-installed hint for operators who haven't run the migration.
    if (/function .* does not exist/i.test(msg)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'The account_delete_anonymize_orders function is not installed. ' +
            'Run supabase/migrations/012_account_delete_rpc.sql in Supabase Studio.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          'We couldn\u2019t complete the deletion right now. Please try again.',
      },
      { status: 500 }
    );
  }

  // --- 4. Delete the auth.users row via the admin API ---
  // Uses the service-role client (createAdminClient). This bypasses RLS and
  // uses Supabase's own admin machinery — the same call that runs when an
  // admin deletes a user from the dashboard. It cascades to customers,
  // wishlists, carts, reviews, addresses via the FK rules. Order rows are
  // NOT deleted — they remain (with anonymized PII) for tax.
  const admin = createAdminClient();
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);

  if (deleteErr) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'We anonymized your order history, but couldn\u2019t complete the account deletion. Please contact support so we can finish it manually.',
      },
      { status: 500 }
    );
  }

  // --- 5. Success. The caller will sign out client-side. ---
  return NextResponse.json({ ok: true }, { status: 200 });
}
