import { supabase } from '../lib/supabase';
import type {
  LaundryAddonRow,
  LaundryOrderAddonRow,
  LaundryOrderRow,
  LaundryOrderServiceRow,
  LaundryServiceRow,
  LaundryStatus,
} from '../types/database';
import type { LaundryAddon, LaundryOrder } from '../types/models';
import { describeError, fetchAllRows, nextId, toPaymentMethod, unwrap, today } from './helpers';

type OrderWithLines = LaundryOrderRow & {
  laundry_order_services: (LaundryOrderServiceRow & { laundry_services: Pick<LaundryServiceRow, 'name' | 'unit'> | null })[];
  laundry_order_addons: (LaundryOrderAddonRow & { laundry_addons: Pick<LaundryAddonRow, 'name'> | null })[];
};

const ORDER_SELECT = `
  *,
  laundry_order_services ( *, laundry_services ( name, unit ) ),
  laundry_order_addons ( *, laundry_addons ( name ) )
`;

function toOrder(row: OrderWithLines): LaundryOrder {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    phone: row.phone ?? '',
    date: row.date,
    status: row.status,
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    total: Number(row.total) || 0,
    paid: Number(row.amount_paid) || 0,
    change: Number(row.change_amount) || 0,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method ?? '',
    gcashRef: row.gcash_reference ?? '',
    processedBy: row.processed_by ?? '',
    notes: row.notes ?? '',
    services: (row.laundry_order_services ?? []).map(line => ({
      svcId: line.laundry_service_id,
      name: line.laundry_services?.name ?? line.laundry_service_id,
      qty: Number(line.quantity) || 0,
      unit: line.laundry_services?.unit ?? '',
      price: Number(line.unit_price) || 0,
      subtotal: Number(line.subtotal) || 0,
    })),
    addons: (row.laundry_order_addons ?? []).map(line => ({
      id: line.laundry_addon_id,
      name: line.laundry_addons?.name ?? line.laundry_addon_id,
      qty: Number(line.quantity) || 0,
      price: Number(line.unit_price) || 0,
      subtotal: Number(line.subtotal) || 0,
    })),
  };
}

