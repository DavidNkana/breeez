-- Migration 005: add store_pickup to shipping_method check constraint
alter table public.orders drop constraint if exists orders_shipping_method_check;
alter table public.orders add constraint orders_shipping_method_check
  check (shipping_method in ('pargo_pickup','tcg_door','dawn_wing_metro','store_pickup'));