-- Activate PayJustNow only when the server-side provider is configured. The
-- trigger remains the final database guard for provider selection.
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
