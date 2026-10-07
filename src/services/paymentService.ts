import { supabase } from '../lib/supabase';
import type { PaymentRow } from '../types/database';
import type { Payment } from '../types/models';
import { describeError, nextId, toPaymentMethod, unwrap, today } from './helpers';

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    date: row.payment_date,
    linkedTo: row.laundry_order_id ?? row.water_transaction_id ?? '',
    type: row.type ?? (row.laundry_order_id ? 'laundry' : row.water_transaction_id ? 'water' : 'debt'),
    customerId: row.customer_id,
    customerName: row.customer_name ?? '',
    description: row.description ?? '',
    amount: Number(row.amount) || 0,
    amtReceived: Number(row.amount_received) || 0,
    change: Number(row.change_amount) || 0,
    balance: Number(row.balance) || 0,
    method: row.method ?? '',
    gcashRef: row.gcash_reference ?? '',
    status: row.status,
    processedBy: row.processed_by ?? '',
  };
}

export interface CreatePaymentInput {
  laundryOrderId?: string | null;
  waterTransactionId?: string | null;
  customerId?: string | null;
  customerName: string;
  type: 'laundry' | 'water' | 'debt';
  description?: string;
  amount: number;
  amtReceived: number;
  change: number;
  balance: number;
  method: Payment['method'];
  status: Payment['status'];
  gcashRef?: string;
  processedBy: string;
}

export const paymentService = {
  async list(): Promise<Payment[]> {
    const rows = unwrap(
      await supabase.from('payments').select('*').order('payment_date', { ascending: false }).order('id', { ascending: false })
    ) as PaymentRow[];
    return rows.map(toPayment);
  },

  async create(input: CreatePaymentInput): Promise<Payment> {
    const id = await nextId('payments', 'PAY-');
    const row = unwrap(
      await supabase
        .from('payments')
        .insert({
          id,
          laundry_order_id: input.laundryOrderId ?? null,
          water_transaction_id: input.waterTransactionId ?? null,
          customer_id: input.customerId ?? null,
          customer_name: input.customerName,
          type: input.type,
          description: input.description ?? null,
          amount: input.amount,
          amount_received: input.amtReceived,
          change_amount: input.change,
          balance: input.balance,
          method: toPaymentMethod(input.method),
          status: input.status,
          payment_date: today(),
          gcash_reference: input.gcashRef || null,
          processed_by: input.processedBy,
        })
        .select()
        .single()
    ) as PaymentRow;
    return toPayment(row);
  },

  async settleDebt(id: string, amountReceived: number, method: Payment['method'], gcashRef = ''): Promise<Payment> {
    const existing = unwrap(await supabase.from('payments').select('*').eq('id', id).single()) as PaymentRow;
    const received = Number(existing.amount_received) + amountReceived;
    const balance = Math.max(0, Number(existing.amount) - received);

    const { error } = await supabase
      .from('payments')
      .update({
        amount_received: received,
        balance,
        method: toPaymentMethod(method),
        gcash_reference: gcashRef || existing.gcash_reference,
        status: balance === 0 ? 'paid' : 'partial',
        change_amount: Math.max(0, received - Number(existing.amount)),
      })
      .eq('id', id);
    if (error) throw new Error(describeError(error));

    const row = unwrap(await supabase.from('payments').select('*').eq('id', id).single()) as PaymentRow;
    return toPayment(row);
  },
};
