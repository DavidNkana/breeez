-- 012_account_delete_rpc.sql
--
-- Apple App Store guideline 5.1.1(v) requires self-service account deletion.
-- This migration adds an atomic RPC that deletes the user and anonymizes the
-- orders that legally must be retained for SA tax (5 years per SARS practice).
--
-- What this RPC does, atomically inside a transaction:
--   1. Anonymizes orders.email for any order belonging to this customer, so
--      that when auth.users is deleted (cascade -> customers, wishlist,
--      carts, addresses, reviews all gone), the order rows that remain no
--      longer carry the user's email address or any PII linking back.
--      The customer_id on the order is already set to NULL via the existing
--      ON DELETE SET NULL FK from orders -> customers, so no further work
--      is needed there.
--   2. Deletes the auth.users row. Postgres cascades:
--        auth.users -> public.customers (id)         -> addresses, wishlists,
--                                                    carts (customer_id), cart_items
--                                                    (via cart), reviews (customer_id)
--   3. After this returns, the only data left behind for tax purposes is
--      public.orders (and order_items) with:
--        - email = 'redacted-<order_number>@deleted.invalid'
--        - shipping_address (jsonb) is wiped of personal fields: name,
--          phone, line1/line2 are nulled. We keep city + province + postal_code
--          for tax record completeness (SARS does not require the recipient's
--          name or street address on a tax invoice after 5 years, but we
--          err on the side of keeping city for dispute resolution).
--        - customer_id = NULL (cascade already set this)
--
-- Security model:
--   - SECURITY DEFINER so it runs as the function owner (a privileged role)
--     and bypasses RLS, otherwise the calling user would be denied for the
--     auth.users delete.
--   - The function checks that auth.uid() returns a valid uuid. We do NOT
--     take a uid parameter — the function only ever operates on the caller.
--     Without this, a logged-in attacker could call
--     rpc('account_delete', { uid: '<victim>' }) and wipe the victim. With
--     the auth.uid()-only design, only the user themselves can delete their
--     own account.
--
-- NOTE on cascading to public.orders:
--   orders.customer_id is `references public.customers(id) ON DELETE SET NULL`
--   so when auth.users -> customers deletion cascades, the orders.customer_id
--   is automatically set to NULL. We don't need to touch that FK manually.

create or replace function public.account_delete()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_order record;
begin
  -- Permission check: must be authenticated.
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Step 1: anonymize order PII before we delete the user. Iterate every
  -- order this customer placed and replace the personal fields with
  -- non-identifying placeholders. We do this BEFORE deleting the auth user
  -- so the FK link to customer_id is still valid for the WHERE clause.
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
  end loop;

  -- Step 2: delete the auth user. Cascade wipes:
  --   auth.users -> public.customers -> addresses, wishlists, carts,
  --                  cart_items (via cart), reviews (customer_id)
  -- orders.customer_id becomes NULL automatically via the FK rule.
  delete from auth.users where id = v_uid;
end;
$$;

-- Lock down who can call this RPC. SECURITY DEFINER makes it run as the
-- function owner (a Postgres role), but the EXECUTE permission still gates
-- who can issue the call. We grant EXECUTE only to authenticated users.
-- The function internally re-checks auth.uid() so a user can only ever
-- delete themselves.
grant execute on function public.account_delete() to authenticated;

comment on function public.account_delete() is
  'Self-service account deletion for Apple App Store 5.1.1(v) compliance. Deletes the auth user, cascades to customers/wishlist/carts/reviews, and anonymizes order PII (email, name, phone, address) while preserving tax-required fields (city, province, postal_code, order_number, amounts). Caller must be authenticated; the function only ever operates on auth.uid().';
