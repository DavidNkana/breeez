import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Customer } from '@/lib/supabase/types';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login?next=/account');
  return user;
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return data;
}

export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!admin) redirect('/');
  return user;
}