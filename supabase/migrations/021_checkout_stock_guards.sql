-- Reject invalid customer quantities before stock = stock - quantity.
drop function if exists public.atomic_checkout_stock(uuid, integer, uuid, text, text, integer);

create or replace function public.atomic_checkout_stock(
  p_variant_id uuid, p_quantity integer, p_order_id uuid, p_product_name text,
  p_sku text default '', p_unit_price_cents integer default 0
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_stock integer; v_variant_name text; v_is_active boolean; v_order_item_id uuid;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least one' using errcode = '22023';
  end if;
  select stock, coalesce(name, ''), is_active into v_stock, v_variant_name, v_is_active
    from public.product_variants where id = p_variant_id for update;
  if v_stock is null then raise exception 'Variant % not found', p_variant_id; end if;
  if not v_is_active then raise exception 'Variant % is unavailable', p_variant_id using errcode = 'P0001'; end if;
  if v_stock < p_quantity then return null; end if;
  update public.product_variants set stock = stock - p_quantity where id = p_variant_id;
  insert into public.order_items
    (order_id, variant_id, product_name, variant_name, sku, quantity, unit_price_cents, line_total_cents)
  values (p_order_id, p_variant_id, p_product_name, v_variant_name, p_sku, p_quantity,
          p_unit_price_cents, p_unit_price_cents * p_quantity)
  returning id into v_order_item_id;
  return v_order_item_id;
end;
$$;

grant execute on function public.atomic_checkout_stock(uuid, integer, uuid, text, text, integer) to service_role;
