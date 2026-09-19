-- Keep unavailable source options visible on active product pages. They are
-- still blocked from cart/checkout by their inactive state.
drop policy if exists "variants read active" on public.product_variants;
drop policy if exists "variants read active product options" on public.product_variants;
create policy "variants read active product options" on public.product_variants
  for select using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_active = true
    )
  );
