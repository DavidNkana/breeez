-- Delete a product and all of its dependent catalogue data in one transaction.
-- Cart items cannot be left pointing at deleted variants because variant_id is
-- intentionally NOT NULL and RESTRICT: remove only the affected cart rows.
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

-- This RPC is intentionally callable only by signed-in users. The function's
-- is_admin check remains the authorization boundary; this grant only prevents
-- anonymous/public callers from invoking it at all.
revoke execute on function public.delete_product(uuid) from public;
grant execute on function public.delete_product(uuid) to authenticated;
