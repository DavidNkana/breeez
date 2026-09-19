export type StockVariantModel = {
  stock: number;
  active: boolean;
};

export type StockOrderItemModel = {
  id: string;
  quantity: number;
};

/** Small executable model for migration 021; database locking is tested by SQL/DB tests. */
export function checkoutStockModel(
  variant: StockVariantModel,
  quantity: number,
  orderItem: StockOrderItemModel,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be at least one');
  if (!variant.active) throw new Error('Variant is unavailable');
  if (variant.stock < quantity) return null;
  variant.stock -= quantity;
  return orderItem;
}

export function compensateStockModel(
  variant: StockVariantModel,
  orderItem: StockOrderItemModel | null,
) {
  if (!orderItem) return false;
  variant.stock += orderItem.quantity;
  return true;
}
