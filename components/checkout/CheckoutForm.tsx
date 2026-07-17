'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCart } from '@/lib/cart/store';
import { useToast } from '@/components/ui/Toast';
import { formatRand } from '@/lib/format';
import { getAllShippingOptions, calculateShippingCents, type ShippingMethod } from '@/lib/shipping';
import { isMockMode as paymentsMock } from '@/lib/payments';
import type { User } from '@supabase/supabase-js';

type Props = {
  user: User | null;
  savedAddresses: any[];
};

type Step = 'email' | 'address' | 'shipping' | 'payment';

export function CheckoutForm({ user, savedAddresses }: Props) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotalCents());
  const clear = useCart((s) => s.clear);
  const showToast = useToast((s) => s.show);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(user?.email ?? '');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Gauteng');
  const [postalCode, setPostalCode] = useState('');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('tcg_door');
  const [paymentMethod, setPaymentMethod] = useState<'payfast' | 'yoco' | 'ozow'>('payfast');
  const [submitting, setSubmitting] = useState(false);

  const shippingOptions = getAllShippingOptions(postalCode);
  const shippingCents = items.length > 0 ? calculateShippingCents(shippingMethod, subtotal) : 0;
  const totalCents = subtotal + shippingCents;

  async function placeOrder() {
    if (items.length === 0) {
      showToast('Your cart is empty', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      // Sync cart to server first
      const syncRes = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const { cartId } = await syncRes.json();

      // Create payment intent
      const paymentRes = await fetch('/api/checkout/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          email,
          fullName,
          phone,
          shippingMethod,
          paymentMethod,
          shippingAddress: { line1, line2, city, province, postal_code: postalCode }
        })
      });
      const { orderId, orderNumber, redirectUrl } = await paymentRes.json();

      // In mock mode, payment is auto-confirmed and we redirect to the success page
      // In real mode, we'd redirect to the gateway (PayFast etc)
      clear();
      router.push(`/checkout/success/${orderId}?ref=${orderNumber}`);
    } catch (err: any) {
      showToast(err.message || 'Checkout failed', 'error');
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand-300 p-8 text-center text-sm text-brand-500">
        Your cart is empty. <a href="/" className="text-accent-700 hover:underline">Continue shopping</a>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,320px]">
      <div>
        {/* Step indicator */}
        <ol className="mb-6 flex items-center gap-2 text-sm">
          {(['email', 'address', 'shipping', 'payment'] as Step[]).map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={step === s ? 'font-semibold text-brand-900' : 'text-brand-500'}>
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              {i < 3 && <span className="text-brand-300">→</span>}
            </li>
          ))}
        </ol>

        {step === 'email' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-brand-950">Contact</h2>
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Phone (for courier)" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="082 123 4567" />
            <Button onClick={() => setStep('address')} disabled={!email || !fullName || !phone} fullWidth size="lg">
              Continue to delivery
            </Button>
          </div>
        )}

        {step === 'address' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-brand-950">Delivery address</h2>
            {savedAddresses.length > 0 && (
              <div className="rounded border border-brand-200 bg-brand-50 p-3 text-sm">
                <p className="font-medium text-brand-900 mb-2">Use a saved address</p>
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setLine1(a.line1); setLine2(a.line2 ?? ''); setCity(a.city);
                      setProvince(a.province); setPostalCode(a.postal_code);
                    }}
                    className="block w-full text-left rounded border border-brand-200 bg-white p-2 mb-1 text-sm hover:border-brand-400"
                  >
                    <strong>{a.label}</strong> — {a.line1}, {a.city}, {a.province} {a.postal_code}
                  </button>
                ))}
              </div>
            )}
            <Input label="Address line 1" required value={line1} onChange={(e) => setLine1(e.target.value)} />
            <Input label="Address line 2 (optional)" value={line2} onChange={(e) => setLine2(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" required value={city} onChange={(e) => setCity(e.target.value)} />
              <Select
                label="Province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                options={[
                  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
                  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
                ].map((p) => ({ value: p, label: p }))}
              />
            </div>
            <Input label="Postal code" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => setStep('email')} variant="secondary">Back</Button>
              <Button onClick={() => setStep('shipping')} disabled={!line1 || !city || !postalCode} fullWidth size="lg">
                Continue to shipping
              </Button>
            </div>
          </div>
        )}

        {step === 'shipping' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-brand-950">Shipping method</h2>
            <div className="space-y-2">
              {shippingOptions.map((opt) => (
                <label
                  key={opt.method}
                  className={`block cursor-pointer rounded-lg border p-4 ${shippingMethod === opt.method ? 'border-brand-900 bg-brand-50' : 'border-brand-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-brand-900">{opt.label}</p>
                      <p className="text-sm text-brand-600">{opt.description}</p>
                      <p className="text-xs text-brand-500 mt-1">{opt.estimatedDays}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-950">{formatRand(opt.costCents)}</p>
                      {subtotal >= 50000 && opt.costCents > 0 && (
                        <p className="text-xs text-accent-700">Free over R500</p>
                      )}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="shipping"
                    value={opt.method}
                    checked={shippingMethod === opt.method}
                    onChange={() => setShippingMethod(opt.method)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep('address')} variant="secondary">Back</Button>
              <Button onClick={() => setStep('payment')} fullWidth size="lg">Continue to payment</Button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-brand-950">Payment method</h2>
            {paymentsMock() && (
              <div className="rounded-md border border-warning bg-yellow-50 p-3 text-sm text-yellow-900">
                <strong>Mock mode active.</strong> No real payment will be taken. Order will be auto-confirmed.
              </div>
            )}
            <div className="space-y-2">
              {[
                { id: 'payfast', label: 'PayFast', desc: 'Card, Instant EFT, SnapScan, Zapper, normal EFT' },
                { id: 'yoco', label: 'Yoco', desc: 'Credit/debit card' },
                { id: 'ozow', label: 'Ozow', desc: 'Instant EFT from your bank' }
              ].map((g) => (
                <label
                  key={g.id}
                  className={`block cursor-pointer rounded-lg border p-4 ${paymentMethod === g.id ? 'border-brand-900 bg-brand-50' : 'border-brand-200 bg-white'}`}
                >
                  <p className="font-medium text-brand-900">{g.label}</p>
                  <p className="text-sm text-brand-600">{g.desc}</p>
                  <input
                    type="radio"
                    name="payment"
                    value={g.id}
                    checked={paymentMethod === g.id as any}
                    onChange={() => setPaymentMethod(g.id as any)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep('shipping')} variant="secondary">Back</Button>
              <Button onClick={placeOrder} loading={submitting} fullWidth size="lg">
                Place order · {formatRand(totalCents)}
              </Button>
            </div>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-lg border border-brand-200 bg-white p-4">
        <h2 className="text-sm font-medium text-brand-900">Order summary</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.variantId} className="flex justify-between text-brand-700">
              <span className="line-clamp-1 pr-2">{it.name} × {it.quantity}</span>
              <span className="flex-shrink-0">{formatRand(it.priceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 border-t border-brand-100 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-brand-700"><dt>Subtotal</dt><dd>{formatRand(subtotal)}</dd></div>
          <div className="flex justify-between text-brand-700"><dt>Shipping</dt><dd>{shippingCents === 0 ? 'Free' : formatRand(shippingCents)}</dd></div>
        </dl>
        <div className="mt-3 border-t border-brand-100 pt-3 flex justify-between font-semibold">
          <span className="text-brand-950">Total</span>
          <span className="text-brand-950">{formatRand(totalCents)}</span>
        </div>
      </aside>
    </div>
  );
}