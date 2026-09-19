-- Compensate a failed checkout without a read-then-write race.
-- The exact order_item id is the idempotency marker: once consumed, a retry
-- cannot restore the same stock twice, even for duplicate identical rows.
drop function if exists public.compensate_checkout_stock(uuid, uuid, integer);

create or replace function public.compensate_checkout_stock(
  p_order_item_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marker_variant_id uuid;
  v_quantity integer;
begin
  -- DELETE atomically claims exactly this token. A concurrent retry sees no row
  -- and is a safe no-op; the delete and increment share this transaction.
  delete from public.order_items
   where id = p_order_item_id
  returning variant_id, quantity into v_marker_variant_id, v_quantity;

  if not found then
    return false;
  end if;

  update public.product_variants
     set stock = stock + v_quantity
   where id = v_marker_variant_id;

  if not found then
    raise exception 'Variant % no longer exists while compensating order item %',
      v_marker_variant_id, p_order_item_id;
  end if;

  return true;
end;
$$;

grant execute on function public.compensate_checkout_stock(uuid) to service_role;
