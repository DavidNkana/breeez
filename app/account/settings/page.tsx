'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Not logged in', 'error');
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('customers').update({
      full_name: fullName
    } as any).eq('id', user.id);
    setLoading(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Profile updated', 'success');
    router.refresh();
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Settings</h1>
        <p className="mt-1 text-sm text-brand-600">Update your profile information.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            label="Display name"
            placeholder="David"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            helperText="This will show as your greeting on the account page."
          />
          <div className="flex gap-2">
            <Button type="submit" loading={loading} size="lg">Save</Button>
            <LogoutButton redirectTo="/" />
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}