-- 010_atomic_stock.sql — race-safe variant stock decrement for checkout.
--
-- Without this, two simultaneous orders can both read stock=1, both write stock-1,
-- and both proceed — overselling the product.
--
-- The create-payment endpoint should call this RPC instead of doing a
-- read-then-update on the variant row.

create or replace function public.atomic_checkout_stock(
  p_variant_id uuid,
  p_quantity   integer,
  p_order_id   uuid,
  p_product_name text,
  p_sku          text default '',
  p_unit_price_cents integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
  v_variant_name text;
begin
  -- Lock the row so concurrent callers must serialize
  select stock, coalesce(name, '') into v_stock, v_variant_name
    from public.product_variants
   where id = p_variant_id
   for update;

  if v_stock is null then
    raise exception 'Variant % not found', p_variant_id;
  end if;

  if v_stock < p_quantity then
    return false;
  end if;

  update public.product_variants
     set stock = stock - p_quantity
   where id = p_variant_id;

  insert into public.order_items
    (order_id, variant_id, product_name, variant_name, sku, quantity, unit_price_cents, line_total_cents)
  values
    (p_order_id, p_variant_id, p_product_name, v_variant_name, p_sku, p_quantity, p_unit_price_cents, p_unit_price_cents * p_quantity);

  return true;
end;
$$;

grant execute on function public.atomic_checkout_stock(uuid, integer, uuid, text, text, integer) to service_role;
