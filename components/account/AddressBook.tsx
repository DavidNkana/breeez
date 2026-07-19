'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
};

const EMPTY: Omit<Address, 'id'> = {
  label: 'Home',
  line1: '',
  line2: '',
  city: '',
  province: 'Gauteng',
  postal_code: '',
  is_default: false,
};

export function AddressBook({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const showToast = useToast((s) => s.show);

  // Lock scroll when form is open
  useEffect(() => {
    if (editingId) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [editingId]);

  function startNew() {
    setEditingId('new');
    setForm(EMPTY);
  }

  function startEdit(a: Address) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      province: a.province,
      postal_code: a.postal_code,
      is_default: a.is_default,
    });
  }

  async function reload() {
    const res = await fetch('/api/addresses');
    if (res.ok) setAddresses(await res.json());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = '/api/addresses';
      const res = editingId === 'new'
        ? await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: editingId, ...form }) });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Save failed', 'error');
        return;
      }
      showToast(editingId === 'new' ? 'Address added' : 'Address updated', 'success');
      setEditingId(null);
      await reload();
    } catch (e: any) {
      showToast(e?.message ?? 'Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function destroy(id: string) {
    if (!confirm('Delete this address? Orders in transit to it are not affected.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error ?? 'Delete failed', 'error');
        return;
      }
      showToast('Address deleted', 'success');
      await reload();
    } finally {
      setDeleting(null);
    }
  }

  async function setDefault(id: string) {
    try {
      const res = await fetch('/api/addresses', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, is_default: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error ?? 'Failed', 'error');
        return;
      }
      showToast('Default updated', 'success');
      await reload();
    } catch (e: any) {
      showToast(e?.message ?? 'Network error', 'error');
    }
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-brand-600">{addresses.length} saved</p>
        <Button onClick={startNew}>+ Add address</Button>
      </div>

      <div className="mt-4 space-y-3">
        {addresses.length === 0 && (
          <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50 p-8 text-center">
            <p className="text-brand-700">No saved addresses yet.</p>
            <p className="mt-1 text-xs text-brand-500">
              Add an address here to speed up your next checkout.
            </p>
          </div>
        )}
        {addresses.map((a) => (
          <div key={a.id} className="rounded-lg border border-brand-200 bg-white p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="font-medium text-brand-900">
                  {a.label}
                  {a.is_default && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-700">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-brand-700">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                  {a.city}, {a.province} {a.postal_code}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => startEdit(a)}>
                  Edit
                </Button>
                {!a.is_default && (
                  <button
                    type="button"
                    className="text-xs text-brand-700 underline hover:text-brand-900"
                    onClick={() => setDefault(a.id)}
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  className="text-xs text-danger underline hover:text-red-700 disabled:opacity-50"
                  disabled={deleting === a.id}
                  onClick={() => destroy(a.id)}
                >
                  {deleting === a.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / new sheet */}
      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-label="Edit address"
          onClick={(e) => {
            if (e.currentTarget === e.target) setEditingId(null);
          }}
        >
          <form
            onSubmit={save}
            className="w-full sm:max-w-md overflow-y-auto rounded-t-lg sm:rounded-lg bg-white shadow-xl"
          >
            <div className="border-b border-brand-200 px-5 py-3">
              <h2 className="text-base font-semibold text-brand-950">
                {editingId === 'new' ? 'Add address' : 'Edit address'}
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="addr-label">Label</label>
                <Input
                  id="addr-label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Home, Work, Parents..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="addr-line1">
                  Address line 1 <span className="text-red-600">*</span>
                </label>
                <Input
                  id="addr-line1"
                  required
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  placeholder="123 Main Road"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="addr-line2">
                  Address line 2 <span className="text-brand-500 font-normal">(optional)</span>
                </label>
                <Input
                  id="addr-line2"
                  value={form.line2 ?? ''}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  placeholder="Unit, building, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="addr-city">
                    City <span className="text-red-600">*</span>
                  </label>
                  <Input
                    id="addr-city"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="addr-postal">
                    Postal code <span className="text-red-600">*</span>
                  </label>
                  <Input
                    id="addr-postal"
                    required
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="addr-province">
                  Province <span className="text-red-600">*</span>
                </label>
                <Select
                  id="addr-province"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  options={SA_PROVINCES.map((p) => ({ value: p, label: p }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-brand-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-brand-300"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                />
                Set as my default delivery address
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-brand-200 px-5 py-3">
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingId === 'new' ? 'Add address' : 'Save changes'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
