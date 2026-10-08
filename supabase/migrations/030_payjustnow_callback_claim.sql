-- Bind a callback to the attempt prepared before the provider request. The
-- callback may win the race before create-payment copies the provider token to
-- orders, so both identities are claimed in one database transaction.
create or replace function public.claim_payjustnow_callback(
  p_order_id uuid, p_request_id text, p_checkout_token text, p_payment_reference text
) returns boolean language plpgsql security definer set search_path = public as $$
declare attempt_changed integer;
begin
  if p_request_id is null or length(trim(p_request_id)) = 0
     or p_checkout_token is null or length(trim(p_checkout_token)) = 0
     or p_payment_reference is null or length(trim(p_payment_reference)) = 0 then return false; end if;

  begin
    update public.payment_attempts
       set checkout_token = p_checkout_token,
           payment_reference = p_payment_reference,
           status = 'callback_received', updated_at = now()
     where order_id = p_order_id and provider = 'payjustnow'
       and request_id = p_request_id
       and (checkout_token is null or checkout_token = p_checkout_token)
       and (payment_reference is null or payment_reference = p_payment_reference);
    get diagnostics attempt_changed = row_count;
    if attempt_changed = 0 then return false; end if;

    update public.orders
       set payment_request_id = p_request_id,
           payment_checkout_token = p_checkout_token
     where id = p_order_id and payment_gateway = 'payjustnow'
       and (payment_request_id = p_request_id or payment_request_id is null)
       and (payment_checkout_token is null or payment_checkout_token = p_checkout_token);
    if not found then
      raise exception using errcode = 'P0001', message = 'PayJustNow callback order claim failed';
    end if;
    return true;
  exception
    when sqlstate 'P0001' then return false;
  end;
end;
$$;

revoke execute on function public.claim_payjustnow_callback(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_payjustnow_callback(uuid, text, text, text) to service_role;

-- All local and provider currency values are exact, not case-normalized.
create or replace function public.mark_order_paid_from_payjustnow(
  p_order_id uuid, p_request_id text, p_checkout_token text, p_payment_reference text,
  p_amount_cents integer, p_currency text
) returns boolean language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  if p_payment_reference is null or length(trim(p_payment_reference)) = 0
     or p_checkout_token is null or length(trim(p_checkout_token)) = 0
     or p_request_id is null or length(trim(p_request_id)) = 0
     or p_amount_cents < 0 or p_currency <> 'ZAR' then return false; end if;
  update public.orders
     set status = 'paid', paid_at = coalesce(paid_at, now()),
         payment_request_id = p_request_id, payment_checkout_token = p_checkout_token,
         payment_reference = p_payment_reference
   where id = p_order_id and payment_gateway = 'payjustnow' and currency = 'ZAR'
     and total_cents = p_amount_cents and status in ('pending_payment', 'cancellation_pending');
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
