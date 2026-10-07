import { supabase } from '../lib/supabase';
import { describeError, unwrap } from './helpers';

export interface DeliveryTier {
  id: number;
  quantity: number;
  price: number;
  isActive: boolean;
}

interface DeliveryTierRow {
  id: number;
  quantity: number;
  price: number | string;
  is_active: boolean;
}

const toTier = (r: DeliveryTierRow): DeliveryTier => ({
  id: Number(r.id),
  quantity: Number(r.quantity),
  price: Number(r.price) || 0,
  isActive: r.is_active,
});

/**
 * Delivery is tiered, not per-gallon. The configured tiers give the total charge
 * for exactly that many refills (1→35, 2→70, 3→100, 4→155, 5→170, 6→200).
 *
 * For a quantity with no tier of its own, the largest tier that fits is charged
 * and the remainder is priced the same way — so 7 = 200 + 35 and 12 = 200 + 200.
 * Never quantity x flat rate.
 */
export function calcDeliveryFee(quantity: number, tiers: DeliveryTier[]): number {
  if (quantity <= 0) return 0;

  const active = tiers.filter(t => t.isActive).sort((a, b) => a.quantity - b.quantity);
  if (active.length === 0) return 0;

  const exact = active.find(t => t.quantity === quantity);
  if (exact) return exact.price;

  const fitting = active.filter(t => t.quantity <= quantity);
  // Below the smallest configured tier — charge that smallest tier.
  if (fitting.length === 0) return active[0].price;

  const largest = fitting[fitting.length - 1];
  return largest.price + calcDeliveryFee(quantity - largest.quantity, active);
}

/**
 * The tiers that make up a delivery fee, in the order they are charged.
 *
 * The cashier cannot check a tiered fee in their head — 4 refills costs 155,
 * not 4 x 35 — so the POS shows the working, and this is what it reads from.
 */
export function describeDeliveryFee(
  quantity: number,
  tiers: DeliveryTier[]
): { steps: { quantity: number; price: number }[]; total: number } {
  const steps: { quantity: number; price: number }[] = [];

  const active = tiers.filter(t => t.isActive).sort((a, b) => a.quantity - b.quantity);
  let remaining = quantity;

  while (remaining > 0 && active.length > 0) {
    const exact = active.find(t => t.quantity === remaining);
    if (exact) {
      steps.push({ quantity: exact.quantity, price: exact.price });
      break;
    }

    const fitting = active.filter(t => t.quantity <= remaining);
    if (fitting.length === 0) {
      // Below the smallest configured tier — that tier is charged in full.
      steps.push({ quantity: active[0].quantity, price: active[0].price });
      break;
    }

    const largest = fitting[fitting.length - 1];
    steps.push({ quantity: largest.quantity, price: largest.price });
    remaining -= largest.quantity;
  }

  return { steps, total: steps.reduce((sum, step) => sum + step.price, 0) };
}

export const pricingService = {
  async listDeliveryTiers(): Promise<DeliveryTier[]> {
    const rows = unwrap(
      await supabase.from('delivery_pricing').select('*').order('quantity')
    ) as DeliveryTierRow[];
    return rows.map(toTier);
  },

  async saveDeliveryTier(quantity: number, price: number): Promise<void> {
    const { error } = await supabase
      .from('delivery_pricing')
      .upsert({ quantity, price, is_active: true }, { onConflict: 'quantity' });
    if (error) throw new Error(describeError(error));
  },

  async removeDeliveryTier(id: number): Promise<void> {
    const { error } = await supabase.from('delivery_pricing').delete().eq('id', id);
    if (error) throw new Error(describeError(error));
  },
};
