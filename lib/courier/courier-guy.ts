import { formatCourierAddress, formatDeliveryInstructions, BUILDING_TYPE_LABEL } from '@/lib/delivery/buildings';

/**
 * The Courier Guy integration.
 *
 * We collect the details a courier needs (building type, the name of the
 * place, the unit, the street, delivery instructions and the door-address
 * confirmation) and turn them into a shipment request.
 *
 * The API call itself stays behind configuration: The Courier Guy's API
 * endpoint and credentials are per-merchant and are not published in this
 * repo. Until they are set, `createCourierShipment` reports that it is not
 * configured instead of pretending a parcel was booked — a parcel that is
 * never booked but looks booked is far worse than one that is obviously
 * pending.
 */

export type CourierRecipient = {
  name: string;
  phone: string;
  email?: string | null;
};

export type CourierAddress = {
  line1?: string | null;
  line2?: string | null;
  buildingType?: string | null;
  buildingName?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
};

export type CourierShipment = {
  /** Our order reference. */
  orderNumber: string;
  recipient: CourierRecipient;
  address: CourierAddress;
  deliveryInstructions?: string | null;
  /** The tip the customer chose for the driver. */
  driverTipCents?: number;
  /** Whether the customer confirmed the door address. */
  doorAddressConfirmed?: boolean;
};

export type CourierResult = {
  ok: boolean;
  /** Courier tracking/reference, when the shipment was created. */
  tracking?: string | null;
  /** Why it did not work — shown to the admin, never to the customer. */
  reason?: string;
  /** True when no courier credentials are configured yet. */
  configured: boolean;
};

export function isCourierConfigured(): boolean {
  return Boolean(process.env.COURIER_GUY_API_KEY && process.env.COURIER_GUY_API_URL);
}

/**
 * The courier-ready address lines.
 *
 * The Courier Guy waybill has a limited number of address lines, so the
 * place name, unit and street are packed into as few lines as possible.
 */
export function buildCourierAddressLines(address: CourierAddress): string[] {
  const lines: string[] = [];
  const building = (address.buildingName ?? '').trim();
  const unit = (address.line2 ?? '').trim();
  const street = (address.line1 ?? '').trim();

  if (building) lines.push(building);
  if (unit) lines.push(unit);
  if (street) lines.push(street);
  if (address.city) lines.push(address.city);

  return lines.filter(Boolean).slice(0, 4);
}

/** The full address as one string, for the courier's reference field. */
export function buildCourierAddressSummary(address: CourierAddress): string {
  return formatCourierAddress({
    line1: address.line1,
    line2: address.line2,
    buildingType: address.buildingType,
    buildingName: address.buildingName,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
  });
}

/** Everything the courier needs, assembled and ready to send. */
export function buildCourierShipment(input: {
  orderNumber: string;
  recipient: CourierRecipient;
  address: CourierAddress;
  deliveryInstructions?: string | null;
  driverTipCents?: number;
  doorAddressConfirmed?: boolean;
}): CourierShipment {
  return {
    orderNumber: input.orderNumber,
    recipient: input.recipient,
    address: input.address,
    deliveryInstructions: formatDeliveryInstructions(input.deliveryInstructions),
    driverTipCents: input.driverTipCents ?? 0,
    doorAddressConfirmed: Boolean(input.doorAddressConfirmed),
  };
}

/**
 * Book the parcel with the courier.
 *
 * The request body below is the shape we need; the actual HTTP call is made
 * only when the merchant's endpoint and API key are configured. We keep the
 * call in one place so wiring the real endpoint is a small, reviewable change.
 */
export async function createCourierShipment(shipment: CourierShipment): Promise<CourierResult> {
  if (!isCourierConfigured()) {
    return {
      ok: false,
      configured: false,
      reason: 'Courier Guy credentials are not configured on this deployment.',
    };
  }

  const endpoint = `${process.env.COURIER_GUY_API_URL!.replace(/\/+$/, '')}/shipments`;
  const payload = {
    orderNumber: shipment.orderNumber,
    recipient: {
      name: shipment.recipient.name,
      phone: shipment.recipient.phone,
      email: shipment.recipient.email ?? undefined,
    },
    address: {
      lines: buildCourierAddressLines(shipment.address),
      summary: buildCourierAddressSummary(shipment.address),
      city: shipment.address.city,
      province: shipment.address.province,
      postalCode: shipment.address.postalCode,
      buildingType: shipment.address.buildingType
        ? BUILDING_TYPE_LABEL[shipment.address.buildingType] ?? shipment.address.buildingType
        : undefined,
    },
    instructions: shipment.deliveryInstructions || undefined,
    doorAddressConfirmed: shipment.doorAddressConfirmed,
    driverTipCents: shipment.driverTipCents,
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.COURIER_GUY_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, configured: true, reason: `Courier request failed (${res.status}): ${detail.slice(0, 200)}` };
    }
    const data: any = await res.json().catch(() => ({}));
    return {
      ok: true,
      configured: true,
      tracking: data?.tracking ?? data?.reference ?? data?.shipmentId ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      reason: `Courier request error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