export interface CreateLaundryOrderInput {
  customerId: string | null;
  customerName: string;
  phone: string;
  services: { svcId: string; qty: number; price: number; subtotal: number }[];
  addons: { id: string; qty: number; price: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentStatus: LaundryOrder['paymentStatus'];
  paymentMethod: LaundryOrder['paymentMethod'];
  gcashRef: string;
  processedBy: string;
  notes: string;
}

export const laundryService = {
  async listOrders(): Promise<LaundryOrder[]> {
    const rows = await fetchAllRows<OrderWithLines>((from, to) =>
      supabase.from('laundry_orders').select(ORDER_SELECT)
        .order('date', { ascending: false }).order('id', { ascending: false })
        .range(from, to)
    );
    return rows.map(toOrder);
  },

  async listServices(): Promise<LaundryServiceRow[]> {
    return unwrap(await supabase.from('laundry_services').select('*').order('id'));
  },

  async listAddons(): Promise<LaundryAddon[]> {
    const rows = unwrap(await supabase.from('laundry_addons').select('*').order('id')) as LaundryAddonRow[];
    return rows.map(r => ({ id: r.id, name: r.name, price: Number(r.price) || 0 }));
  },

  async createAddon(name: string, price: number): Promise<LaundryAddon> {
    const id = await nextId('laundry_addons', 'ADD-', 3);
    const row = unwrap(
      await supabase.from('laundry_addons').insert({ id, name, price }).select().single()
    ) as LaundryAddonRow;
    return { id: row.id, name: row.name, price: Number(row.price) || 0 };
  },

  async updateAddon(id: string, patch: { name?: string; price?: number }): Promise<void> {
    const { error } = await supabase.from('laundry_addons').update(patch).eq('id', id);
    if (error) throw new Error(describeError(error));
  },

  async removeAddon(id: string): Promise<void> {
    const { error } = await supabase.from('laundry_addons').delete().eq('id', id);
    if (error) throw new Error(describeError(error));
  },

  async createOrder(input: CreateLaundryOrderInput): Promise<LaundryOrder> {
    const id = await nextId('laundry_orders', 'LAU-');

    const { error: orderError } = await supabase.from('laundry_orders').insert({
      id,
      customer_id: input.customerId,
      customer_name: input.customerName,
      phone: input.phone || null,
      date: today(),
      status: 'pending',
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      amount_paid: input.paid,
      change_amount: input.change,
      payment_status: input.paymentStatus,
      payment_method: toPaymentMethod(input.paymentMethod),
      gcash_reference: input.gcashRef || null,
      processed_by: input.processedBy,
      notes: input.notes || null,
    });
    if (orderError) throw new Error(describeError(orderError));

    if (input.services.length) {
      const { error } = await supabase.from('laundry_order_services').insert(
        input.services.map(s => ({
          laundry_order_id: id,
          laundry_service_id: s.svcId,
          quantity: s.qty,
          unit_price: s.price,
          subtotal: s.subtotal,
        }))
      );
      // Roll the header back so a half-written order never reaches the tracker.
      if (error) {
        await supabase.from('laundry_orders').delete().eq('id', id);
        throw new Error(describeError(error));
      }
    }

    if (input.addons.length) {
      const { error } = await supabase.from('laundry_order_addons').insert(
        input.addons.map(a => ({
          laundry_order_id: id,
          laundry_addon_id: a.id,
          quantity: a.qty,
          unit_price: a.price,
          subtotal: a.subtotal,
        }))
      );
      if (error) {
        await supabase.from('laundry_orders').delete().eq('id', id);
        throw new Error(describeError(error));
      }
    }

    return this.getOrder(id);
  },

  async getOrder(id: string): Promise<LaundryOrder> {
    const row = unwrap(await supabase.from('laundry_orders').select(ORDER_SELECT).eq('id', id).single()) as OrderWithLines;
    return toOrder(row);
  },

  /**
   * An order is locked once it has been released AND fully paid — at that point
   * it is a closed sale and must not be altered.
   */
  isLocked(order: Pick<LaundryOrder, 'status' | 'paymentStatus'>): boolean {
    return order.status === 'released' && order.paymentStatus === 'paid';
  },

  /** Edits the order header. Line items keep the price they were sold at. */
  async updateOrder(
    id: string,
    patch: { customerName?: string; phone?: string; notes?: string; discount?: number }
  ): Promise<LaundryOrder> {
    const current = await this.getOrder(id);
    if (this.isLocked(current)) {
      throw new Error('This order is released and fully paid, so it can no longer be edited.');
    }

    const update: Record<string, unknown> = {};
    if (patch.customerName !== undefined) update.customer_name = patch.customerName;
    if (patch.phone !== undefined) update.phone = patch.phone || null;
    if (patch.notes !== undefined) update.notes = patch.notes || null;

    if (patch.discount !== undefined) {
      const total = Math.max(0, current.subtotal - patch.discount);
      update.discount = patch.discount;
      update.total = total;
      update.payment_status = current.paid >= total && total > 0 ? 'paid' : current.paid > 0 ? 'partial' : 'unpaid';
      update.change_amount = Math.max(0, current.paid - total);
    }

    const { error } = await supabase.from('laundry_orders').update(update).eq('id', id);
    if (error) throw new Error(describeError(error));
    return this.getOrder(id);
  },

  /** Removes the order; its service and add-on lines cascade. */
  async deleteOrder(id: string): Promise<void> {
    const current = await this.getOrder(id);
    if (this.isLocked(current)) {
      throw new Error('This order is released and fully paid, so it can no longer be deleted.');
    }
    // Detach ledger rows first so the payment history survives the deletion.
    await supabase.from('payments').update({ laundry_order_id: null }).eq('laundry_order_id', id);

    const { error } = await supabase.from('laundry_orders').delete().eq('id', id);
    if (error) throw new Error(describeError(error));
  },

  async updateStatus(id: string, status: LaundryStatus): Promise<LaundryOrder> {
    // A released + fully paid order is a closed sale; don't let a status change
    // reopen it. Enforced here (not only in the UI) so a direct call can't either.
    const current = await this.getOrder(id);
    if (this.isLocked(current)) {
      throw new Error('This order is released and fully paid, so its status can no longer be changed.');
    }
    const { error } = await supabase.from('laundry_orders').update({ status }).eq('id', id);
    if (error) throw new Error(describeError(error));
    return this.getOrder(id);
  },

  async markPaid(id: string, amountPaid: number, method: LaundryOrder['paymentMethod'], gcashRef = ''): Promise<LaundryOrder> {
    const order = await this.getOrder(id);
    if (order.paymentStatus === 'paid') {
      throw new Error('This order is already fully paid.');
    }
    const paid = order.paid + amountPaid;
    const { error } = await supabase
      .from('laundry_orders')
      .update({
        amount_paid: paid,
        payment_method: toPaymentMethod(method),
        gcash_reference: gcashRef || null,
        payment_status: paid >= order.total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        change_amount: Math.max(0, paid - order.total),
      })
      .eq('id', id);
    if (error) throw new Error(describeError(error));
    return this.getOrder(id);
  },
};
