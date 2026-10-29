-- Evasale - full checkout/payment schema repair. Run ONCE.
-- Drops every version of the 5 checkout functions (overloads included),
-- recreates them, creates the payment_events table, then reloads the
-- PostgREST schema cache and prints an inventory to verify.

do $$
declare r record;
begin
  for r in
    select p.proname as n, pg_get_function_identity_arguments(p.oid) as a
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'cancel_order_and_compensate_checkout_stock'
  loop
    execute 'drop function if exists public.' || r.n || '(' || r.a || ')';
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select p.proname as n, pg_get_function_identity_arguments(p.oid) as a
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'atomic_checkout_stock'
  loop
    execute 'drop function if exists public.' || r.n || '(' || r.a || ')';
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select p.proname as n, pg_get_function_identity_arguments(p.oid) as a
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'compensate_checkout_stock'
  loop
    execute 'drop function if exists public.' || r.n || '(' || r.a || ')';
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select p.proname as n, pg_get_function_identity_arguments(p.oid) as a
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'record_payment_event'
  loop
    execute 'drop function if exists public.' || r.n || '(' || r.a || ')';
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select p.proname as n, pg_get_function_identity_arguments(p.oid) as a
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'mark_order_paid_from_payfast'
  loop
    execute 'drop function if exists public.' || r.n || '(' || r.a || ')';
  end loop;
end $$;

drop table if exists public.payment_events;

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

alter table public.orders drop constraint if exists orders_shipping_method_check;
alter table public.orders add constraint orders_shipping_method_check
  check (shipping_method in ('pargo_pickup', 'tcg_door', 'dawn_wing_metro', 'store_pickup'));

alter table public.orders drop constraint if exists orders_payment_gateway_check;
alter table public.orders add constraint orders_payment_gateway_check
  check (payment_gateway is null or payment_gateway in ('payfast', 'payjustnow', 'yoco', 'ozow'));

create or replace function public.enforce_active_order_providers()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT'
     or new.shipping_method is distinct from old.shipping_method
     or new.payment_gateway is distinct from old.payment_gateway then
    if new.shipping_method <> 'tcg_door' then
      raise exception 'Inactive shipping provider: %', new.shipping_method using errcode = 'check_violation';
    end if;
     if new.payment_gateway not in ('payfast', 'payjustnow') then
      raise exception 'Inactive payment provider: %', new.payment_gateway using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_active_provider_guard on public.orders;
create trigger orders_active_provider_guard
  before insert or update of shipping_method, payment_gateway on public.orders
  for each row execute function public.enforce_active_order_providers();

create or replace function public.mark_order_paid_from_payfast(
  p_order_id uuid,
  p_payment_id text,
  p_amount_cents integer,
  p_merchant_id text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  changed integer;
begin
  if p_payment_id is null or length(trim(p_payment_id)) = 0
     or p_amount_cents < 0 or p_merchant_id is null then
    return false;
  end if;

  update public.orders
     set status = 'paid', paid_at = coalesce(paid_at, now()), payment_reference = p_payment_id
   where id = p_order_id
     and payment_gateway = 'payfast'
     and total_cents = p_amount_cents
     and (status = 'pending_payment' or (status = 'paid' and payment_reference = p_payment_id));
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

revoke execute on function public.mark_order_paid_from_payfast(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid_from_payfast(uuid, text, integer, text) to service_role;

create table if not exists public.payment_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in (
    'checkout_started', 'payfast_redirect', 'payjustnow_redirect', 'payjustnow_callback_valid',
    'payjustnow_callback_invalid', 'payjustnow_cancelled', 'payjustnow_refunded', 'payjustnow_status', 'payfast_itn_valid', 'payfast_itn_invalid', 'payment_failed', 'paid_transition', 'pending_payment_created'
  )),
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (order_id, event_type, idempotency_key)
);
create index if not exists payment_events_type_created_idx
  on public.payment_events (event_type, created_at desc);
create index if not exists payment_events_order_created_idx
  on public.payment_events (order_id, created_at desc);
alter table public.payment_events enable row level security;
drop policy if exists "payment events admin read" on public.payment_events;
create policy "payment events admin read" on public.payment_events
  for select using (public.is_admin(auth.uid()));

create or replace function public.record_payment_event(
  p_order_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_payload jsonb default '{}'::jsonb
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_order_id is null or p_event_type not in (
    'checkout_started', 'payfast_redirect', 'payjustnow_redirect', 'payjustnow_callback_valid',
    'payjustnow_callback_invalid', 'payjustnow_cancelled', 'payjustnow_refunded', 'payjustnow_status', 'payfast_itn_valid', 'payfast_itn_invalid', 'payment_failed', 'paid_transition', 'pending_payment_created'
  ) or p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    return false;
  end if;

  insert into public.payment_events (order_id, event_type, idempotency_key, payload)
  values (p_order_id, p_event_type, left(p_idempotency_key, 128), coalesce(p_payload, '{}'::jsonb))
  on conflict (order_id, event_type, idempotency_key) do nothing;
  return true;
end;
$$;
revoke execute on function public.record_payment_event(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_payment_event(uuid, text, text, jsonb) to service_role;

create or replace function public.mark_order_paid_from_payfast(
  p_order_id uuid,
  p_payment_id text,
  p_amount_cents integer,
  p_merchant_id text
) returns boolean language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  if p_payment_id is null or length(trim(p_payment_id)) = 0
     or p_amount_cents < 0 or p_merchant_id is null then return false; end if;
  update public.orders
     set status = 'paid', paid_at = coalesce(paid_at, now()), payment_reference = p_payment_id
   where id = p_order_id and payment_gateway = 'payfast' and currency = 'ZAR'
     and total_cents = p_amount_cents
     and (status = 'pending_payment' or (status = 'paid' and payment_reference = p_payment_id));
  get diagnostics changed = row_count;
  if changed > 0 then
    insert into public.payment_events (order_id, event_type, idempotency_key, payload)
    values (p_order_id, 'paid_transition', p_payment_id, jsonb_build_object('gateway', 'payfast'))
    on conflict (order_id, event_type, idempotency_key) do nothing;
  end if;
  return changed > 0;
end;
$$;
revoke execute on function public.mark_order_paid_from_payfast(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid_from_payfast(uuid, text, integer, text) to service_role;

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

notify pgrst, 'reload schema';

select p.proname as function,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute
from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
where ns.nspname = 'public'
  and p.proname in ('atomic_checkout_stock','compensate_checkout_stock',
                    'mark_order_paid_from_payfast','record_payment_event',
                    'cancel_order_and_compensate_checkout_stock')
order by p.proname;

select exists (select 1 from information_schema.tables
               where table_schema='public' and table_name='payment_events') as payment_events_table_exists;
