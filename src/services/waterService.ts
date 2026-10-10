import { supabase } from '../lib/supabase';
import type { WaterProductRow, WaterTransactionItemRow, WaterTransactionRow } from '../types/database';
import type { WaterSale } from '../types/models';
import { describeError, fetchAllRows, nextId, toPaymentMethod, unwrap, today } from './helpers';

type TxWithItems = WaterTransactionRow & {
  water_transaction_items: (WaterTransactionItemRow & { water_products: Pick<WaterProductRow, 'name'> | null })[];
};

const TX_SELECT = `*, water_transaction_items ( *, water_products ( name ) )`;

function toSale(row: TxWithItems): WaterSale {
  return {
    id: row.id,
    date: row.date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    phone: row.phone ?? '',
    address: row.address ?? '',
    subtotal: Number(row.subtotal) || 0,
    deliveryFee: Number(row.delivery_fee) || 0,
    discount: Number(row.discount) || 0,
    total: Number(row.total) || 0,
    amtPaid: Number(row.amount_paid) || 0,
    change: Number(row.change_amount) || 0,
    paymentMethod: row.payment_method ?? '',
    gcashRef: row.gcash_reference ?? '',
    paymentStatus: row.payment_status,
    delivery: Boolean(row.delivery),
    deliveryAddress: row.delivery_address ?? '',
    notes: row.notes ?? '',
    processedBy: row.processed_by ?? '',
    items: (row.water_transaction_items ?? []).map(line => ({
      id: line.water_product_id,
      name: line.water_products?.name ?? line.water_product_id,
      qty: Number(line.quantity) || 0,
      price: Number(line.unit_price) || 0,
      subtotal: Number(line.subtotal) || 0,
    })),
  };
}

export interface CreateWaterSaleInput {
  customerId: string | null;
  customerName: string;
  phone: string;
  address: string;
  items: { productId: string; qty: number; price: number; subtotal: number }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  amtPaid: number;
  change: number;
  paymentMethod: WaterSale['paymentMethod'];
  paymentStatus: WaterSale['paymentStatus'];
  gcashRef: string;
  delivery: boolean;
  deliveryAddress: string;
  notes: string;
  processedBy: string;
}

export const waterService = {
  async listSales(): Promise<WaterSale[]> {
    const rows = await fetchAllRows<TxWithItems>((from, to) =>
      supabase.from('water_transactions').select(TX_SELECT)
        .order('date', { ascending: false }).order('id', { ascending: false })
        .range(from, to)
    );
    return rows.map(toSale);
  },

  async getSale(id: string): Promise<WaterSale> {
    const row = unwrap(await supabase.from('water_transactions').select(TX_SELECT).eq('id', id).single()) as TxWithItems;
    return toSale(row);
  },

  async createSale(input: CreateWaterSaleInput): Promise<WaterSale> {
    const id = await nextId('water_transactions', 'WAT-TXN-');

    const { error: txError } = await supabase.from('water_transactions').insert({
      id,
      customer_id: input.customerId,
      customer_name: input.customerName || 'Walk-in',
      phone: input.phone || null,
      address: input.address || null,
      date: today(),
      subtotal: input.subtotal,
      delivery_fee: input.deliveryFee,
      discount: input.discount,
      total: input.total,
      amount_paid: input.amtPaid,
      change_amount: input.change,
      payment_method: toPaymentMethod(input.paymentMethod),
      payment_status: input.paymentStatus,
      gcash_reference: input.gcashRef || null,
      delivery: input.delivery,
      delivery_address: input.deliveryAddress || null,
      notes: input.notes || null,
      processed_by: input.processedBy,
    });
    if (txError) throw new Error(describeError(txError));

    if (input.items.length) {
      const { error } = await supabase.from('water_transaction_items').insert(
        input.items.map(i => ({
          transaction_id: id,
          water_product_id: i.productId,
          quantity: i.qty,
          unit_price: i.price,
          subtotal: i.subtotal,
        }))
      );
      if (error) {
        await supabase.from('water_transactions').delete().eq('id', id);
        throw new Error(describeError(error));
      }
    }

    // Stock-tracked products (bottles, caps, empty gallons) decrement on sale.
    await this.decrementStock(input.items);

    return this.getSale(id);
  },

  /**
   * Deducts sold quantities from stock-tracked products. Each deduction is a
   * single atomic UPDATE in the database (sell_water_stock), so two concurrent
   * sales of the same product can't both read the old level and lose one
   * deduction. Errors are collected and rethrown rather than swallowed: a sale
   * that silently fails to move stock is a stock-integrity bug, not a success.
   */
  async decrementStock(items: { productId: string; qty: number }[]): Promise<void> {
    if (!items.length) return;

    // Combine duplicate lines so a product added twice is deducted once, in full.
    const byProduct = new Map<string, number>();
    for (const i of items) byProduct.set(i.productId, (byProduct.get(i.productId) ?? 0) + i.qty);

    const failed: string[] = [];
    for (const [productId, qty] of byProduct) {
      if (qty <= 0) continue;
      const { error } = await supabase.rpc('sell_water_stock', { p_product_id: productId, p_qty: qty });
      if (error) failed.push(productId);
    }
    if (failed.length) {
      throw new Error(`Stock could not be updated for: ${failed.join(', ')}. Check the Inventory counts.`);
    }
  },
};
