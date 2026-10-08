-- Finalize cancellation and release every reservation in one transaction.
-- If any token cannot be compensated, the order remains cancellation_pending
-- and all stock reservations remain intact for a retry.
create or replace function public.cancel_order_and_compensate_checkout_stock(
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_order_item_id uuid;
begin
  select status into v_status
    from public.orders
   where id = p_order_id
   for update;

  if not found or v_status not in ('pending_payment', 'cancellation_pending', 'cancelled') then
    return false;
  end if;

  if v_status <> 'cancelled' then
    update public.orders set status = 'cancelled' where id = p_order_id;
  end if;

  for v_order_item_id in
    select id from public.order_items where order_id = p_order_id
  loop
    perform public.compensate_checkout_stock(v_order_item_id);
  end loop;

  return true;
end;
$$;

revoke execute on function public.cancel_order_and_compensate_checkout_stock(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order_and_compensate_checkout_stock(uuid) to service_role;
