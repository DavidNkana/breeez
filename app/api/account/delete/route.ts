import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/account/delete
 *
 * Self-service account deletion. Apple App Store 5.1.1(v) compliance.
 *
 * Flow:
 *   1. Validate body shape (email + password required).
 *   2. Re-auth via signInWithPassword (even if caller has a valid cookie).
 *   3. Call account_delete_anonymize_orders() RPC (anonymizes order PII).
 *   4. Call admin.auth.admin.deleteUser(userId) via service-role client.
 *      Supabase cascades to customers, wishlists, carts, reviews, addresses.
 *
 * Debug mode (DEV ONLY):
 *   Pass header `x-debug-delete: 1` to receive the underlying error message
 *   in the response. NEVER enable in production — it leaks server internals.
 *   Used for diagnosing 500s. The middleware / app sets this header in dev.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DeleteBody = { email?: unknown; password?: unknown };
type DeleteResponse = { ok: true } | { ok: false; error: string; debug?: string };

function err(req: Request, status: number, user: string, debug?: string): NextResponse<DeleteResponse> {
  const isDebug = req.headers.get('x-debug-delete') === '1';
  return NextResponse.json<DeleteResponse>(
    isDebug ? { ok: false, error: user, debug } : { ok: false, error: user },
    { status }
  );
}

export async function POST(req: Request): Promise<NextResponse<DeleteResponse>> {
  // --- 1. Parse body ---
  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return err(req, 400, 'Invalid request', 'body parse failed');
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return err(req, 400, 'Email and password are required.', 'missing email or password');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err(req, 400, 'That email doesn\u2019t look right.', 'bad email shape');
  }

  // --- 2. Re-auth ---
  let verify;
  try {
    verify = await createClient();
  } catch (e) {
    return err(req, 500, 'Service unavailable.', `createClient failed: ${(e as Error)?.message ?? String(e)}`);
  }

  let signInData;
  try {
    const result = await verify.auth.signInWithPassword({ email, password });
    signInData = result.data;
    if (result.error || !signInData?.user) {
      return err(req, 401, 'We couldn\u2019t verify those details. Please try again.',
        `signIn error: ${result.error?.message ?? 'no user returned'}`);
    }
  } catch (e) {
    return err(req, 500, 'We couldn\u2019t verify those details.', `signIn threw: ${(e as Error)?.message ?? String(e)}`);
  }

  const userId = signInData.user.id;

  // --- 3. Anonymize order PII ---
  try {
    const { error: rpcErr } = await verify.rpc('account_delete_anonymize_orders');
    if (rpcErr) {
      const msg = String(rpcErr.message || '');
      const debug = `rpc error: code=${rpcErr.code ?? 'n/a'} message="${msg}"`;
      if (/function .* does not exist/i.test(msg)) {
        return err(req, 500,
          'The account_delete_anonymize_orders function is not installed. Run supabase/migrations/012_account_delete_rpc.sql in Supabase Studio.',
          debug);
      }
      return err(req, 500, 'We couldn\u2019t complete the deletion right now. Please try again.', debug);
    }
  } catch (e) {
    return err(req, 500, 'We couldn\u2019t complete the deletion right now. Please try again.',
      `rpc threw: ${(e as Error)?.message ?? String(e)}`);
  }

  // --- 4. Delete the auth user via service-role admin API ---
  // Defensive: check the env var exists before constructing the client.
  // Without this, createAdminClient throws an opaque "Invalid API key"
  // error inside @supabase/supabase-js which doesn't make it clear that
  // the env var is missing.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return err(req, 500,
      'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.',
      'env var missing — set it in Vercel Settings → Environment Variables');
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return err(req, 500, 'Service unavailable.',
      `createAdminClient failed: ${(e as Error)?.message ?? String(e)}`);
  }

  try {
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return err(req, 500,
        'We anonymized your order history, but couldn\u2019t complete the account deletion. Please contact support so we can finish it manually.',
        `admin.deleteUser error: code=${deleteErr.code ?? 'n/a'} status=${deleteErr.status ?? 'n/a'} message="${deleteErr.message ?? ''}"`);
    }
  } catch (e) {
    return err(req, 500,
      'We anonymized your order history, but couldn\u2019t complete the account deletion.',
      `admin.deleteUser threw: ${(e as Error)?.message ?? String(e)}`);
  }

  // --- 5. Success ---
  return NextResponse.json({ ok: true }, { status: 200 });
}
