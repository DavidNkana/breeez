// =============================================================================
// Breeez — Supabase database type definitions
// =============================================================================
// These mirror the schema in supabase/migrations/001_init.sql.
// Hand-written for now; we can switch to `supabase gen types typescript --linked`
// once the Supabase CLI is installed (Task 3 in the plan).
// =============================================================================

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_id: string | null;
  brand: string;
  base_price_cents: number;
  compare_at_cents: number | null;
  is_active: boolean;
  is_featured: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  options: Record<string, string>;
  price_cents: number | null;
  compare_at_cents: number | null;
  stock: number;
  weight_grams: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Address = {
  id: string;
  customer_id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type Cart = {
  id: string;
  customer_id: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  created_at: string;
};

export type Wishlist = {
  id: string;
  customer_id: string;
  variant_id: string;
  created_at: string;
};

export type OrderStatus = 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type ShippingMethod = 'pargo_pickup' | 'tcg_door' | 'dawn_wing_metro';
export type PaymentGateway = 'payfast' | 'yoco' | 'ozow';

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  email: string;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  shipping_address: Json;
  shipping_method: ShippingMethod;
  shipping_tracking: string | null;
  payment_gateway: PaymentGateway | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  created_at: string;
};

export type OrderEvent = {
  id: string;
  order_id: string;
  event_type: string;
  payload: Json;
  actor_id: string | null;
  created_at: string;
};

export type DiscountCode = {
  id: string;
  code: string;
  description: string | null;
  kind: 'percent' | 'fixed_amount';
  value: number;
  min_order_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type Return = {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  description: string | null;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';
  refund_cents: number | null;
  created_at: string;
  updated_at: string;
};

// Row shapes for inserts
export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
export type ProductVariantInsert = Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
export type ProductImageInsert = Omit<ProductImage, 'id' | 'created_at'> & { id?: string };

// Database type map for the Supabase client
export type Database = {
  public: {
    Tables: {
      categories: { Row: Category; Insert: CategoryInsert; Update: Partial<Category> };
      products: { Row: Product; Insert: ProductInsert; Update: Partial<Product> };
      product_variants: { Row: ProductVariant; Insert: ProductVariantInsert; Update: Partial<ProductVariant> };
      product_images: { Row: ProductImage; Insert: ProductImageInsert; Update: Partial<ProductImage> };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> };
      addresses: { Row: Address; Insert: Omit<Address, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Address> };
      carts: { Row: Cart; Insert: Partial<Cart>; Update: Partial<Cart> };
      cart_items: { Row: CartItem; Insert: Omit<CartItem, 'id' | 'created_at'>; Update: Partial<CartItem> };
      wishlists: { Row: Wishlist; Insert: Omit<Wishlist, 'id' | 'created_at'>; Update: Partial<Wishlist> };
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at'>; Update: Partial<Order> };
      order_items: { Row: OrderItem; Insert: Omit<OrderItem, 'id' | 'created_at'>; Update: Partial<OrderItem> };
      order_events: { Row: OrderEvent; Insert: Omit<OrderEvent, 'id' | 'created_at'>; Update: Partial<OrderEvent> };
      discount_codes: { Row: DiscountCode; Insert: Omit<DiscountCode, 'id' | 'created_at'>; Update: Partial<DiscountCode> };
      returns: { Row: Return; Insert: Omit<Return, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Return> };
    };
    Functions: {
      place_order: {
        Args: {
          p_cart_id: string;
          p_email: string;
          p_shipping_address: Json;
          p_shipping_method: ShippingMethod;
          p_payment_gateway: PaymentGateway;
          p_subtotal_cents: number;
          p_shipping_cents: number;
          p_discount_cents: number;
          p_total_cents: number;
        };
        Returns: string;
      };
    };
    Enums: {
      order_status: OrderStatus;
      shipping_method: ShippingMethod;
      payment_gateway: PaymentGateway;
    };
  };
};