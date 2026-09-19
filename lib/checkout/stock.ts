export type CheckoutStockItem = {
  order_item_id: string;
};

export const STOCK_COMPENSATION_FAILURE_MESSAGE =
  'Checkout cancellation requires support intervention because stock restoration did not complete.';

export function getStockRollbackItems(
  successfulDecrements: CheckoutStockItem[],
) {
  // The order-item id is the exact decrement token returned by the atomic RPC.
  // Never reconstruct a token from variant/quantity: identical rows are valid.
  return successfulDecrements
    .filter(({ order_item_id }) => Boolean(order_item_id))
    .map(({ order_item_id }) => ({ order_item_id }));
}
