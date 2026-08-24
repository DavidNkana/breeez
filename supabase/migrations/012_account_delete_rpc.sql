-- 012_account_delete_rpc.sql
--
-- Apple App Store guideline 5.1.1(v) requires self-service account deletion.
--
-- This migration adds a SQL function that anonymizes order PII. The actual
-- auth.users deletion is done via the Supabase admin API in the route
-- handler (`app/api/account/delete/route.ts`), NOT via raw SQL.
--
-- Why split it this way?
--   The previous version of this function tried to do `delete from auth.users`
--   directly. That failed at runtime (HTTP 500) because Supabase protects
--   the auth.users table with internal privileges that even SECURITY DEFINER
--   bypasses inconsistently. The supported, reliable path is to use
--   `supabase.auth.admin.deleteUser(uid)` from server-side code, which goes
--   through the same machinery Supabase uses when an admin deletes a user
--   from the dashboard.
--
-- What this RPC does:
--   1. Anonymize every order belonging to the calling user, replacing:
--        - email            -> 'redacted-<order_number>@deleted.invalid'
--        - shipping.name    -> null
--        - shipping.phone   -> null
--        - shipping.line1   -> null
--        - shipping.line2   -> null
--        - shipping.city    -> kept (for tax / dispute context)
--        - shipping.province -> kept
--        - shipping.postal_code -> kept
--        - shipping.country -> kept
--      We deliberately null the personal fields but keep city/province/postal.
--      South African tax record-keeping (5-year SARS practice) is satisfied
--      by retaining the financial fields (subtotal_cents, total_cents, tax,
--      currency) and the location at the city level. We do NOT keep the
--      recipient's name, phone, or street address.
--
--   2. The actual auth.users deletion is performed by the route handler
--      AFTER this RPC succeeds, using supabase.auth.admin.deleteUser(uid).
--      The route handler runs in Node.js with the service-role key, so it
--      can call the admin API. SQL SECURITY DEFINER cannot call the admin
--      API (it's not a SQL function), so we split the work.
--
-- Why SECURITY DEFINER is still important here:
--   This function modifies public.orders. Without SECURITY DEFINER, the
--   calling user (the soon-to-be-deleted user) would be subject to RLS on
--   public.orders, and their own row update policy might block the
--   anonymization. SECURITY DEFINER + owner having UPDATE permission on
--   public.orders makes the anonymization always succeed.
--
-- Security:
--   The function does NOT take a uid parameter. It uses auth.uid() internally.
--   Without that, a logged-in attacker could call
--   rpc('account_delete_anonymize_orders', { uid: '<victim>' }) and wipe
--   the victim's order PII.
--
-- Permission:
--   EXECUTE granted only to authenticated. The function re-checks auth.uid()
--   is not null. Combined, the caller must be authenticated AND be the owner
--   of the orders being anonymized.

create or replace function public.account_delete_anonymize_orders()
returns integer  -- number of orders anonymized, for logging/UX
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
  v_order record;
begin
  -- Permission check: must be authenticated.
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Anonymize every order belonging to this user. Iterate so we can use
  -- the order_number in the redacted email (it's already unique).
  for v_order in
    select id, order_number
    from public.orders
    where customer_id = v_uid
  loop
    update public.orders
    set
      email = format('redacted-%s@deleted.invalid', v_order.order_number),
      shipping_address = jsonb_build_object(
        'label',      coalesce(shipping_address->>'label', ''),
        'name',       null,
        'phone',      null,
        'line1',      null,
        'line2',      null,
        'city',       shipping_address->>'city',
        'province',   shipping_address->>'province',
        'postal_code',shipping_address->>'postal_code',
        'country',    coalesce(shipping_address->>'country', 'ZA')
      )
    where id = v_order.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.account_delete_anonymize_orders() to authenticated;

comment on function public.account_delete_anonymize_orders() is
  'Apple App Store 5.1.1(v) self-service deletion step 1: anonymizes the calling user orders (PII fields: email, name, phone, address line1/line2 -> null/redacted; retains city/province/postal_code + financial fields for tax). The auth.users deletion itself is done via Supabase admin API in app/api/account/delete/route.ts. Caller must be authenticated; uses auth.uid() internally so it cannot be used against another user.';
