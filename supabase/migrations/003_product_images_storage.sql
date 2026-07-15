-- =============================================================================
-- Breeez — Storage RLS policies for product-images bucket
-- Migration 003: product_images_storage.sql
-- =============================================================================
-- Run AFTER 001_init.sql.
-- =============================================================================
-- Allows:
-- - Anyone (anon + authenticated) to READ images (bucket is public anyway)
-- - Admins only to INSERT / UPDATE / DELETE images
-- =============================================================================

-- Drop existing policies if re-running
drop policy if exists "product images public read" on storage.objects;
drop policy if exists "product images admin write" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;

-- Public read access (for the product-images bucket specifically)
create policy "product images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Admin insert (uploads)
create policy "product images admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.admins where user_id = auth.uid()
    )
  );

-- Admin update (rename / replace)
create policy "product images admin update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.admins where user_id = auth.uid()
    )
  );

-- Admin delete
create policy "product images admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.admins where user_id = auth.uid()
    )
  );