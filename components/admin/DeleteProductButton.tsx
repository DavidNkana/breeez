'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useToast } from '@/components/ui/Toast';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Props = {
  productId: string;
  productName: string;
};

export function DeleteProductButton({ productId, productName }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  async function onDelete() {
    setLoading(true);
    const supabase = getSupabase();
    await supabase.from('product_images').delete().eq('product_id', productId);
    await supabase.from('product_variants').delete().eq('product_id', productId);
    const { error } = await supabase.from('products').delete().eq('id', productId);
    setLoading(false);
    if (error) {
      showToast(`Delete failed: ${error.message}`, 'error');
      return;
    }
    showToast(`Deleted "${productName}"`, 'success');
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center rounded-md border border-danger bg-white px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="inline-flex items-center rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Deleting…' : 'Confirm'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="inline-flex items-center rounded-md border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
      >
        Cancel
      </button>
    </span>
  );
}