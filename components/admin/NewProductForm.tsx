'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { createBrowserClient } from '@supabase/ssr';
import { ImageUploader } from './ImageUploader';
import { VariantEditor, type VariantRow } from './VariantEditor';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Category = { id: string; name: string; slug: string };

type Props = { categories: Category[] };

type ImageItem = {
  id: string;
  url: string;
  alt_text?: string;
  uploading?: boolean;
  error?: string;
};

export function NewProductForm({ categories }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const showToast = useToast((s) => s.show);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [basePrice, setBasePrice] = useState('');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

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

    // Wait for any pending image uploads
    if (images.some((img) => img.uploading)) {
      showToast('Wait for images to finish uploading', 'warning');
      setSaving(false);
      return;
    }

    const supabase = getSupabase();

    // Insert product
    const { data: product, error: pErr } = await supabase.from('products').insert({
      slug: finalSlug,
      name,
      description,
      category_id: categoryId || null,
      base_price_cents: basePriceCents,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_active: true
    } as any).select('id').single();

    if (pErr || !product) {
      showToast(pErr?.message || 'Failed to create product', 'error');
      setSaving(false);
      return;
    }

    // Insert variants
    if (variants.length > 0) {
      await supabase.from('product_variants').insert(
        variants.map((v, idx) => ({
          product_id: (product as any).id,
          sku: v.sku,
          name: v.name,
          options: v.options,
          price_cents: v.price_cents,
          compare_at_cents: v.compare_at_cents,
          stock: v.stock,
          is_active: v.is_active,
          sort_order: idx
        })) as any
      );
    }

    // Insert images
    if (images.length > 0) {
      await supabase.from('product_images').insert(
        images.map((img, idx) => ({
          product_id: (product as any).id,
          url: img.url,
          sort_order: idx
        })) as any
      );
    }

    showToast(`Product created with ${images.length} image${images.length === 1 ? '' : 's'}`, 'success');
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <Input label="Product name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coral Beach Towel" />
      <Input label="Slug (auto-generated from name if blank)" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="coral-beach-towel" />
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

      {/* Visibility toggles */}
      <div className="rounded-md border border-brand-200 bg-brand-50 p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-brand-300 text-accent-500 focus:ring-accent-500"
          />
          <div>
            <p className="text-sm font-medium text-brand-900">Featured product</p>
            <p className="text-xs text-brand-600">Show in the &ldquo;Featured&rdquo; section on the home page.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-brand-300 text-accent-500 focus:ring-accent-500"
          />
          <div>
            <p className="text-sm font-medium text-brand-900">Active (visible to customers)</p>
            <p className="text-xs text-brand-600">Uncheck to hide from the storefront without deleting.</p>
          </div>
        </label>
      </div>

      <ImageUploader images={images} onChange={setImages} max={10} />

      <VariantEditor productId="new-product" variants={variants} onChange={setVariants} />

      <div className="flex gap-2 pt-4 border-t border-brand-100">
        <Button type="submit" loading={saving} size="lg">Create product</Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/admin/products')}>Cancel</Button>
      </div>
    </form>
  );
}