-- Keep legacy provider values readable, but reject them for new orders and
-- provider changes. This avoids rewriting historical order records.
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

-- Atomic, idempotent state transition used only after PayFast ITN validation.
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
