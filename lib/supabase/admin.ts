import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Service-role Supabase client. BYPASSES RLS — only use in:
 * - Server-side admin operations (route handlers with explicit auth checks)
 * - Webhook handlers from payment gateways
 * - Admin UI server actions
 *
 * NEVER expose to the browser. NEVER import from a client component.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}