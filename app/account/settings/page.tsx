'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { openExternal } from '@/lib/utils/open-external';
import { brand } from '@/lib/brand';
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
  const [openingDelete, setOpeningDelete] = useState(false);

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

  /**
   * Open the account-deletion flow. Apple App Store guideline 5.1.1(v)
   * requires that account-deletion be reachable from inside the app, and
   * that the actual deletion workflow happen in a real (not-stub) flow.
   * We open the deletion page on the same domain in the user's system
   * browser via the @capacitor/browser plugin (with a window.open
   * fallback for web), so:
   *   - On iOS native, Safari opens. Apple accepts this.
   *   - On Android native, the system browser opens.
   *   - On web, a new tab opens.
   */
  async function onDeleteAccount() {
    if (openingDelete) return;
    setOpeningDelete(true);
    try {
      const url = `${brand.siteUrl}/account/settings/delete`;
      await openExternal(url);
    } finally {
      // We don't know if the user actually completed deletion; we just
      // know we successfully opened the URL. Reset the button after a
      // moment so they can re-open if they closed the browser by mistake.
      setTimeout(() => setOpeningDelete(false), 1500);
    }
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

        {/* Account deletion — required by Apple App Store guideline 5.1.1(v)
            and Google Play User Data Policy. Visually de-emphasised so it
            isn't a casual tap target, but discoverable for users who look. */}
        <div className="mt-12 border-t border-brand-200 pt-6">
          <h2 className="text-sm font-semibold text-brand-700">Account deletion</h2>
          <p className="mt-1 text-xs text-brand-500">
            Permanently delete your {brand.name} account, order history, and personal
            data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={openingDelete}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
            {openingDelete ? 'Opening…' : 'Delete my account'}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
