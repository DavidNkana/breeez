/**
 * E bucks rules — pure business logic, no server imports.
 *
 * Evasale's loyalty programme: a customer who has completed more than ten
 * orders gets R50 off their next (eleventh) order. E bucks are earned at
 * 1 buck per R100 spent.
 */

/** E bucks earned per R100 spent. */
export const EBUCKS_PER_RAND = 0.01;

/** Completed orders needed before the milestone reward applies. */
export const REWARD_ORDERS_THRESHOLD = 10;

/** The milestone reward, in cents. */
export const REWARD_AMOUNT_CENTS = 5000;

/** Driver tip percentages the customer can choose from. */
export const DRIVER_TIP_PERCENTS = [0, 5, 10, 15, 20, 25, 30, 40, 50] as const;

export type EbucksSummary = {
  /** Orders the customer has completed (paid and beyond). */
  orderCount: number;
  /** E bucks earned so far. */
  ebucks: number;
  /** Orders still needed before the reward unlocks. */
  ordersToReward: number;
  /** The reward in cents, if it applies now. */
  rewardCents: number;
  /** True when this order qualifies for the reward. */
  qualifies: boolean;
};

export function ebucksFromSpend(totalCents: number): number {
  return Math.floor((totalCents / 100) * EBUCKS_PER_RAND);
}

/** Driver tip in cents for a given percentage of the order subtotal. */
export function driverTipCents(subtotalCents: number, percent: number): number {
  const pct = Math.max(0, Math.min(50, Math.round(percent || 0)));
  return Math.round((subtotalCents * pct) / 100);
}
