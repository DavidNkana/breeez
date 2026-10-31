-- =====================================================================
-- Evasale — restore stock when an order is cancelled, without destroying
-- the order items.
--
-- Why: the existing compensation function DELETES the order item as its
-- idempotency marker. That is fine for a payment attempt that failed, but
-- wrong when a customer cancels a real order — the invoice must still show
-- what they ordered, and the stock must come back exactly once.
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Mark order items whose stock has already been returned.
-- ---------------------------------------------------------------------
alter table public.order_items
  add column if not exists stock_restored boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Return the stock for every item of an order that has not been
--    restored yet. Returns how many items were restored.
-- ---------------------------------------------------------------------
create or replace function public.restore_order_stock(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_restored integer := 0;
begin
  for r in
    select id, variant_id, quantity
    from public.order_items
    where order_id = p_order_id
      and coalesce(stock_restored, false) = false
    for update
  loop
    if r.variant_id is not null then
      update public.product_variants
         set stock = stock + coalesce(r.quantity, 0)
       where id = r.variant_id;
      v_restored := v_restored + 1;
    end if;
    update public.order_items set stock_restored = true where id = r.id;
  end loop;

  return v_restored;
end;
$$;

revoke execute on function public.restore_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.restore_order_stock(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 3. Make the original compensation function respect the flag, so an
--    order can never return its stock twice.
-- ---------------------------------------------------------------------
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
  v_already_restored boolean;
begin
  select coalesce(stock_restored, false)
    into v_already_restored
    from public.order_items
   where id = p_order_item_id
   for update;

  if not found then
    -- Already compensated: the row was claimed by an earlier run.
    return false;
  end if;

  if v_already_restored then
    -- Stock was already returned by restore_order_stock. Claim the row and
    -- stop, so the stock is never credited twice.
    delete from public.order_items where id = p_order_item_id;
    return true;
  end if;

  -- DELETE atomically claims exactly this token. A concurrent retry sees no
  -- row and is a safe no-op; the delete and increment share this transaction.
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

revoke execute on function public.compensate_checkout_stock(uuid) from public, anon, authenticated;
grant execute on function public.compensate_checkout_stock(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 4. Cancel an order and return its stock in one transaction.
-- ---------------------------------------------------------------------
create or replace function public.cancel_order_and_restore_stock(
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    return false;
  end if;

  if v_status = 'cancelled' then
    -- Already cancelled — make sure the stock is out, then succeed.
    perform public.restore_order_stock(p_order_id);
    return true;
  end if;

  -- A delivered or shipped order is not cancelled: the goods are with the
  -- customer and come back through a return, not through a cancellation.
  if v_status in ('shipped', 'delivered') then
    return false;
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
  perform public.restore_order_stock(p_order_id);
  return true;
end;
$$;

revoke execute on function public.cancel_order_and_restore_stock(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order_and_restore_stock(uuid) to service_role;
