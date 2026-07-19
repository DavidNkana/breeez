-- 008_newsletter_subscribers.sql — newsletter opt-in table

create table if not exists public.newsletter_subscribers (
  id              uuid primary key default default_uuid_generate_v4(),
  email           text unique not null,
  source          text default 'footer',
  marketing_opt_in boolean not null default true,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

-- Reference uuid_generator_v4 (already enabled in 001, but keep the guard)
create extension if not exists "uuid-ossp";

-- Default UUID generator (Postgres 13+)
alter table public.newsletter_subscribers
  alter column id set default gen_random_uuid();

create index if not exists newsletter_email_idx on public.newsletter_subscribers (email);

alter table public.newsletter_subscribers enable row level security;

-- Inserts via service-role only (admin client) — no public insert policy.
-- Reads by the owner for unsubscribe flow only.
create policy "newsletter: read own row"
  on public.newsletter_subscribers
  for select
  using (false); -- admin-only reads
