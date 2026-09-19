import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export async function deleteProduct(supabase: SupabaseClient<Database>, productId: string) {
  // The checked-in generated Supabase type currently represents this void RPC
  // with an undefined argument type; the SQL migration is the source of truth
  // for its explicit uuid argument.
  const { error } = await supabase.rpc('delete_product' as never, { p_product_id: productId } as never);
  if (!error) return null;

  if (error.code === 'PGRST202') {
    return new Error('Product deletion is not installed on the database. Apply supabase/migrations/019_atomic_product_delete.sql (or run supabase db push), then retry.');
  }
  return error;
}
