import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Order receipt data + the customer-facing status timeline.
 *
 * One loader for the success page, the guest tracking page and the account
 * order page, so the customer always sees exactly the same thing.
 */

export type OrderItem = {
  id: string;
  productId: string | null;
  /** The customer's own review of this item, if they left one. */
  myReview: { rating: number; body: string; title: string | null } | null;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  imageUrl: string | null;
};

export type TimelineStep = {
  key: string;
  label: string;
  description: string;
  state: 'done' | 'current' | 'upcoming' | 'failed';
  at: string | null;
};

export type OrderReceiptData = {
  id: string;
  customerId: string | null;
  orderNumber: string;
  email: string;
  status: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  shippingAddress: Record<string, any>;
  shippingMethod: string | null;
  shippingTracking: string | null;
  paymentGateway: string | null;
  paymentReference: string | null;
  driverTipCents: number;
  driverTipPercent: number;
  deliveryBuildingType: string | null;
  deliveryBuildingName: string | null;
  deliveryInstructions: string | null;
  orderNote: string | null;
  doorAddressConfirmed: boolean;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
  timeline: TimelineStep[];
};

const STEP_ORDER = ['paid', 'processing', 'shipped', 'delivered'] as const;

const STEP_COPY: Record<string, { label: string; description: string }> = {
  paid: { label: 'Payment received', description: 'We have your payment and your order is confirmed.' },
  processing: { label: 'Preparing your order', description: 'Our team is picking, packing and checking your items.' },
  shipped: { label: 'On its way', description: 'Your parcel is with The Courier Guy and heading to you.' },
  delivered: { label: 'Delivered', description: 'Your parcel has been delivered. We hope you love it.' },
};

const GENERIC_PRODUCT_NAMES = new Set(['', 'item', 'items', 'product', 'products', 'untitled']);

/** Some imported products still carry a generic name — use the variant name. */
export function receiptProductName(productName: string, variantName: string): string {
  const product = String(productName ?? '').trim();
  if (product && !GENERIC_PRODUCT_NAMES.has(product.toLowerCase())) return product;
  const variant = String(variantName ?? '').trim();
  return variant || product || 'Item';
}

/**
 * Build the timeline from the order's own state timestamps.
 *
 * The orders table has no "processing_at" column, so the processing step is
 * derived from the status: it is done once the order is shipped, current
 * while it is being processed, and upcoming before that.
 */
export function buildTimeline(order: {
  status: string;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}): TimelineStep[] {
  const status = order.status;
  const cancelled = status === 'cancelled' || status === 'refunded';
  const currentIndex = cancelled
    ? -1
    : Math.max(0, STEP_ORDER.indexOf(status as (typeof STEP_ORDER)[number]));

  const timestamps: Record<string, string | null> = {
    paid: order.paidAt,
    processing: null,
    shipped: order.shippedAt,
    delivered: order.deliveredAt,
  };

  const steps: TimelineStep[] = [
    {
      key: 'placed',
      label: 'Order placed',
      description: 'We have your order.',
      state: 'done',
      at: order.createdAt,
    },
  ];

  for (let i = 0; i < STEP_ORDER.length; i++) {
    const key = STEP_ORDER[i];
    const copy = STEP_COPY[key];
    let state: TimelineStep['state'];
    if (cancelled) {
      state = 'upcoming';
    } else if (i < currentIndex) {
      state = 'done';
    } else if (i === currentIndex) {
      state = 'current';
    } else {
      state = 'upcoming';
    }
    steps.push({
      key,
      label: copy.label,
      description: copy.description,
      state,
      // The processing step has no stored timestamp of its own.
      at: timestamps[key] ?? (state === 'done' && key === 'processing' ? order.shippedAt : null),
    });
  }

  return steps;
}

/** Load an order with its items (and product thumbnails) for the receipt. */
export async function loadOrderReceipt(orderId: string): Promise<OrderReceiptData | null> {
  const admin = await createAdminClient();

  const { data: order, error } = (await admin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()) as any;
  if (error || !order) return null;

  const { data: rows } = (await admin
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)) as any;
  const items: OrderItem[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    productId: null,
    myReview: null,
    productName: receiptProductName(r.product_name, r.variant_name),
    variantName: r.variant_name,
    sku: r.sku,
    quantity: r.quantity,
    unitPriceCents: r.unit_price_cents,
    lineTotalCents: r.line_total_cents,
    imageUrl: null,
  }));

  // Attach a product thumbnail when the variant still exists.
  const variantIds = (rows ?? []).map((r: any) => r.variant_id).filter(Boolean);
  if (variantIds.length) {
    const { data: variants } = (await admin
      .from('product_variants')
      .select('id, product_id')
      .in('id', variantIds)) as any;
    const byVariant = new Map<string, string>((variants ?? []).map((v: any) => [v.id, v.product_id]));
    const productIds = [...new Set(byVariant.values())];
    if (productIds.length) {
      const { data: images } = (await admin
        .from('product_images')
        .select('product_id, url, sort_order')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true })) as any;
      const firstImage = new Map<string, string>();
      for (const img of images ?? []) {
        if (!firstImage.has(img.product_id)) firstImage.set(img.product_id, img.url);
      }
      for (const item of items) {
        const row = (rows ?? []).find((r: any) => r.id === item.id);
        const productId = row?.variant_id ? byVariant.get(row.variant_id) : undefined;
        if (productId) {
          item.imageUrl = firstImage.get(productId) ?? null;
          item.productId = productId;
        }
      }
    }
  }

  const base = {
    id: order.id,
    customerId: order.customer_id ?? null,
    orderNumber: order.order_number,
    email: order.email,
    status: order.status,
    currency: order.currency ?? 'ZAR',
    subtotalCents: order.subtotal_cents ?? 0,
    shippingCents: order.shipping_cents ?? 0,
    discountCents: order.discount_cents ?? 0,
    totalCents: order.total_cents ?? 0,
    shippingAddress: order.shipping_address ?? {},
    shippingMethod: order.shipping_method,
    shippingTracking: order.shipping_tracking,
    paymentGateway: order.payment_gateway,
    paymentReference: order.payment_reference,
    driverTipCents: order.driver_tip_cents ?? 0,
    driverTipPercent: order.driver_tip_percent ?? 0,
    deliveryBuildingType: order.delivery_building_type ?? null,
    deliveryBuildingName: order.delivery_building_name ?? null,
    deliveryInstructions: order.delivery_instructions ?? null,
    orderNote: order.notes ?? null,
    doorAddressConfirmed: Boolean(order.door_address_confirmed),
    createdAt: order.created_at,
    paidAt: order.paid_at,
    shippedAt: order.shipped_at,
    deliveredAt: order.delivered_at,
    items,
  };

  return { ...base, timeline: buildTimeline(base) };
}
