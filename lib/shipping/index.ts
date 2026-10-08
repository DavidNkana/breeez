/**
 * Evasale shipping adapters.
 *
 * The Courier Guy is the only active customer-facing courier.
 *
 * In v1 with MOCK_SHIPPING=true (default), the quote function returns the
 * spec'd flat rates. Real courier API integration is a Phase 2 task that
 * requires Chris to have business accounts + API keys.
 */

const MOCK = process.env.MOCK_SHIPPING !== 'false';

export type ShippingMethod = 'tcg_door';

export type ShippingQuote = {
  method: ShippingMethod;
  label: string;
  description: string;
  costCents: number;
  estimatedDays: string;
};

const RATES: Record<ShippingMethod, Omit<ShippingQuote, 'method'>> = {
  tcg_door: {
    label: 'Door Delivery (The Courier Guy)',
    description: 'Standard delivery to your address',
    costCents: 8900,
    estimatedDays: '2-5 working days'
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

export function getAllShippingOptions(_postalCode?: string): ShippingQuote[] {
  return (Object.keys(RATES) as ShippingMethod[]).map((method) => ({
    method,
    ...RATES[method]
  }));
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
    const trackingNumber = `TCG${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return { trackingNumber, courier: 'The Courier Guy' };
  }

  // Real courier API calls would go here
  // For now, return a placeholder
  throw new Error(`Real ${method} booking not yet implemented. Set MOCK_SHIPPING=true or add real API integration.`);
}
