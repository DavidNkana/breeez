/**
 * Delivery building types.
 *
 * The Courier Guy has to find a physical door. "12 Test Street" is not
 * enough for a customer in an estate, a flat or an office block, so the
 * customer tells us what kind of place it is and names it.
 */

export type BuildingType = 'complex_estate' | 'apartment' | 'house' | 'office' | 'hotel_bb';

export const BUILDING_TYPES: Array<{
  value: BuildingType;
  label: string;
  hint: string;
  needsPlaceName: boolean;
}> = [
  {
    value: 'complex_estate',
    label: 'Complex / Estate',
    hint: 'Flat or unit number, block, street — for example "Flat 4, Block B, Raslouw Gardens"',
    needsPlaceName: true,
  },
  {
    value: 'apartment',
    label: 'Apartment',
    hint: 'Unit number and the building name — for example "Unit 12, Kestrel Court"',
    needsPlaceName: true,
  },
  {
    value: 'house',
    label: 'House',
    hint: 'House number and street — for example "48 Erlanger Street"',
    needsPlaceName: true,
  },
  {
    value: 'office',
    label: 'Office',
    hint: 'Floor, unit and building name — for example "2nd Floor, Unit 9, Lakeside Offices"',
    needsPlaceName: true,
  },
  {
    value: 'hotel_bb',
    label: 'Hotel / B&B',
    hint: 'The property name and street — for example "Klein Waterval Guesthouse"',
    needsPlaceName: true,
  },
];

export const BUILDING_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  BUILDING_TYPES.map((b) => [b.value, b.label]),
);

export function isBuildingType(value: unknown): value is BuildingType {
  return typeof value === 'string' && BUILDING_TYPES.some((b) => b.value === value);
}

/** The customer-facing "place name" label changes with the building type. */
export function buildingNameLabel(type: BuildingType | null): string {
  switch (type) {
    case 'complex_estate':
      return 'Estate or complex name';
    case 'apartment':
      return 'Building name';
    case 'house':
      return 'House name (if it has one)';
    case 'office':
      return 'Office building name';
    case 'hotel_bb':
      return 'Property name';
    default:
      return 'Name of the place';
  }
}

/**
 * Build the single-line address a courier reads.
 *
 * This is what gets printed on the waybill and handed to the driver, so the
 * order of the parts matters: unit/place first, then the street, then the
 * city and postcode.
 */
export function formatCourierAddress(address: {
  line1?: string | null;
  line2?: string | null;
  buildingType?: string | null;
  buildingName?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
}): string {
  const parts: string[] = [];
  const building = (address.buildingName ?? '').trim();
  const line2 = (address.line2 ?? '').trim();
  const line1 = (address.line1 ?? '').trim();

  if (building) parts.push(building);
  if (line2) parts.push(line2);
  if (line1) parts.push(line1);
  const cityLine = [address.city, address.postalCode].filter(Boolean).join(' ').trim();
  if (cityLine) parts.push(cityLine);

  return parts.join(', ');
}

/** The instructions the driver should see, if the customer gave any. */
export function formatDeliveryInstructions(instructions: string | null | undefined): string {
  const value = (instructions ?? '').trim();
  if (!value) return '';
  return value.length > 240 ? `${value.slice(0, 237)}…` : value;
}
