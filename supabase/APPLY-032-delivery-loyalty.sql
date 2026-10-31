-- =====================================================================
-- Evasale — delivery detail, driver tips, saved-location detail,
-- delivery ratings and the E-bucks loyalty milestone.
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Orders: the details The Courier Guy needs to reach the right door,
--    plus the driver tip and the customer's delivery rating.
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists delivery_building_type text,
  add column if not exists delivery_building_name text,
  add column if not exists delivery_instructions text,
  add column if not exists door_address_confirmed boolean not null default false,
  add column if not exists driver_tip_cents integer not null default 0,
  add column if not exists driver_tip_percent integer not null default 0,
  add column if not exists delivery_rating smallint check (delivery_rating between 1 and 5),
  add column if not exists delivery_review_body text,
  add column if not exists delivery_rated_at timestamptz;

-- ---------------------------------------------------------------------
-- 2. Saved locations: building type, place name and a contact number.
-- ---------------------------------------------------------------------
alter table public.addresses
  add column if not exists building_type text,
  add column if not exists building_name text,
  add column if not exists phone text,
  add column if not exists delivery_instructions text;

create index if not exists addresses_customer_idx on public.addresses (customer_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3. Delivery rating (the product reviews table requires a product_id,
--    so the service rating lives in its own table).
-- ---------------------------------------------------------------------
create table if not exists public.order_delivery_reviews (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  body         text check (body is null or char_length(body) >= 10),
  created_at   timestamptz not null default now(),
  unique (order_id)
);

create index if not exists order_delivery_reviews_order_idx
  on public.order_delivery_reviews (order_id);

alter table public.order_delivery_reviews enable row level security;

drop policy if exists "delivery reviews: customers read own" on public.order_delivery_reviews;
create policy "delivery reviews: customers read own"
  on public.order_delivery_reviews
  for select using (auth.uid() = customer_id);

drop policy if exists "delivery reviews: customers create own" on public.order_delivery_reviews;
create policy "delivery reviews: customers create own"
  on public.order_delivery_reviews
  for insert with check (auth.uid() = customer_id);

drop policy if exists "delivery reviews: customers update own" on public.order_delivery_reviews;
create policy "delivery reviews: customers update own"
  on public.order_delivery_reviews
  for update using (auth.uid() = customer_id);

-- ---------------------------------------------------------------------
-- 4. Order items can be rated for the product they belong to. The
--    reviews table already supports order_item_id; make sure the
--    customer's own reviews can be read back by order.
-- ---------------------------------------------------------------------
create index if not exists reviews_order_item_idx
  on public.reviews (order_item_id);

-- ---------------------------------------------------------------------
-- 5. E-bucks milestone: customers who have completed 10+ orders get
--    R50 off their next order. The count is derived from paid orders,
--    so no separate balance table is needed.
-- ---------------------------------------------------------------------
create or replace function public.customer_completed_order_count(p_customer_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.orders
  where customer_id = p_customer_id
    and status in ('paid', 'processing', 'shipped', 'delivered');
$$;

revoke execute on function public.customer_completed_order_count(uuid) from public, anon;
grant execute on function public.customer_completed_order_count(uuid) to service_role;
