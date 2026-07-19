-- 007_coupon_usage.sql — link orders to coupon codes + atomic usage increment

-- Add a coupon_code column to orders for accounting/reporting
alter table public.orders
  add column if not exists coupon_code text;

create index if not exists orders_coupon_idx on public.orders (coupon_code) where coupon_code is not null;

-- Atomic increment via SQL function (safer than read-modify-write in app code)
create or replace function public.increment_coupon_usage(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.discount_codes
     set used_count = coalesce(used_count, 0) + 1
   where code = p_code
     and (max_uses is null or coalesce(used_count, 0) < max_uses);
end;
$$;

grant execute on function public.increment_coupon_usage(text) to anon, authenticated;
