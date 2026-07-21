import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/session';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ReturnSection } from '@/components/account/ReturnSection';
import { notFound } from 'next/navigation';
import { formatRand } from '@/lib/format';

type Props = { params: { id: string } };

export default async function OrderDetailPage({ params }: Props) {
  const user = await requireUser();
  const supabase = await createAdminClient();

  const { data: order } = (await supabase
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .eq('customer_id', user.id)
    .maybeSingle()) as any;

  if (!order) notFound();

  const { data: items } = (await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)) as any;

  // Check for existing return
  const { data: ret } = (await supabase.from('returns').select('*').eq('order_id', order.id).maybeSingle()) as any;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <Link href="/account/orders" className="text-sm text-brand-600 hover:underline">← Back to orders</Link>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-mono font-semibold text-brand-950">{order.order_number}</h1>
            <p className="mt-0.5 text-sm text-brand-600">
              Placed {new Date(order.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Badge variant={order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered' ? 'success' : 'warning'}>
            {order.status.replace('_', ' ')}
          </Badge>
        </div>

        {order.shipping_tracking && (
          <div className="mt-4 rounded-md border border-brand-200 bg-white p-3 text-sm">
            <p className="font-medium text-brand-900">Tracking</p>
            <p className="mt-1 text-brand-700">{order.shipping_tracking}</p>
          </div>
        )}

        <ReturnSection
          orderId={order.id}
          orderStatus={order.status}
          orderCreatedAt={order.created_at}
          existingReturn={ret ?? null}
        />

        {/* (rest unchanged) */}

        <div className="mt-6 rounded-lg border border-brand-200 bg-white">
          <div className="border-b border-brand-100 px-4 py-3 text-sm font-medium text-brand-900">Items</div>
          <ul className="divide-y divide-brand-100">
            {((items ?? []) as any[]).map((it) => (
              <li key={it.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-brand-900">{it.product_name}</p>
                  <p className="text-xs text-brand-500">{it.variant_name} · SKU {it.sku} · Qty {it.quantity}</p>
                </div>
                <p className="font-medium text-brand-900">{formatRand(it.line_total_cents)}</p>
              </li>
            ))}
          </ul>
          <div className="border-t border-brand-100 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between text-brand-700"><span>Subtotal</span><span>{formatRand(order.subtotal_cents)}</span></div>
            <div className="flex justify-between text-brand-700"><span>Shipping</span><span>{formatRand(order.shipping_cents)}</span></div>
            <div className="flex justify-between font-semibold text-brand-950 pt-1 border-t border-brand-100"><span>Total</span><span>{formatRand(order.total_cents)}</span></div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}