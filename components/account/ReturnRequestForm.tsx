'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type Props = {
  orderId: string;
  open: boolean;
  onClose: () => void;
};

export function ReturnRequestForm({ orderId, open, onClose }: Props) {
  const [reason, setReason] = useState('wrong_size');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const showToast = useToast((s) => s.show);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, reason, description })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      showToast(data.error || 'Failed to request return', 'error');
      return;
    }
    setDone(true);
    showToast('Return request submitted', 'success');
    setTimeout(() => { onClose(); router.refresh(); }, 1500);
  }

  return (
    <Modal open={open} onClose={onClose} title="Request a return" size="sm">
      {done ? (
        <div className="text-center py-4">
          <div className="mx-auto h-10 w-10 rounded-full bg-success/10 text-success flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <p className="text-sm font-medium text-brand-900">Return request submitted</p>
          <p className="text-xs text-brand-600 mt-1">We will review it and get back to you.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={[
              { value: 'wrong_size', label: 'Wrong size' },
              { value: 'damaged', label: 'Damaged / defective' },
              { value: 'not_as_described', label: 'Not as described' },
              { value: 'changed_mind', label: 'Changed my mind' },
              { value: 'other', label: 'Other' }
            ]}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-900">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm text-brand-950 placeholder:text-brand-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              placeholder="Tell us more about the issue..."
            />
          </div>
          <p className="text-xs text-brand-500">
            Returns are accepted within 7 days of delivery. Return shipping is at your cost. See our <a href="/legal/returns" className="text-accent-700 hover:underline" target="_blank">returns policy</a> for details.
          </p>
          <Button type="submit" loading={loading} fullWidth>Submit return request</Button>
        </form>
      )}
    </Modal>
  );
}