-- =====================================================================
-- Evasale — checkout repair step 1. Run ONCE in the Supabase SQL Editor.
--
-- 1. Removes every existing overload of atomic_checkout_stock. An older
--    version with a different argument list was still in the schema, so
--    PostgREST could not resolve the call and the checkout failed with
--    "Could not find the function ... in the schema cache".
-- 2. Recreates the canonical version.
-- 3. Reloads the PostgREST schema cache.
-- 4. Prints an inventory of everything the checkout needs.
-- =====================================================================

-- ---- 1. Drop every existing overload -----------------------------------
do $$
declare r record;
begin
  for r in
    select p.proname as n, pg_get_function_identity_arguments(p.oid) as a
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'atomic_checkout_stock'
  loop
    execute 'drop function if exists public.' || r.n || '(' || r.a || ')';
  end loop;
end $$;

-- ---- 2. Recreate the canonical function ---------------------------------
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

-- ---- 3. Reload the schema cache -----------------------------------------
notify pgrst, 'reload schema';

-- ---- 4. Inventory -------------------------------------------------------
select p.proname as function,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute
from pg_proc p
join pg_namespace ns on ns.oid = p.pronamespace
where ns.nspname = 'public'
  and p.proname in (
    'atomic_checkout_stock', 'compensate_checkout_stock',
    'mark_order_paid_from_payfast', 'record_payment_event',
    'cancel_order_and_compensate_checkout_stock'
  )
order by p.proname;

select exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'payment_events')
  as payment_events_table_exists;
