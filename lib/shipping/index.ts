/**
 * Trends Day-to-Day shipping adapters.
 *
 * Three SA couriers: Pargo (pickup points), The Courier Guy (door delivery),
 * Dawn Wing (same-day metro only).
 *
 * In v1 with MOCK_SHIPPING=true (default), the quote function returns the
 * spec'd flat rates. Real courier API integration is a Phase 2 task that
 * requires Chris to have business accounts + API keys.
 */

const MOCK = process.env.MOCK_SHIPPING !== 'false';

export type ShippingMethod = 'pargo_pickup' | 'tcg_door' | 'dawn_wing_metro' | 'store_pickup';

export type ShippingQuote = {
  method: ShippingMethod;
  label: string;
  description: string;
  costCents: number;
  estimatedDays: string;
};

const RATES: Record<ShippingMethod, Omit<ShippingQuote, 'method'>> = {
  store_pickup: {
    label: 'Pickup from Store',
    description: 'Collect your order from our store. We\'ll notify you when it\'s ready.',
    costCents: 0,
    estimatedDays: 'Ready within 24 hours'
  },
  pargo_pickup: {
    label: 'Pargo Pickup Point',
    description: 'Collect at one of 2,500+ Pargo points nationwide',
    costCents: 4900,
    estimatedDays: '3-5 working days'
  },
  tcg_door: {
    label: 'Door Delivery (The Courier Guy)',
    description: 'Standard delivery to your address',
    costCents: 8900,
    estimatedDays: '2-5 working days'
  },
  dawn_wing_metro: {
    label: 'Same-day Metro (Dawn Wing)',
    description: 'Order before 11am, delivered same day (JHB/CPT/DBN/PTA only)',
    costCents: 14900,
    estimatedDays: 'Same day'
  }
};

export function isMetroPostalCode(postalCode: string): boolean {
  // Major SA metros: JHB (2000), CPT (8000), DBN (4000), PTA (0001-0187)
  const pc = parseInt(postalCode, 10);
  if (isNaN(pc)) return false;
  return (
    (pc >= 2000 && pc <= 2199) ||  // JHB area
    (pc >= 8000 && pc <= 8099) ||  // CPT area
    (pc >= 4000 && pc <= 4099) ||  // DBN area
    (pc >= 1 && pc <= 187)          // PTA area
  );
}

export function getAllShippingOptions(postalCode?: string): ShippingQuote[] {
  const all: ShippingQuote[] = (Object.keys(RATES) as ShippingMethod[]).map((method) => ({
    method,
    ...RATES[method]
  }));
  if (postalCode && !isMetroPostalCode(postalCode)) {
    return all.filter((q) => q.method !== 'dawn_wing_metro');
  }
  return all;
}

export function calculateShippingCents(method: ShippingMethod, _subtotalCents: number): number {
  return RATES[method].costCents;
}

export type ShippingAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  province: string;
  postal_code: string;
};

/**
 * Mock parcel tracking number generator.
 * Real version would call the courier API and store the returned waybill.
 */
export async function bookShipment(method: ShippingMethod, orderNumber: string, address: ShippingAddress): Promise<{ trackingNumber: string; courier: string }> {
  if (MOCK) {
    const prefix = method === 'pargo_pickup' ? 'PAR' : method === 'tcg_door' ? 'TCG' : 'DW';
    const trackingNumber = `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return { trackingNumber, courier: RATES[method].label.split(' ')[0] };
  }

  // Real courier API calls would go here
  // For now, return a placeholder
  throw new Error(`Real ${method} booking not yet implemented. Set MOCK_SHIPPING=true or add real API integration.`);
}