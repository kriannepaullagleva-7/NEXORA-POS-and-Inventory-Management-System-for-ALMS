import { supabase } from '../lib/supabase';
import { describeError } from './helpers';

export interface AppNotification {
  /** Stable, deterministic — used as the read/unread key and the React key. */
  key: string;
  title: string;
  desc: string;
  time: string;
  /** Route to open when the notification is clicked. */
  path: string;
}

interface ReadyOrderRow { id: string; customer_name: string; date: string }
interface DebtRow { id: string; customer_name: string | null; balance: number; payment_date: string }
interface PendingPoRow { id: string; supplier_name: string; date: string; total: number }

/**
 * Notifications are computed live from the records that are already real —
 * not stored as a separate event log. That means one never goes stale: once
 * an order is picked up, a debt is settled, or stock is replenished, it just
 * stops being computed here, with nothing left dangling to clean up and no
 * way to link to a record that no longer exists.
 *
 * Read/unread state is the only thing that persists (see notification_reads,
 * migration 006) — matched to these rows by the deterministic `key` below.
 */
export const notificationService = {
  async readyForPickup(): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('laundry_orders')
      .select('id, customer_name, date')
      .eq('status', 'ready')
      .order('date', { ascending: false })
      .limit(20);
    if (error) throw new Error(describeError(error));

    return ((data ?? []) as ReadyOrderRow[]).map(o => ({
      key: `ready-${o.id}`,
      title: 'Ready for Pickup',
      desc: `Order ${o.id} for ${o.customer_name} is ready for pickup.`,
      time: o.date,
      path: '/laundry/orders',
    }));
  },

  async unpaidDebts(): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('id, customer_name, balance, payment_date')
      .eq('status', 'unpaid')
      .order('payment_date', { ascending: false })
      .limit(20);
    if (error) throw new Error(describeError(error));

    return ((data ?? []) as DebtRow[]).map(p => ({
      key: `debt-${p.id}`,
      title: 'Outstanding Balance',
      desc: `${p.customer_name || 'Walk-in'} owes ₱${(Number(p.balance) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
      time: p.payment_date,
      path: '/payments/history',
    }));
  },

  async pendingPurchaseOrders(): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, supplier_name, date, total')
      .eq('status', 'pending')
      .order('date', { ascending: false })
      .limit(20);
    if (error) throw new Error(describeError(error));

    return ((data ?? []) as PendingPoRow[]).map(po => ({
      key: `po-${po.id}`,
      title: 'Purchase Order Pending',
      desc: `${po.id} to ${po.supplier_name} — ₱${(Number(po.total) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} not yet received.`,
      time: po.date,
      path: '/inventory/purchase',
    }));
  },

  /** Every read key the given employee has already opened. */
  async readKeys(employeeId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('notification_reads')
      .select('notif_key')
      .eq('employee_id', employeeId);
    if (error) throw new Error(describeError(error));
    return new Set((data ?? []).map((r: { notif_key: string }) => r.notif_key));
  },

  async markRead(employeeId: string, key: string): Promise<void> {
    const { error } = await supabase
      .from('notification_reads')
      .upsert({ employee_id: employeeId, notif_key: key }, { onConflict: 'employee_id,notif_key' });
    if (error) throw new Error(describeError(error));
  },

  async markAllRead(employeeId: string, keys: string[]): Promise<void> {
    if (!keys.length) return;
    const { error } = await supabase
      .from('notification_reads')
      .upsert(keys.map(key => ({ employee_id: employeeId, notif_key: key })), { onConflict: 'employee_id,notif_key' });
    if (error) throw new Error(describeError(error));
  },
};
