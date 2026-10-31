import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  BUILDING_TYPES,
  buildingNameLabel,
  formatCourierAddress,
  isBuildingType,
} from '../lib/delivery/buildings';
import {
  DRIVER_TIP_PERCENTS,
  REWARD_AMOUNT_CENTS,
  REWARD_ORDERS_THRESHOLD,
  driverTipCents,
  ebucksFromSpend,
} from '../lib/loyalty/ebucks-core';
import { buildCourierAddressLines, buildCourierAddressSummary } from '../lib/courier/courier-guy';

test('the customer chooses the kind of place so the courier finds the door', () => {
  const values = BUILDING_TYPES.map((b) => b.value);
  assert.deepEqual(values, ['complex_estate', 'apartment', 'house', 'office', 'hotel_bb']);
  assert.equal(isBuildingType('apartment'), true);
  assert.equal(isBuildingType('castle'), false);
  assert.equal(buildingNameLabel('complex_estate'), 'Estate or complex name');
  assert.equal(buildingNameLabel('office'), 'Office building name');
});

test('the courier address puts the place, unit and street in the right order', () => {
  const summary = formatCourierAddress({
    buildingName: 'Raslouw Gardens Estate',
    line2: 'Flat 4, Block B',
    line1: '48 Erlanger Street',
    city: 'Pretoria',
    province: 'Gauteng',
    postalCode: '0181',
  });
  assert.equal(
    summary,
    'Raslouw Gardens Estate, Flat 4, Block B, 48 Erlanger Street, Pretoria 0181',
  );

  const lines = buildCourierAddressLines({
    buildingName: 'Raslouw Gardens Estate',
    line2: 'Flat 4, Block B',
    line1: '48 Erlanger Street',
    city: 'Pretoria',
  });
  assert.deepEqual(lines, ['Raslouw Gardens Estate', 'Flat 4, Block B', '48 Erlanger Street', 'Pretoria']);
  assert.ok(buildCourierAddressSummary({ line1: '1 Main St', city: 'Pretoria' }).includes('1 Main St'));
});

test('the driver tip is a percentage of the subtotal, capped at 50%', () => {
  assert.equal(driverTipCents(10000, 10), 1000);
  assert.equal(driverTipCents(10000, 0), 0);
  assert.equal(driverTipCents(10000, 50), 5000);
  assert.equal(driverTipCents(10000, 999), 5000);
  assert.equal(driverTipCents(10000, -5), 0);
  assert.deepEqual([...DRIVER_TIP_PERCENTS].sort((a, b) => a - b), [0, 5, 10, 15, 20, 25, 30, 40, 50]);
});

test('E bucks: 10 completed orders earns R50 off the next one', () => {
  assert.equal(REWARD_ORDERS_THRESHOLD, 10);
  assert.equal(REWARD_AMOUNT_CENTS, 5000);
  // 1 buck per R100 spent: R100 = 1 buck, R1 000 = 10 bucks.
  assert.equal(ebucksFromSpend(10000), 1);
  assert.equal(ebucksFromSpend(9999), 0);
  assert.equal(ebucksFromSpend(100000), 10);
});

test('the checkout collects everything the courier and the team need', async () => {
  const form = await readFile(resolve('components/checkout/CheckoutForm.tsx'), 'utf8');
  // Order note for Evasale
  assert.match(form, /orderNote/);
  assert.match(form, /Add a note for Evasale/);
  // Save the location for next time
  assert.match(form, /saveLocation/);
  assert.match(form, /Save this location for next time/);
  // Building type + place name
  assert.match(form, /BUILDING_TYPES/);
  assert.match(form, /buildingNameLabel/);
  // Door address confirmation
  assert.match(form, /doorConfirmed/);
  assert.match(form, /I confirm this is where the door is/);
  // Delivery instructions
  assert.match(form, /deliveryInstructions/);
  // Driver tip
  assert.match(form, /DRIVER_TIP_PERCENTS/);
  assert.match(form, /100% of tips go to the driver/);
  // Loyalty + coupon in the payment step
  assert.match(form, /loyalty/);
  assert.match(form, /E bucks/);
  assert.match(form, /Promo or coupon code/);
});

test('the order is stored with the delivery detail and the tip', async () => {
  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  assert.match(route, /delivery_building_type: building/);
  assert.match(route, /delivery_building_name: buildingPlaceName/);
  assert.match(route, /driver_tip_cents: tipCents/);
  assert.match(route, /notes: String\(orderNote/);
  assert.match(route, /door_address_confirmed: true/);
  // The door address must be confirmed before an order is created.
  assert.match(route, /if \(!doorAddressConfirmed\)/);
  // The E-bucks reward is applied server-side, never in the browser.
  assert.match(route, /getEbucksSummary/);
});

test('the customer can rate the items and the delivery from their order', async () => {
  const tabs = await readFile(resolve('components/orders/OrderTabs.tsx'), 'utf8');
  assert.match(tabs, /Rate/);
  assert.match(tabs, /OrderReviewPanel/);

  const panel = await readFile(resolve('components/orders/OrderReviewPanel.tsx'), 'utf8');
  assert.match(panel, /\/api\/reviews/);
  assert.match(panel, /delivery-review/);
  assert.match(panel, /How was the delivery/);

  const review = await readFile(resolve('app/api/reviews/route.ts'), 'utf8');
  assert.match(review, /orderItemId/);
  assert.match(review, /Order not found/);

  const delivery = await readFile(
    resolve('app/api/account/orders/[orderId]/delivery-review/route.ts'),
    'utf8',
  );
  assert.match(delivery, /order_delivery_reviews/);
  assert.match(delivery, /delivery_rated_at/);
});

test('the migration adds the delivery, tip, rating and loyalty columns', async () => {
  const sql = await readFile(resolve('supabase/APPLY-032-delivery-loyalty.sql'), 'utf8');
  assert.match(sql, /delivery_building_type/);
  assert.match(sql, /delivery_instructions/);
  assert.match(sql, /driver_tip_cents/);
  assert.match(sql, /door_address_confirmed/);
  assert.match(sql, /delivery_rating/);
  assert.match(sql, /order_delivery_reviews/);
  assert.match(sql, /customer_completed_order_count/);
});
