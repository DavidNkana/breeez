'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Category = { id: string; name: string; slug: string };

type Props = { categories: Category[] };

export function NewProductForm({ categories }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const showToast = useToast((s) => s.show);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [basePrice, setBasePrice] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const finalSlug = slug || slugify(name);
    if (!finalSlug) {
      showToast('Name is required', 'error');
      setSaving(false);
      return;
    }
    const basePriceCents = Math.round(parseFloat(basePrice) * 100);
    if (isNaN(basePriceCents) || basePriceCents <= 0) {
      showToast('Valid price required', 'error');
      setSaving(false);
      return;
    }

    // Insert product
    const { data: product, error: pErr } = await getSupabase().from('products').insert({
      slug: finalSlug,
      name,
      description,
      category_id: categoryId || null,
      base_price_cents: basePriceCents,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_active: true
    }).select('id').single();

    if (pErr || !product) {
      showToast(pErr?.message || 'Failed to create product', 'error');
      setSaving(false);
      return;
    }

    // Insert a default variant (so product is buyable)
    await getSupabase().from('product_variants').insert({
      product_id: product.id,
      sku: `${finalSlug.toUpperCase()}-DEFAULT`,
      name: 'Default',
      options: {},
      price_cents: null, // inherit from product
      stock: 0,
      is_active: true
    });

    // Insert image if provided
    if (imageUrl) {
      await getSupabase().from('product_images').insert({
        product_id: product.id,
        url: imageUrl,
        sort_order: 0
      });
    }

    showToast('Product created', 'success');
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coral Beach Towel" />
      <Input label="Slug (auto-generated if blank)" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="coral-beach-towel" />
      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
      <Input label="Price (ZAR)" type="number" step="0.01" required value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="299.00" />
      <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="new, summer, beach" />
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-900">Description</label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm text-brand-950 placeholder:text-brand-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          placeholder="Describe the product..."
        />
      </div>
      <Input
        label="Primary image URL (Supabase Storage public URL)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://YOUR-PROJECT.supabase.co/storage/v1/object/public/product-images/..."
      />
      <div className="flex gap-2">
        <Button type="submit" loading={saving} size="lg">Create product</Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/admin/products')}>Cancel</Button>
      </div>
    </form>
  );
}