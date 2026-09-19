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
import { ProductUrlImporter, type ScrapedProduct } from './ProductUrlImporter';
import { importedStock, resolveImportedCategory, stockQuantity } from '@/lib/catalog/importer';
import { mapImportedVariantPrices, normalizeVariantCompareAtCents } from '@/lib/catalog/imported-prices';
import { mapNewProductInsert } from '@/lib/catalog/product-payload';
import { normalizeProductSlug } from '@/lib/catalog/slugs';
import { createProductWithSlugRetry } from '@/lib/catalog/product-create';
import { deleteProduct } from '@/lib/catalog/product-delete-client';

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
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [imported, setImported] = useState(false);

  function onParsed(data: ScrapedProduct) {
    setName(data.name);
    setImported(true);
    const category = resolveImportedCategory(data.categoryName ?? data.category, categories);
    if (category) setCategoryId(category.id);
    setDescription(data.description);
    if (Number.isFinite(data.price) && data.price > 0) setBasePrice(data.price.toFixed(2));
    setComparePrice(data.comparePrice != null && Number.isFinite(data.comparePrice) && data.comparePrice > data.price ? data.comparePrice.toFixed(2) : '');
    setImages(data.images.map((url, idx) => ({ id: `imported-${idx}`, url })));
    setVariants(data.variants.map((v, idx) => ({
      product_id: 'new-product',
      sku: v.sku,
      name: v.name,
      options: v.options,
      ...mapImportedVariantPrices(v.price, data.comparePrice),
      stock: importedStock(v.stock),
       is_active: v.active !== false,
      sort_order: idx
    })));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // A manually entered slug is respected as-is (apart from surrounding
    // whitespace); generated slugs use the same normalization everywhere.
    const requestedSlug = slug.trim() || normalizeProductSlug(name);
    if (!requestedSlug) {
      showToast('Name is required', 'error');
      setSaving(false);
      return;
    }
    const basePriceCents = Math.round(parseFloat(basePrice) * 100);
    if (!Number.isFinite(basePriceCents) || basePriceCents <= 0) {
      showToast('Valid price required', 'error');
      setSaving(false);
      return;
    }
    const compareAtCents = comparePrice.trim() ? Math.round(parseFloat(comparePrice) * 100) : null;
    if (comparePrice.trim() && (compareAtCents == null || !Number.isFinite(compareAtCents) || compareAtCents <= basePriceCents)) {
      showToast('Compare-at price must be greater than base price', 'error');
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

    // The unique index is the arbiter here. Retrying only a unique-key error
    // avoids a check-then-insert race when two admins use the same name.
    const result = await createProductWithSlugRetry({
      requestedSlug,
      insertProduct: async (candidateSlug) => {
        const insertResult = await supabase.from('products').insert(mapNewProductInsert({
          slug: candidateSlug,
          name,
          description,
          categoryId: categoryId || null,
          basePriceCents,
          compareAtCents,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          isActive,
        }) as any).select('id').single();
        return {
          data: insertResult.data as { id: string } | null,
          error: insertResult.error,
        };
      },
      onCreated: async (createdProduct) => {
        // These side effects run once, only after the product insert succeeds.
        if (variants.length > 0) {
          const { error } = await supabase.from('product_variants').insert(
            variants.map((v, idx) => ({
              product_id: createdProduct.id,
              sku: v.sku,
              name: v.name,
              options: v.options,
              price_cents: v.price_cents,
              compare_at_cents: normalizeVariantCompareAtCents(v.price_cents, v.compare_at_cents),
              stock: imported ? importedStock(v.stock) : stockQuantity(v.stock),
              is_active: v.is_active,
              sort_order: idx
            })) as any
          );
          if (error) throw error;
        }

        if (images.length > 0) {
          const { error } = await supabase.from('product_images').insert(
            images.map((img, idx) => ({
              product_id: createdProduct.id,
              url: img.url,
              sort_order: idx
            })) as any
          );
          if (error) throw error;
        }
      },
      cleanupCreated: async (createdProduct) => {
        const error = await deleteProduct(supabase, createdProduct.id);
        if (error) throw error;
      },
    });

    if (result.error || !result.product) {
      showToast(result.error?.message || 'Failed to create product', 'error');
      setSaving(false);
      return;
    }

    showToast(`Product created with ${images.length} image${images.length === 1 ? '' : 's'}`, 'success');
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <ProductUrlImporter onParsed={onParsed} />
      <Input label="Product name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coral Beach Towel" />
      <Input label="Slug (auto-generated from name if blank)" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="coral-beach-towel" />
      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={[{ value: '', label: 'Select a category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Price (ZAR)" type="number" step="0.01" required value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="299.00" />
        <Input label="Compare-at price (optional)" type="number" step="0.01" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="399.00" />
      </div>
      <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="new, summer, beach" />
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-900">Description</label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm text-brand-950 placeholder:text-brand-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-brand-600 dark:bg-brand-900 dark:text-white"
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
