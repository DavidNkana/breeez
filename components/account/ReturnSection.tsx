'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReturnRequestForm } from './ReturnRequestForm';

type Props = {
  orderId: string;
  orderStatus: string;
  orderCreatedAt: string;
  existingReturn: { id: string; status: string; reason: string; created_at: string } | null;
};

export function ReturnSection({ orderId, orderStatus, orderCreatedAt, existingReturn }: Props) {
  const [showForm, setShowForm] = useState(false);

  // Eligible: paid/shipped/delivered, within 7 days, no existing return
  const eligible = ['paid', 'shipped', 'delivered'].includes(orderStatus) && !existingReturn;
  const createdAt = new Date(orderCreatedAt);
  const daysSince = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const withinWindow = daysSince <= 7;

  const canReturn = eligible && withinWindow;

  if (existingReturn) {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
      requested: { label: 'Return requested', variant: 'warning' },
      approved: { label: 'Return approved', variant: 'info' },
      rejected: { label: 'Return rejected', variant: 'danger' },
      received: { label: 'Return received', variant: 'info' },
      refunded: { label: 'Refunded', variant: 'success' }
    };
    const s = statusMap[existingReturn.status] || { label: existingReturn.status, variant: 'warning' as const };
    return (
      <div className="mt-4 rounded-md border border-brand-200 bg-white p-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium text-brand-900">Return status</p>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <p className="mt-1 text-xs text-brand-600 capitalize">Reason: {existingReturn.reason.replace(/_/g, ' ')}</p>
        <p className="text-xs text-brand-500">Requested {new Date(existingReturn.created_at).toLocaleDateString('en-ZA')}</p>
      </div>
    );
  }

  if (!eligible) return null;

  return (
    <div className="mt-4">
      {withinWindow ? (
        <Button variant="secondary" onClick={() => setShowForm(true)} size="sm">
          Request return
        </Button>
      ) : (
        <p className="text-xs text-brand-500">Return window closed ({daysSince} days ago)</p>
      )}
      <ReturnRequestForm orderId={orderId} open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}