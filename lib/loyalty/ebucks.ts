import { createAdminClient } from '@/lib/supabase/admin';
import {
  EBUCKS_PER_RAND,
  REWARD_AMOUNT_CENTS,
  REWARD_ORDERS_THRESHOLD,
  ebucksFromSpend,
  type EbucksSummary,
} from './ebucks-core';

export * from './ebucks-core';

/**
 * Work out a customer's loyalty position.
 *
 * The reward applies from the eleventh completed order onwards: once the
 * customer has completed 10 orders, their next order gets R50 off.
 */
export async function getEbucksSummary(customerId: string | null | undefined): Promise<EbucksSummary> {
  const empty: EbucksSummary = {
    orderCount: 0,
    ebucks: 0,
    ordersToReward: REWARD_ORDERS_THRESHOLD,
    rewardCents: 0,
    qualifies: false,
  };
  if (!customerId) return empty;

  const admin = await createAdminClient();
  const { data } = (await admin
    .from('orders')
    .select('total_cents, status')
    .eq('customer_id', customerId)
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])) as any;

  const orders = data ?? [];
  const orderCount = orders.length;
  const spentCents = orders.reduce((sum: number, o: any) => sum + (o.total_cents ?? 0), 0);
  const qualifies = orderCount >= REWARD_ORDERS_THRESHOLD;

  return {
    orderCount,
    ebucks: ebucksFromSpend(spentCents),
    ordersToReward: Math.max(0, REWARD_ORDERS_THRESHOLD - orderCount),
    rewardCents: qualifies ? REWARD_AMOUNT_CENTS : 0,
    qualifies,
  };
}
