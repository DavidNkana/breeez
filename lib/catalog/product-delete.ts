export const PRODUCT_DELETE_OPERATIONS = [
  'delete_affected_cart_items',
  'delete_product_images',
  'delete_product_variants',
  'delete_product',
] as const;

export type ProductDeletePlan = {
  productId: string;
  affectedCartItemIds: string[];
  operations: typeof PRODUCT_DELETE_OPERATIONS;
  atomic: true;
};

type CartItem = { id: string; variantId: string };

export type ProductDeleteState = {
  products: string[];
  variantRows: Array<{ id: string; productId: string }>;
  imageRows: Array<{ id: string; productId: string }>;
  cartItems: CartItem[];
};

export type ProductDeleteExecution = {
  actor: 'anonymous' | 'authenticated' | 'admin';
  productId: string;
  failAt?: (operation: typeof PRODUCT_DELETE_OPERATIONS[number]) => boolean;
};

/**
 * Describe the rows the delete RPC is allowed to remove. This is deliberately
 * SQL-independent: it documents and tests the RPC contract without pretending
 * to be a database integration test.
 */
export function planProductDelete(input: {
  actorIsAdmin: boolean;
  productId: string;
  variantIds: string[];
  cartItems: CartItem[];
}): ProductDeletePlan {
  if (!input.actorIsAdmin) throw new Error('not authorized');

  const variantIds = new Set(input.variantIds);
  return {
    productId: input.productId,
    affectedCartItemIds: input.cartItems
      .filter((item) => variantIds.has(item.variantId))
      .map((item) => item.id),
    operations: PRODUCT_DELETE_OPERATIONS,
    atomic: true,
  };
}

/**
 * A small executable model of the RPC. It intentionally mirrors the SQL
 * operation order and transaction boundary for environments without a local
 * Supabase/Postgres test service. The clone is the transaction: failed
 * operations leave the caller's state untouched.
 */
export function executeProductDelete(
  state: ProductDeleteState,
  input: ProductDeleteExecution,
): ProductDeleteState {
  if (input.actor !== 'admin') throw new Error('not authorized');

  const working: ProductDeleteState = {
    products: [...state.products],
    variantRows: state.variantRows.map((row) => ({ ...row })),
    imageRows: state.imageRows.map((row) => ({ ...row })),
    cartItems: state.cartItems.map((item) => ({ ...item })),
  };
  const variantIds = new Set(working.variantRows
    .filter((row) => row.productId === input.productId)
    .map((row) => row.id));

  for (const operation of PRODUCT_DELETE_OPERATIONS) {
    if (input.failAt?.(operation)) throw new Error(`delete failed at ${operation}`);
    if (operation === 'delete_affected_cart_items') {
      working.cartItems = working.cartItems.filter((item) => !variantIds.has(item.variantId));
    } else if (operation === 'delete_product_images') {
      working.imageRows = working.imageRows.filter((row) => row.productId !== input.productId);
    } else if (operation === 'delete_product_variants') {
      working.variantRows = working.variantRows.filter((row) => row.productId !== input.productId);
    } else {
      working.products = working.products.filter((id) => id !== input.productId);
    }
  }
  return working;
}
