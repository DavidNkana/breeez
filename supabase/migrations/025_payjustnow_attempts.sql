-- Keep the merchant request id, provider checkout token, and provider payment
-- reference separate. They have different lifecycles and must not be reused
-- as interchangeable payment identities.
alter table public.orders add column if not exists payment_request_id text;
alter table public.orders add column if not exists payment_checkout_token text;

create table if not exists public.payment_attempts (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider = 'payjustnow'),
  request_id text not null,
  checkout_token text,
  payment_reference text,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, request_id),
  unique (provider, checkout_token)
);
create index if not exists payment_attempts_order_idx on public.payment_attempts (order_id, created_at desc);
alter table public.payment_attempts enable row level security;
drop policy if exists "payment attempts admin read" on public.payment_attempts;
create policy "payment attempts admin read" on public.payment_attempts
  for select using (public.is_admin(auth.uid()));

create or replace function public.prepare_payjustnow_attempt(
  p_order_id uuid, p_request_id text
) returns boolean language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  if p_request_id is null or length(trim(p_request_id)) = 0 then return false; end if;
  update public.orders set payment_request_id = p_request_id
   where id = p_order_id and payment_gateway = 'payjustnow' and status = 'pending_payment';
  get diagnostics changed = row_count;
  if changed = 0 then return false; end if;
  insert into public.payment_attempts (order_id, provider, request_id)
    values (p_order_id, 'payjustnow', p_request_id)
    on conflict (provider, request_id) do nothing;
  return true;
end;
$$;
revoke execute on function public.prepare_payjustnow_attempt(uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_payjustnow_attempt(uuid, text) to service_role;

alter table public.payment_events drop constraint if exists payment_events_event_type_check;
alter table public.payment_events add constraint payment_events_event_type_check check (event_type in (
  'checkout_started', 'payfast_redirect', 'payjustnow_redirect', 'payjustnow_callback_valid',
  'payjustnow_callback_invalid', 'payjustnow_cancelled', 'payjustnow_refunded', 'payjustnow_status',
  'payfast_itn_valid', 'payfast_itn_invalid', 'payment_failed', 'paid_transition', 'pending_payment_created'
));

drop function if exists public.mark_order_paid_from_payjustnow(uuid, text, integer, text);
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
      and status = 'pending_payment';
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
