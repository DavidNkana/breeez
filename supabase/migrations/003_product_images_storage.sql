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
drop policy if exists "product images admin all" on storage.objects;

-- Public read access (for the product-images bucket specifically)
create policy "product images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Single ALL policy for admin write/update/delete (covers INSERT, UPDATE, DELETE)
-- The bucket is private to the database, so this restricts all writes to admins
create policy "product images admin all"
  on storage.objects for all
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.admins where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.admins where user_id = auth.uid()
    )
  );

-- NOTE: storage.objects RLS is already enabled by default in Supabase.
-- We do NOT need ALTER TABLE ... ENABLE ROW LEVEL SECURITY on it (and can't
-- run that statement anyway — only the postgres role owns that table).