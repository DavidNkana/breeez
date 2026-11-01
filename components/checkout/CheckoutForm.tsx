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
import { PaymentMethodsStrip } from './PaymentMethodsStrip';
import { CouponCodeInput } from './CouponCodeInput';
import type { AppliedCoupon } from './CouponCodeInput';
import { BUILDING_TYPES, buildingNameLabel, type BuildingType } from '@/lib/delivery/buildings';
import { DRIVER_TIP_PERCENTS, type EbucksSummary } from '@/lib/loyalty/ebucks';
import { usePayfastOnsite } from './usePayfastOnsite';

type Props = {
  user: User | null;
  savedAddresses: any[];
  mockPaymentsEnabled: boolean;
  payJustNowEnabled: boolean;
  loyalty: EbucksSummary;
};

type Step = 'contact' | 'address' | 'delivery' | 'payment';

const STEP_LABELS: Array<{ key: Step; label: string }> = [
  { key: 'contact', label: 'Contact' },
  { key: 'address', label: 'Delivery address' },
  { key: 'delivery', label: 'Delivery service' },
  { key: 'payment', label: 'Payment' },
];

export function CheckoutForm({ user, savedAddresses, mockPaymentsEnabled, payJustNowEnabled, loyalty }: Props) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotalCents());
  const clear = useCart((s) => s.clear);
  const showToast = useToast((s) => s.show);

  const [step, setStep] = useState<Step>('contact');
  const [email, setEmail] = useState(user?.email ?? '');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? '');
  const [phone, setPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const [buildingType, setBuildingType] = useState<BuildingType | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Gauteng');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [doorConfirmed, setDoorConfirmed] = useState(false);
  const [saveLocation, setSaveLocation] = useState(Boolean(user));

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('tcg_door');
  const [tipPercent, setTipPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'payfast' | 'payjustnow'>('payfast');
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const onsite = usePayfastOnsite();

  const shippingOptions = getAllShippingOptions(postalCode);
  const shippingCents = items.length > 0 ? calculateShippingCents(shippingMethod, subtotal) : 0;
  const tipCents = Math.round((subtotal * tipPercent) / 100);
  const couponDiscountCents = coupon?.discountCents ?? 0;
  // E bucks: 10+ completed orders earns R50 off this order.
  const loyaltyDiscountCents = loyalty.qualifies ? Math.min(5000, subtotal) : 0;
  const discountCents = couponDiscountCents + loyaltyDiscountCents;
  const totalCents = Math.max(0, subtotal + shippingCents + tipCents - discountCents);

  const addressReady = Boolean(buildingType && buildingName.trim() && line1.trim() && city.trim() && postalCode.trim() && doorConfirmed);

  function applySavedAddress(a: any) {
    setBuildingType((a.building_type as BuildingType) ?? 'house');
    setBuildingName(a.building_name ?? '');
    setLine1(a.line1 ?? '');
    setLine2(a.line2 ?? '');
    setCity(a.city ?? '');
    setProvince(a.province ?? 'Gauteng');
    setPostalCode(a.postal_code ?? '');
    setDeliveryInstructions(a.delivery_instructions ?? '');
    setPhone((prev: string) => prev || a.phone || '');
    setDoorConfirmed(false);
  }

  async function placeOrder() {
    if (items.length === 0) {
      showToast('Your cart is empty', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const syncRes = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const { cartId } = await syncRes.json();

      const paymentRes = await fetch('/api/checkout/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          email,
          fullName,
          phone,
          userId: user?.id,
          shippingMethod,
          paymentMethod,
          shippingAddress: { line1, line2, city, province, postal_code: postalCode },
          orderNote: orderNote.trim() || null,
          deliveryInstructions: deliveryInstructions.trim() || null,
          buildingType,
          buildingName: buildingName.trim(),
          driverTipPercent: tipPercent,
          doorAddressConfirmed: doorConfirmed,
          saveLocation,
          couponCode: coupon?.code ?? null
        })
      });
      const { orderId, orderNumber, redirectUrl, error } = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(error || 'Checkout failed');

      clear();

      // PayFast Onsite: the payment modal renders inside THIS page, so the
      // customer never leaves the app. If Onsite is not enabled on the
      // merchant account we fall back to the hosted checkout automatically.
      if (paymentMethod === 'payfast' && orderId) {
        const outcome = await onsite.pay({
          orderId,
          email,
          fallbackUrl: redirectUrl ?? undefined,
          onPaid: () => {
            window.location.assign(
              `${window.location.origin}/checkout/success/${orderId}?ref=${orderNumber}`,
            );
          },
          onCancelled: () => {
            showToast('Payment cancelled. Your items are back in your cart.', 'warning');
            router.push('/cart');
          },
        });
        if (outcome === 'paid') return;
        if (outcome === 'cancelled') return;
        // 'unavailable' → the fallback redirect has already been triggered.
        return;
      }

      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }
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
    <div className="grid gap-6 md:grid-cols-[1fr,340px]">
      <div>
        {/* Steps */}
        <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {STEP_LABELS.map((s, i) => {
            const currentIndex = STEP_LABELS.findIndex((x) => x.key === step);
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
            return (
              <li key={s.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => i <= currentIndex && setStep(s.key)}
                  className={
                    state === 'todo'
                      ? 'cursor-default text-brand-400 dark:text-brand-500'
                      : state === 'current'
                        ? 'font-semibold text-brand-900 dark:text-brand-50'
                        : 'text-brand-600 hover:underline dark:text-brand-300'
                  }
                >
                  {i + 1}. {s.label}
                </button>
                {i < STEP_LABELS.length - 1 && <span className="text-brand-300">→</span>}
              </li>
            );
          })}
        </ol>

        {/* ---------------------------------------------------- 1. Contact */}
        {step === 'contact' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-brand-50 p-5 dark:border-brand-700 dark:bg-brand-800">
            <h2 className="text-lg font-semibold text-brand-950 dark:text-brand-50">Contact</h2>
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Phone (for the courier)" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="082 123 4567" />

            {/* Order note for Evasale */}
            <div className="rounded-md border border-brand-200 bg-white p-3 dark:border-brand-600 dark:bg-brand-900">
              <button
                type="button"
                onClick={() => setShowNote((v) => !v)}
                className="flex w-full items-center justify-between text-left text-sm font-medium text-brand-900 dark:text-brand-50"
              >
                <span>{showNote ? 'Hide note for Evasale' : '+ Add a note for Evasale'}</span>
                <span className="text-brand-400">{showNote ? '−' : '+'}</span>
              </button>
              {showNote && (
                <div className="mt-3">
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Anything we should know? For example: the gate code, which door, or that the dog is friendly."
                    className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-950 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-brand-500">We only use this to get your delivery right.</p>
                </div>
              )}
            </div>

            <Button onClick={() => setStep('address')} disabled={!email || !fullName || !phone} size="lg" className="w-full">
              Continue to delivery address
            </Button>
          </div>
        )}

        {/* -------------------------------------------- 2. Delivery address */}
        {step === 'address' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-brand-50 p-5 dark:border-brand-700 dark:bg-brand-800">
            <h2 className="text-lg font-semibold text-brand-950 dark:text-brand-50">Delivery address</h2>
            <p className="text-sm text-brand-600 dark:text-brand-300">
              This parcel comes to your door, so we need to know exactly which door.
            </p>

            {savedAddresses.length > 0 && (
              <div className="rounded border border-brand-200 bg-white p-3 text-sm dark:border-brand-600 dark:bg-brand-900">
                <p className="mb-2 font-medium text-brand-900 dark:text-brand-50">Use a saved address</p>
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => applySavedAddress(a)}
                    className="mb-1 block w-full rounded border border-brand-200 bg-white p-2 text-left text-sm hover:border-brand-400 dark:border-brand-700 dark:bg-brand-800"
                  >
                    <strong>{a.label}</strong> — {a.building_name ? `${a.building_name}, ` : ''}
                    {a.line1}, {a.city}, {a.province} {a.postal_code}
                  </button>
                ))}
              </div>
            )}

            {/* Building type */}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brand-900 dark:text-brand-50">
                What kind of place is this?
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {BUILDING_TYPES.map((b) => (
                  <label
                    key={b.value}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                      buildingType === b.value
                        ? 'border-accent-500 bg-accent-50 dark:border-accent-500 dark:bg-brand-700'
                        : 'border-brand-200 bg-white dark:border-brand-600 dark:bg-brand-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="buildingType"
                      value={b.value}
                      checked={buildingType === b.value}
                      onChange={() => setBuildingType(b.value)}
                      className="mt-0.5 accent-[#C72E28]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-brand-900 dark:text-brand-50">{b.label}</span>
                      <span className="block text-xs text-brand-600 dark:text-brand-300">{b.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Input
              label={buildingNameLabel(buildingType)}
              required
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="Raslouw Gardens Estate"
            />

            <Input label="Street address" required value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="48 Erlanger Street" />
            <Input label="Unit / flat / house number (optional)" value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Flat 4, Block B" />
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

            <div>
              <label className="mb-1 block text-sm font-medium text-brand-900 dark:text-brand-50">
                Delivery instructions (optional)
              </label>
              <textarea
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                rows={3}
                maxLength={240}
                placeholder="The gate is on the left, buzz 12. Please do not leave the parcel with the neighbour."
                className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-950 dark:text-white"
              />
            </div>

            {/* Door address confirmation */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                doorConfirmed ? 'border-success bg-success/5' : 'border-brand-300 bg-white dark:border-brand-600 dark:bg-brand-900'
              }`}
            >
              <input
                type="checkbox"
                checked={doorConfirmed}
                onChange={(e) => setDoorConfirmed(e.target.checked)}
                className="mt-0.5 accent-[#C72E28]"
              />
              <span className="text-sm text-brand-800 dark:text-brand-100">
                <strong className="block">I confirm this is where the door is.</strong>
                <span className="text-brand-600 dark:text-brand-300">
                  We deliver to this address only. Check the street, the unit and the building name before you continue.
                </span>
              </span>
            </label>

            {user && (
              <label className="flex items-center gap-2 text-sm text-brand-800 dark:text-brand-100">
                <input
                  type="checkbox"
                  checked={saveLocation}
                  onChange={(e) => setSaveLocation(e.target.checked)}
                  className="accent-[#C72E28]"
                />
                Save this location for next time
              </label>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setStep('contact')} variant="secondary" className="shrink-0">
                Back
              </Button>
              <Button onClick={() => setStep('delivery')} disabled={!addressReady} size="lg" className="min-w-0 flex-1">
                Continue to delivery service
              </Button>
            </div>
          </div>
        )}

        {/* -------------------------------------------- 3. Delivery service */}
        {step === 'delivery' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-brand-50 p-5 dark:border-brand-700 dark:bg-brand-800">
            <h2 className="text-lg font-semibold text-brand-950 dark:text-brand-50">Delivery service</h2>

            <div className="space-y-2">
              {shippingOptions.map((opt) => (
                <label
                  key={opt.method}
                  className={`block cursor-pointer rounded-lg border p-4 ${
                    shippingMethod === opt.method
                      ? 'border-accent-500 bg-accent-50 dark:bg-brand-700'
                      : 'border-brand-200 bg-white dark:border-brand-600 dark:bg-brand-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-brand-900 dark:text-brand-50">{opt.label}</p>
                      <p className="text-sm text-brand-600 dark:text-brand-300">{opt.description}</p>
                      <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">{opt.estimatedDays}</p>
                    </div>
                    <p className="font-semibold text-brand-950 dark:text-brand-50">{formatRand(opt.costCents)}</p>
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

            {/* Driver tip */}
            <div className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-600 dark:bg-brand-900">
              <p className="text-sm font-semibold text-brand-900 dark:text-brand-50">Tip your driver</p>
              <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">
                100% of tips go to the driver — none of it comes back to us.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DRIVER_TIP_PERCENTS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTipPercent(pct)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      tipPercent === pct
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : 'border-brand-300 text-brand-800 hover:border-brand-500 dark:border-brand-600 dark:text-brand-100'
                    }`}
                  >
                    {pct === 0 ? 'No tip' : `${pct}%`}
                  </button>
                ))}
              </div>
              {tipPercent > 0 && (
                <p className="mt-2 text-xs text-brand-600 dark:text-brand-300">
                  {formatRand(tipCents)} tip added to your order.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setStep('address')} variant="secondary" className="shrink-0">
                Back
              </Button>
              <Button onClick={() => setStep('payment')} size="lg" className="min-w-0 flex-1">
                Continue to payment
              </Button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------- 4. Payment */}
        {step === 'payment' && (
          <div className="space-y-4 rounded-lg border border-brand-200 bg-brand-50 p-5 dark:border-brand-700 dark:bg-brand-800">
            <h2 className="text-lg font-semibold text-brand-950 dark:text-brand-50">Payment</h2>

            {paymentsMock({ enabled: mockPaymentsEnabled }) && (
              <div className="rounded-md border border-warning bg-yellow-50 p-3 text-sm text-yellow-900">
                <strong>Mock mode active.</strong> No real payment will be taken. Order will be auto-confirmed.
              </div>
            )}

            {/* E bucks */}
            <div
              className={`rounded-lg border p-4 ${
                loyalty.qualifies
                  ? 'border-success bg-success/5'
                  : 'border-brand-200 bg-white dark:border-brand-600 dark:bg-brand-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-900 dark:text-brand-50">
                    E bucks {loyalty.ebucks}
                  </p>
                  {loyalty.qualifies ? (
                    <p className="mt-0.5 text-xs text-brand-700 dark:text-brand-200">
                      You have completed {loyalty.orderCount} orders — your R50 E-bucks reward has been applied
                      to this order.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">
                      {loyalty.ordersToReward} more completed order{loyalty.ordersToReward === 1 ? '' : 's'} and
                      you get R50 off your next one.
                    </p>
                  )}
                </div>
                {loyalty.qualifies && (
                  <span className="rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-white">
                    −{formatRand(loyaltyDiscountCents)}
                  </span>
                )}
              </div>
            </div>

            <PaymentMethodsStrip payJustNowEnabled={payJustNowEnabled} />

            <div className="space-y-2">
              {[
                { id: 'payfast', label: 'PayFast', desc: 'Card, Instant EFT, SnapScan, Zapper, normal EFT', logo: 'https://payfast.io/wp-content/uploads/2024/12/Payfast-logo.svg' },
                { id: 'payjustnow', label: 'PayJustNow', desc: 'Pay in three interest-free instalments', logo: null, planned: !payJustNowEnabled }
              ].map((g) => (
                <label
                  key={g.id}
                  className={`block rounded-lg border p-4 ${
                    (g as any).planned
                      ? 'cursor-not-allowed border-brand-100 bg-brand-50 opacity-60 dark:border-brand-600 dark:bg-brand-700'
                      : `cursor-pointer ${
                          paymentMethod === g.id
                            ? 'border-accent-500 bg-accent-50 dark:bg-brand-700'
                            : 'border-brand-200 bg-white dark:border-brand-600 dark:bg-brand-900'
                        }`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {g.logo ? (
                        <img src={g.logo} alt={`${g.label} logo`} width={86} height={32} className="h-8 w-auto max-w-[86px] object-contain" />
                      ) : (
                        <span className="w-[86px] text-center text-[10px] font-semibold leading-tight text-brand-600">PayJustNow</span>
                      )}
                      <p className="font-medium text-brand-900 dark:text-brand-50">{g.label}</p>
                    </div>
                    {(g as any).planned && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
                        Configuration required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brand-600 dark:text-brand-300">{g.desc}</p>
                  <input
                    type="radio"
                    name="payment"
                    value={g.id}
                    checked={paymentMethod === (g.id as any)}
                    onChange={() => !(g as any).planned && setPaymentMethod(g.id as any)}
                    disabled={(g as any).planned}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>

            {/* Promo / coupon */}
            <div className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-600 dark:bg-brand-900">
              <p className="text-sm font-semibold text-brand-900 dark:text-brand-50">Promo or coupon code</p>
              <CouponCodeInput subtotalCents={subtotal} applied={coupon} onApplied={setCoupon} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setStep('delivery')} variant="secondary" className="shrink-0">
                Back
              </Button>
              <Button onClick={placeOrder} loading={submitting || onsite.loading} size="lg" className="min-w-0 flex-1">
                Go to payment · {formatRand(totalCents)}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-700 dark:bg-brand-800">
        <h2 className="text-sm font-medium text-brand-900 dark:text-brand-50">Order summary</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.variantId} className="flex justify-between text-brand-700 dark:text-brand-200">
              <span className="line-clamp-1 pr-2">
                {it.name} × {it.quantity}
              </span>
              <span className="shrink-0">{formatRand(it.priceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-brand-100 pt-3 text-sm dark:border-brand-600">
          <div className="flex justify-between text-brand-700 dark:text-brand-200">
            <dt>Subtotal</dt>
            <dd>{formatRand(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-brand-700 dark:text-brand-200">
            <dt>Delivery</dt>
            <dd>{shippingCents === 0 ? 'Free' : formatRand(shippingCents)}</dd>
          </div>
          {tipCents > 0 && (
            <div className="flex justify-between text-brand-700 dark:text-brand-200">
              <dt>Driver tip</dt>
              <dd>{formatRand(tipCents)}</dd>
            </div>
          )}
          {couponDiscountCents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Discount ({coupon?.code})</dt>
              <dd>− {formatRand(couponDiscountCents)}</dd>
            </div>
          )}
          {loyaltyDiscountCents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>E bucks reward</dt>
              <dd>− {formatRand(loyaltyDiscountCents)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex justify-between border-t border-brand-100 pt-3 font-semibold dark:border-brand-600">
          <span className="text-brand-950 dark:text-brand-50">Total</span>
          <span className="text-brand-950 dark:text-brand-50">{formatRand(totalCents)}</span>
        </div>

        {/* Delivery snapshot */}
        {addressReady && (
          <div className="mt-4 border-t border-brand-100 pt-3 text-xs text-brand-600 dark:border-brand-300 dark:border-brand-600">
            <p className="font-medium text-brand-900 dark:text-brand-50">Delivering to</p>
            <p>
              {buildingName}
              {line2 ? `, ${line2}` : ''}, {line1}, {city} {postalCode}
            </p>
            {deliveryInstructions.trim() && <p className="mt-1 italic">&ldquo;{deliveryInstructions.trim()}&rdquo;</p>}
            {tipPercent > 0 && <p className="mt-1">Tip: {formatRand(tipCents)} for the driver</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
