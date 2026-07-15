'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function LogoutButton({ redirectTo = '/' }: { redirectTo?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const showToast = useToast((s) => s.show);

  async function onSignOut() {
    setLoading(true);
    await getSupabase().auth.signOut();
    setLoading(false);
    showToast('Signed out', 'info');
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Button onClick={onSignOut} loading={loading} variant="ghost" size="sm">Sign out</Button>
  );
}