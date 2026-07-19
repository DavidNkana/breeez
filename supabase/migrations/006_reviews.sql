-- 006_reviews.sql — Product reviews + ratings
-- A review is bound to a purchased order item (verified buyer).
-- Customers can only review products they actually bought.
-- Admin can moderate via is_published flag.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,

  -- 1..5 stars
  rating smallint not null check (rating between 1 and 5),

  -- Review text (minimum 10 chars to prevent drive-by 1-word reviews)
  title text,
  body text not null check (char_length(body) >= 10),
  reviewer_display_name text not null,

  -- Moderation
  is_published boolean not null default true,
  is_verified_purchase boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_product_id_idx on public.reviews(product_id);
create index if not exists reviews_customer_id_idx on public.reviews(customer_id);
create index if not exists reviews_product_published_idx on public.reviews(product_id, is_published);
create unique index reviews_product_customer_unique on public.reviews(product_id, customer_id);

-- RLS: published reviews are public-readable by anyone
-- Authenticated customers can insert their own reviews
-- Admins can update/delete any review

alter table public.reviews enable row level security;

create policy "Reviews: anyone can read published reviews"
  on public.reviews
  for select
  using (is_published = true);

create policy "Reviews: customers can read their own reviews"
  on public.reviews
  for select
  using (auth.uid() = customer_id);

create policy "Reviews: customers can create reviews for themselves"
  on public.reviews
  for insert
  with check (
    auth.uid() = customer_id
    and is_verified_purchase = true  -- enforce verified buyers at the DB layer
  );

create policy "Reviews: customers can update their own reviews"
  on public.reviews
  for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

create policy "Reviews: customers can delete their own reviews"
  on public.reviews
  for delete
  using (auth.uid() = customer_id);

-- Admin full access
create policy "Reviews: admins full access"
  on public.reviews
  for all
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Auto-update updated_at
create or replace function public.reviews_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.reviews_set_updated_at();

-- Helpful view for fast PDP summary reads
create or replace view public.review_summary as
  select
    product_id,
    count(*)::int as review_count,
    coalesce(avg(rating)::numeric(3,2), 0) as avg_rating,
    count(*) filter (where rating = 5)::int as five_count,
    count(*) filter (where rating = 4)::int as four_count,
    count(*) filter (where rating = 3)::int as three_count,
    count(*) filter (where rating = 2)::int as two_count,
    count(*) filter (where rating = 1)::int as one_count
  from public.reviews
  where is_published = true
  group by product_id;

-- Speed up the view's group-by — index the underlying reviews table instead
-- (views themselves cannot be indexed in Postgres).
create index if not exists reviews_product_id_published_idx
  on public.reviews (product_id) where is_published = true;

grant select on public.review_summary to anon, authenticated;
