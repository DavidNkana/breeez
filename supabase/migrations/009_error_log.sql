-- 009_error_log.sql — server-side error capture (interim Sentry replacement)

create table if not exists public.error_log (
  id            uuid primary key default gen_random_uuid(),
  message       text not null,
  stack         text,
  url           text,
  user_agent    text,
  severity      text not null default 'error',
  payload       jsonb,
  occurred_at   timestamptz not null default now()
);

create index if not exists error_log_occurred_idx on public.error_log (occurred_at desc);
create index if not exists error_log_severity_idx on public.error_log (severity);

alter table public.error_log enable row level security;

-- Only admins should read these
create policy "error_log: admin read"
  on public.error_log
  for select
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- No public insert policy — the API uses service-role key (admin client)
-- which bypasses RLS entirely.
