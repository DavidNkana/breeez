import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { formatRand } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

type Props = { params: { order: string }; searchParams: { ref?: string } };

export default async function OrderSuccessPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', params.order)
    .maybeSingle();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10 pb-20 safe-bottom text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-brand-950">Order placed!</h1>
        <p className="mt-2 text-sm text-brand-600">
          Thanks for shopping with Trends Day-to-Day. We&apos;ve sent a confirmation email.
        </p>

        {order && (
          <div className="mt-6 rounded-lg border border-brand-200 bg-white p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-brand-900">{(order as any).order_number}</span>
              <Badge variant="success">{((order as any).status as string).replace('_', ' ')}</Badge>
            </div>
            <p className="mt-2 text-sm text-brand-600">Total: <strong>{formatRand((order as any).total_cents)}</strong></p>
            <p className="text-xs text-brand-500 mt-1">Shipping: {((order as any).shipping_method as string || '').replace('_', ' ')}</p>
          </div>
        )}

        <div className="mt-6 flex gap-2 justify-center">
          <Link href="/account/orders" className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50">
            View orders
          </Link>
          <Link href="/" className="inline-flex items-center rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
            Continue shopping
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}