-- Cancellation remains retryable until provider cancellation and every stock
-- compensation token have been confirmed.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending_payment','cancellation_pending','paid','processing','shipped','delivered','cancelled','refunded'));
