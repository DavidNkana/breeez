'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

type OrderRow = {
  id: string;
  order_number: string;
  email: string;
  status: string;
  shipping_method: string | null;
  shipping_address: any;
};

const NEXT_STATUS: Record<string, string> = {
  pending_payment: 'paid',
  paid: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
  delivered: 'delivered',
  cancelled: 'cancelled',
  refunded: 'refunded',
};

const STATUS_OPTIONS = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

/**
 * Admin order status update. Sets status + tracking number, fires
 * order-shipped email automatically when status transitions to "shipped".
 */
export function OrderRowActions({ order, onChanged }: { order: OrderRow; onChanged: () => void }) {
  const showToast = useToast((s) => s.show);
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(NEXT_STATUS[order.status] ?? order.status);
  const [tracking, setTracking] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next, tracking_number: tracking || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Update failed', 'error');
        return;
      }
      showToast(`Order updated → ${next}`, 'success');
      setOpen(false);
      setTracking('');
      onChanged();
    } catch (e: any) {
      showToast(e?.message ?? 'Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand-700 underline hover:text-brand-900"
      >
        Update
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={(e) => { if (e.currentTarget === e.target) setOpen(false); }}>
      <div className="w-full sm:max-w-sm overflow-hidden rounded-t-lg sm:rounded-lg bg-white shadow-xl">
        <div className="border-b border-brand-200 px-5 py-3">
          <p className="text-base font-semibold text-brand-950">{order.order_number}</p>
          <p className="text-xs text-brand-500">{order.email}</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-brand-500">Status</label>
            <select
              className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-brand-500">
              Tracking number
              <span className="ml-1 font-normal normal-case text-brand-500">(optional)</span>
            </label>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="TCG-ZA-1234567"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-brand-200 px-5 py-3">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </div>
      </div>
    </div>
  );
}
