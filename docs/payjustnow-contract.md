# PayJustNow v2 contract notes

Breeez uses the Ledger-verified PayJustNow v2 OpenAPI 2.0.2 contract.

- API create requests use `https://sandbox-checkout.payjustnow.io/v2/create` in
  sandbox or `https://checkout.payjustnow.io/v2/create` in production. A browser redirect is accepted only from
  `https://sandbox.payjustnow.com/api/v2/app/checkout/<token>` in sandbox or
  `https://payjustnow.com/api/v2/app/checkout/<token>` in production. API
  hosts, wrong paths, query strings, and lookalikes are rejected.
- Every request signs the JSON body after `raw.replace(/\\s/g, '')`, including
  callbacks. The create request is `{ requestId, payjustnow, checkoutTotalCents }`;
  merchant reference, order amount, items, customer/address, and redirects are
  nested under `payjustnow`.
- The create contract does not accept a callback URL. Configure the provider
  gateway installation with the exact documented field
  `checkoutStatusCallbackUrl`; Breeez deliberately does not send a misleading
  runtime `callbackUrl` field or expose a callback URL environment setting.
- `payjustnow.orderAmountCents` and top-level `checkoutTotalCents` equal the
  exact item-price sum. Nonzero shipping is a labelled synthetic item.
  Discounts are rejected when they cannot be represented safely by documented
  nonnegative item prices.
- Callback JSON uses `checkoutToken`, `merchantOrderReference`,
  `checkoutPaymentStatus`, `paymentReference`, and the documented `currency`
  field. Currency must be the string `ZAR` and match the local order currency.
  Numeric and string values are normalized safely for the other identity fields.
  Only `PAID` and `PAID_PENDING_CALLBACK` can reach the pending-only paid
  transition.
- A paid transition is accepted only from `pending_payment`, with the stored
  checkout token and order reference bound to the callback. The database emits
  one paid event only when that guarded row update changes a row; repeated
  callbacks for an already-paid order are no-ops.
