-- =============================================================================
-- Breeez — Initial database schema
-- Migration 001: tables, indexes, RLS policies
-- =============================================================================
-- Run against your Supabase project via the Supabase SQL editor or
-- `supabase db push` (Phase 2 — CLI setup is in implementation plan).
-- =============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy text search

-- =============================================================================
-- Reference data: categories, products, variants, images
-- =============================================================================

create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  image_url   text,
  parent_id   uuid references public.categories(id) on delete set null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.products (
  id                uuid primary key default uuid_generate_v4(),
  slug              text unique not null,
  name              text not null,
  description       text not null default '',
  category_id       uuid references public.categories(id) on delete set null,
  brand             text not null default 'Breeez',
  base_price_cents  integer not null check (base_price_cents >= 0),
  compare_at_cents  integer check (compare_at_cents is null or compare_at_cents >= 0),
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  tags              text[] not null default '{}',
  search_tsv        tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(tags, ' ')), 'C')
  ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists products_search_idx on public.products using gin (search_tsv);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active);

create table if not exists public.product_variants (
  id              uuid primary key default uuid_generate_v4(),
  product_id      uuid not null references public.products(id) on delete cascade,
  sku             text unique not null,
  name            text not null,
  options         jsonb not null default '{}'::jsonb,
  price_cents     integer check (price_cents is null or price_cents >= 0),
  compare_at_cents integer check (compare_at_cents is null or compare_at_cents >= 0),
  stock           integer not null default 0 check (stock >= 0),
  weight_grams    integer check (weight_grams is null or weight_grams > 0),
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists variants_product_idx on public.product_variants (product_id);

create table if not exists public.product_images (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt_text    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists images_product_idx on public.product_images (product_id, sort_order);

-- =============================================================================
-- Customers, addresses, carts, wishlists
-- =============================================================================

create table if not exists public.customers (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.addresses (
  id           uuid primary key default uuid_generate_v4(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  label        text not null default 'Home',
  line1        text not null,
  line2        text,
  city         text not null,
  province     text not null,
  postal_code  text not null,
  country      text not null default 'ZA',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists addresses_customer_idx on public.addresses (customer_id);

create table if not exists public.carts (
  id           uuid primary key default uuid_generate_v4(),
  customer_id  uuid references public.customers(id) on delete cascade,
  session_id   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists carts_customer_idx on public.carts (customer_id);
create index if not exists carts_session_idx  on public.carts (session_id);

create table if not exists public.cart_items (
  id         uuid primary key default uuid_generate_v4(),
  cart_id    uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity   integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table if not exists public.wishlists (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (customer_id, variant_id)
);

-- =============================================================================
-- Orders
-- =============================================================================

create table if not exists public.orders (
  id                  uuid primary key default uuid_generate_v4(),
  order_number        text unique not null,
  customer_id         uuid references public.customers(id) on delete set null,
  email               text not null,
  status              text not null default 'pending_payment'
                       check (status in ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded')),
  subtotal_cents      integer not null check (subtotal_cents >= 0),
  shipping_cents      integer not null default 0 check (shipping_cents >= 0),
  discount_cents      integer not null default 0 check (discount_cents >= 0),
  total_cents         integer not null check (total_cents >= 0),
  currency            text not null default 'ZAR',
  shipping_address    jsonb not null,
  shipping_method     text not null check (shipping_method in ('pargo_pickup','tcg_door','dawn_wing_metro')),
  shipping_tracking   text,
  payment_gateway     text check (payment_gateway in ('payfast','yoco','ozow')),
  payment_reference   text,
  notes               text,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz,
  shipped_at          timestamptz,
  delivered_at        timestamptz
);
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_status_idx   on public.orders (status);
create index if not exists orders_created_idx  on public.orders (created_at desc);

create table if not exists public.order_items (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  variant_id        uuid references public.product_variants(id) on delete set null,
  product_name      text not null,
  variant_name      text not null,
  sku               text not null,
  quantity          integer not null check (quantity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  line_total_cents  integer not null check (line_total_cents >= 0),
  created_at        timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.order_events (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  event_type  text not null,
  payload     jsonb not null default '{}'::jsonb,
  actor_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at desc);

-- =============================================================================
-- Discounts, returns
-- =============================================================================

create table if not exists public.discount_codes (
  id              uuid primary key default uuid_generate_v4(),
  code            text unique not null,
  description     text,
  kind            text not null check (kind in ('percent','fixed_amount')),
  value           integer not null check (value > 0),
  min_order_cents integer not null default 0,
  max_uses        integer,
  used_count      integer not null default 0,
  starts_at       timestamptz,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.returns (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  reason       text not null,
  description  text,
  status       text not null default 'requested'
                check (status in ('requested','approved','rejected','received','refunded')),
  refund_cents integer check (refund_cents is null or refund_cents >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =============================================================================
-- Admin allowlist
-- =============================================================================

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

alter table public.categories        enable row level security;
alter table public.products           enable row level security;
alter table public.product_variants   enable row level security;
alter table public.product_images     enable row level security;
alter table public.customers          enable row level security;
alter table public.addresses          enable row level security;
alter table public.carts              enable row level security;
alter table public.cart_items         enable row level security;
alter table public.wishlists          enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.order_events       enable row level security;
alter table public.discount_codes     enable row level security;
alter table public.returns            enable row level security;
alter table public.admins             enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;

-- Categories, products, variants, images: public read, admin write
create policy "categories read all" on public.categories for select using (true);
create policy "products read active" on public.products for select using (is_active = true or public.is_admin(auth.uid()));
create policy "variants read active" on public.product_variants for select using (is_active = true or public.is_admin(auth.uid()));
create policy "images read all" on public.product_images for select using (true);

create policy "categories admin write" on public.categories for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "products admin write"   on public.products    for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "variants admin write"   on public.product_variants for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "images admin write"     on public.product_images   for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Customers: own row only
create policy "customers own" on public.customers for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins read all customers" on public.customers for select using (public.is_admin(auth.uid()));

-- Addresses: own rows
create policy "addresses own" on public.addresses for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Carts + items: own cart (or via session_id for anonymous — handled in app code)
create policy "carts own"        on public.carts      for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "cart_items own"   on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid()));

-- Wishlists: own
create policy "wishlists own" on public.wishlists for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Orders: customer reads own, admin reads all
create policy "orders own read"       on public.orders      for select using (customer_id = auth.uid());
create policy "orders admin read all" on public.orders      for select using (public.is_admin(auth.uid()));
create policy "orders admin write"    on public.orders      for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "order_items own read"   on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "order_items admin"      on public.order_items for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "order_events own read"  on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "order_events admin"     on public.order_events for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Discount codes: public read for validation, admin write
create policy "discounts read"     on public.discount_codes for select using (true);
create policy "discounts admin"    on public.discount_codes for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Returns: customer + admin
create policy "returns own"        on public.returns for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "returns admin"      on public.returns for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Admins: only admins can see who else is admin
create policy "admins admin read" on public.admins for select using (public.is_admin(auth.uid()));

-- =============================================================================
-- Trigger: auto-create a public.customers row when a new auth user signs up
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Helper RPC: place an order from a cart (server-side only — admin or service role)
-- =============================================================================
-- This is wrapped in a function so checkout can atomically create the order
-- + items + decrement stock + clear the cart.
create or replace function public.place_order(
  p_cart_id uuid,
  p_email text,
  p_shipping_address jsonb,
  p_shipping_method text,
  p_payment_gateway text,
  p_subtotal_cents integer,
  p_shipping_cents integer,
  p_discount_cents integer,
  p_total_cents integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item record;
begin
  -- Generate order number: BRZ-YYYY-NNNNN
  v_order_number := 'BRZ-' || to_char(now(), 'YYYY') || '-' ||
    lpad((select count(*) + 1 from public.orders)::text, 5, '0');

  insert into public.orders (
    order_number, customer_id, email, status,
    subtotal_cents, shipping_cents, discount_cents, total_cents,
    shipping_address, shipping_method, payment_gateway
  ) values (
    v_order_number,
    (select customer_id from public.carts where id = p_cart_id),
    p_email, 'pending_payment',
    p_subtotal_cents, p_shipping_cents, p_discount_cents, p_total_cents,
    p_shipping_address, p_shipping_method, p_payment_gateway
  )
  returning id into v_order_id;

  for v_item in
    select ci.variant_id, ci.quantity, pv.sku,
           coalesce(pv.price_cents, p.base_price_cents) as unit_price_cents,
           p.name as product_name, pv.name as variant_name
    from public.cart_items ci
    join public.product_variants pv on pv.id = ci.variant_id
    join public.products p on p.id = pv.product_id
    where ci.cart_id = p_cart_id
  loop
    insert into public.order_items (
      order_id, variant_id, product_name, variant_name, sku,
      quantity, unit_price_cents, line_total_cents
    ) values (
      v_order_id, v_item.variant_id, v_item.product_name, v_item.variant_name, v_item.sku,
      v_item.quantity, v_item.unit_price_cents, v_item.unit_price_cents * v_item.quantity
    );

    -- Decrement stock
    update public.product_variants
      set stock = greatest(stock - v_item.quantity, 0), updated_at = now()
      where id = v_item.variant_id;
  end loop;

  -- Clear the cart
  delete from public.cart_items where cart_id = p_cart_id;

  -- Audit event
  insert into public.order_events (order_id, event_type, payload)
  values (v_order_id, 'order_created', jsonb_build_object('source', 'checkout'));

  return v_order_id;
end;
$$;