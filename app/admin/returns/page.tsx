import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ReturnsManager } from '@/components/admin/ReturnsManager';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AdminReturnsPage() {
  await requireAdmin();
  const supabase: any = await createAdminClient();
  const { data: returns } = await supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(50);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950">Returns</h1>
            <p className="mt-1 text-sm text-brand-600">Manage customer return requests.</p>
          </div>
          <Link href="/admin" className="text-sm text-brand-600 hover:underline">← Dashboard</Link>
        </div>
        <div className="mt-6">
          <ReturnsManager returns={returns ?? []} />
        </div>
      </main>
      <Footer />
    </>
  );
}