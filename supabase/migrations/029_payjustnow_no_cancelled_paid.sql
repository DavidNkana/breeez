-- A cancelled order has already released its order_items stock tokens. It must
-- never become paid unless stock is atomically re-reserved, which this flow
-- does not implement. Late provider payments remain cancelled and are refunded
-- or placed into manual review by the webhook.
create or replace function public.mark_order_paid_from_payjustnow(
  p_order_id uuid, p_request_id text, p_checkout_token text, p_payment_reference text,
  p_amount_cents integer, p_currency text
) returns boolean language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  if p_payment_reference is null or length(trim(p_payment_reference)) = 0
     or p_checkout_token is null or length(trim(p_checkout_token)) = 0
     or p_request_id is null or length(trim(p_request_id)) = 0
     or p_amount_cents < 0 or p_currency is null then return false; end if;
  update public.orders
     set status = 'paid', paid_at = coalesce(paid_at, now()),
         payment_request_id = p_request_id, payment_checkout_token = p_checkout_token,
         payment_reference = p_payment_reference
   where id = p_order_id and payment_gateway = 'payjustnow' and currency = p_currency
     and total_cents = p_amount_cents
     and status in ('pending_payment', 'cancellation_pending');
  get diagnostics changed = row_count;
  if changed > 0 then
    insert into public.payment_events (order_id, event_type, idempotency_key, payload)
      values (p_order_id, 'paid_transition', p_payment_reference,
        jsonb_build_object('gateway', 'payjustnow', 'checkoutToken', p_checkout_token))
      on conflict (order_id, event_type, idempotency_key) do nothing;
  end if;
  return changed > 0;
end;
$$;

revoke execute on function public.mark_order_paid_from_payjustnow(uuid, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid_from_payjustnow(uuid, text, text, text, integer, text) to service_role;
