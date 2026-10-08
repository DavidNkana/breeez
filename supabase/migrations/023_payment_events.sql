-- Server-side, low-cardinality payment funnel events with bounded operational metadata.
-- There is currently no authoritative timeout/reconciliation job, so pending
-- orders are recorded as created rather than incorrectly marked abandoned.
create table if not exists public.payment_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in (
    'checkout_started', 'payfast_redirect', 'payfast_itn_valid',
    'payfast_itn_invalid', 'payment_failed', 'paid_transition', 'pending_payment_created'
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
    'checkout_started', 'payfast_redirect', 'payfast_itn_valid',
    'payfast_itn_invalid', 'payment_failed', 'paid_transition', 'pending_payment_created'
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
