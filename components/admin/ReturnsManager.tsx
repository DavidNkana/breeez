'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';

type Props = {
  returns: any[];
};

export function ReturnsManager({ returns: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [updating, setUpdating] = useState<string | null>(null);
  const showToast = useToast((s) => s.show);
  const router = useRouter();

  async function updateStatus(returnId: string, status: string) {
    setUpdating(returnId);
    const res = await fetch('/api/admin/returns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnId, status })
    });
    const data = await res.json();
    setUpdating(null);
    if (!res.ok) {
      showToast(data.error || 'Failed', 'error');
      return;
    }
    showToast(`Return ${status}`, 'success');
    setItems((prev) => prev.map((r) => r.id === returnId ? { ...r, status } : r));
    router.refresh();
  }

  const statusVariant = (s: string) => {
    switch (s) {
      case 'requested': return 'warning';
      case 'approved': case 'received': return 'info';
      case 'refunded': return 'success';
      case 'rejected': return 'danger';
      default: return 'warning' as const;
    }
  };

  if (items.length === 0) {
    return <p className="text-sm text-brand-500 text-center py-8">No returns requested yet.</p>;
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-brand-50 text-left text-xs uppercase text-brand-600">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100">
          {items.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-mono text-xs">{r.order_id?.slice(0, 8)}</td>
              <td className="px-4 py-3 capitalize">{r.reason?.replace(/_/g, ' ') || '—'}</td>
              <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
              <td className="px-4 py-3 text-xs text-brand-500">{new Date(r.created_at).toLocaleDateString('en-ZA')}</td>
              <td className="px-4 py-3 text-right">
                {r.status === 'requested' && (
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => updateStatus(r.id, 'approved')} disabled={updating === r.id}
                      className="rounded bg-success px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                      {updating === r.id ? '...' : 'Approve'}
                    </button>
                    <button onClick={() => updateStatus(r.id, 'rejected')} disabled={updating === r.id}
                      className="rounded bg-danger px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      {updating === r.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
                {r.status === 'approved' && (
                  <button onClick={() => updateStatus(r.id, 'refunded')} disabled={updating === r.id}
                    className="rounded bg-accent-500 px-2 py-1 text-xs font-medium text-white hover:bg-accent-600 disabled:opacity-50">
                    {updating === r.id ? '...' : 'Mark refunded'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}