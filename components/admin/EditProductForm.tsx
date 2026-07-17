'use client';

import { useState, useEffect } from 'react';
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

type ImageItem = {
  id: string;
  url: string;
  alt_text?: string;
  uploading?: boolean;
  error?: string;
};

type ExistingImage = {
  id: string;
  url: string;
  sort_order: number;
};

type Props = {
  categories: Category[];
  product: {
    id: string;
    slug: string;
    name: string;
    description: string;
    category_id: string | null;
    base_price_cents: number;
    tags: string[];
    is_active: boolean;
    is_featured: boolean;
    compare_at_cents: number | null;
  };
  existingImages: ExistingImage[];
  existingVariants: VariantRow[];
};

export function EditProductForm({ categories, product, existingImages, existingVariants }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const showToast = useToast((s) => s.show);

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [description, setDescription] = useState(product.description);
  const [categoryId, setCategoryId] = useState(product.category_id ?? '');
  const [basePrice, setBasePrice] = useState((product.base_price_cents / 100).toString());
  const [comparePrice, setComparePrice] = useState(
    product.compare_at_cents != null ? (product.compare_at_cents / 100).toString() : ''
  );
  const [tags, setTags] = useState(product.tags.join(', '));
  const [isFeatured, setIsFeatured] = useState(product.is_featured);
  const [isActive, setIsActive] = useState(product.is_active);
  const [images, setImages] = useState<ImageItem[]>(
    existingImages.map((img) => ({ id: img.id, url: img.url }))
  );
  const [variants, setVariants] = useState<VariantRow[]>(existingVariants);

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
    const compareAtCents = comparePrice.trim()
      ? Math.round(parseFloat(comparePrice) * 100)
      : null;
    if (comparePrice.trim() && (isNaN(compareAtCents!) || compareAtCents! <= basePriceCents)) {
      showToast('Compare-at price must be greater than base price', 'error');
      setSaving(false);
      return;
    }

    if (images.some((img) => img.uploading)) {
      showToast('Wait for images to finish uploading', 'warning');
      setSaving(false);
      return;
    }

    const supabase = getSupabase();

    // Update product
    const { error: pErr } = await supabase.from('products').update({
      slug: finalSlug,
      name,
      description,
      category_id: categoryId || null,
      base_price_cents: basePriceCents,
      compare_at_cents: compareAtCents,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_active: isActive,
      is_featured: isFeatured
    } as any).eq('id', product.id);

    if (pErr) {
      showToast(`Update failed: ${pErr.message}`, 'error');
      setSaving(false);
      return;
    }

    // Sync images: delete all existing, re-insert in current order
    await supabase.from('product_images').delete().eq('product_id', product.id);
    if (images.length > 0) {
      await supabase.from('product_images').insert(
        images.map((img, idx) => ({
          product_id: product.id,
          url: img.url,
          sort_order: idx
        })) as any
      );
    }

    // Sync variants: delete all existing, re-insert with current data
    await supabase.from('product_variants').delete().eq('product_id', product.id);
    if (variants.length > 0) {
      await supabase.from('product_variants').insert(
        variants.map((v, idx) => ({
          product_id: product.id,
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

    showToast('Product updated', 'success');
    router.push('/admin/products');
    router.refresh();
  }

  async function onDelete() {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const supabase = getSupabase();
    // Delete images first (FK), then variants, then product
    await supabase.from('product_images').delete().eq('product_id', product.id);
    await supabase.from('product_variants').delete().eq('product_id', product.id);
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    setDeleting(false);
    if (error) {
      showToast(`Delete failed: ${error.message}`, 'error');
      return;
    }
    showToast('Product deleted', 'success');
    router.push('/admin/products');
    router.refresh();
  }

  const onSale = comparePrice.trim() !== '' && parseFloat(comparePrice) > parseFloat(basePrice);
  const discountPct = onSale
    ? Math.round((1 - parseFloat(basePrice) / parseFloat(comparePrice)) * 100)
    : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <Input label="Product name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        helperText="Auto-generated from name if left blank. Use only lowercase letters, numbers, and dashes."
      />
      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Price (ZAR)" type="number" step="0.01" required value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="299.00" />
        <Input
          label="Compare-at price (optional)"
          type="number"
          step="0.01"
          value={comparePrice}
          onChange={(e) => setComparePrice(e.target.value)}
          placeholder="399.00"
          helperText={onSale ? `On sale — ${discountPct}% off` : 'Higher than base price shows as "was R X"'}
        />
      </div>
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

      <VariantEditor productId={product.id} variants={variants} onChange={setVariants} />

      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-brand-100">
        <Button type="submit" loading={saving} size="lg">Save changes</Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/admin/products')}>Cancel</Button>
        <div className="flex-1" />
        <Button type="button" variant="danger" onClick={onDelete} loading={deleting}>Delete</Button>
      </div>
    </form>
  );
}