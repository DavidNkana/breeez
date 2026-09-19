-- Repair migration for projects where migration 019 was recorded as applied
-- without the function reaching PostgREST's schema cache. Keep this definition
-- identical to 019 so either migration path has the same contract.
create or replace function public.delete_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.cart_items
  where variant_id in (
    select id from public.product_variants where product_id = p_product_id
  );

  delete from public.product_images where product_id = p_product_id;
  delete from public.product_variants where product_id = p_product_id;
  delete from public.products where id = p_product_id;
end;
$$;

revoke execute on function public.delete_product(uuid) from public;
grant execute on function public.delete_product(uuid) to authenticated;
notify pgrst, 'reload schema';
