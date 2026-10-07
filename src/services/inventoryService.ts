import { supabase } from '../lib/supabase';
import type {
  InventoryItemRow,
  PurchaseOrderItemRow,
  PurchaseOrderRow,
  StockMovementRow,
  SupplierRow,
} from '../types/database';
import type { InventoryItem, PurchaseOrder, StockMovement, Supplier } from '../types/models';
import { describeError, nextId, stockStatus, unwrap, today } from './helpers';

type ItemWithSupplier = InventoryItemRow & { suppliers: Pick<SupplierRow, 'name'> | null };
type PoWithItems = PurchaseOrderRow & { purchase_order_items: PurchaseOrderItemRow[] };

function toItem(row: ItemWithSupplier): InventoryItem {
  const qty = Number(row.current_qty) || 0;
  const reorder = Number(row.reorder_level) || 0;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currentQty: qty,
    reorderLevel: reorder,
    costPerUnit: Number(row.cost_per_unit) || Number(row.unit_price) || 0,
    unitPrice: Number(row.unit_price) || 0,
    supplier: row.supplier_id ?? '',
    supplierName: row.suppliers?.name ?? '',
    description: row.description ?? '',
    status: stockStatus(qty, reorder),
  };
}

function toMovement(row: StockMovementRow): StockMovement {
  return {
    id: String(row.id),
    date: row.datetime,
    itemId: row.inventory_item_id,
    item: row.item_name,
    type: row.type,
    qty: Number(row.quantity) || 0,
    unit: row.unit,
    prevStock: Number(row.prev_stock) || 0,
    newStock: Number(row.new_stock) || 0,
    supplierId: row.supplier_id ?? '',
    supplierName: row.supplier_name ?? '',
    poRef: row.po_ref ?? '',
    ref: row.reference ?? '',
    processedBy: row.processed_by ?? '',
    reason: row.reason ?? '',
  };
}

export interface StockInInput {
  supplierId: string;
  supplierName: string;
  poRef: string;
  ref: string;
  qty: number;
  unitCost: number;
  processedBy: string;
  reason?: string;
}

export interface StockOutInput {
  reason: string;
  qty: number;
  ref: string;
  processedBy: string;
}

export const inventoryService = {
  async listItems(): Promise<InventoryItem[]> {
    const rows = unwrap(
      await supabase.from('inventory_items').select('*, suppliers ( name )').order('id')
    ) as ItemWithSupplier[];
    return rows.map(toItem);
  },

  async listSuppliers(): Promise<Supplier[]> {
    const rows = unwrap(await supabase.from('suppliers').select('*').order('id')) as SupplierRow[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      contactPerson: r.contact_person ?? '',
      phone: r.phone ?? '',
      email: r.email ?? '',
      address: r.address ?? '',
      category: r.category ?? '',
      status: r.status,
    }));
  },

  async listMovements(): Promise<StockMovement[]> {
    const rows = unwrap(
      await supabase.from('stock_movements').select('*').order('datetime', { ascending: false }).limit(500)
    ) as StockMovementRow[];
    return rows.map(toMovement);
  },

  async listPurchaseOrders(): Promise<PurchaseOrder[]> {
    const rows = unwrap(
      await supabase.from('purchase_orders').select('*, purchase_order_items ( * )').order('date', { ascending: false })
    ) as PoWithItems[];
    return rows.map(row => ({
      id: row.id,
      date: row.date,
      expectedDelivery: row.expected_delivery ?? '',
      receivedDate: row.received_date ?? '',
      supplier: row.supplier_id ?? '',
      supplierName: row.supplier_name,
      requestedBy: row.requested_by ?? '',
      status: row.status,
      paymentStatus: row.payment_status,
      total: Number(row.total) || 0,
      notes: row.notes ?? '',
      items: (row.purchase_order_items ?? []).map(i => ({
        itemId: i.inventory_item_id ?? '',
        name: i.name,
        qty: Number(i.quantity) || 0,
        unit: i.unit,
        unitCost: Number(i.unit_cost) || 0,
        subtotal: Number(i.subtotal) || 0,
      })),
    }));
  },

  async createItem(input: Omit<InventoryItem, 'id' | 'status' | 'supplierName'>): Promise<InventoryItem> {
    const id = await nextId('inventory_items', 'INV-', 3);
    unwrap(
      await supabase
        .from('inventory_items')
        .insert({
          id,
          name: input.name,
          category: input.category,
          unit: input.unit,
          unit_price: input.unitPrice,
          cost_per_unit: input.costPerUnit,
          current_qty: input.currentQty,
          reorder_level: input.reorderLevel,
          supplier_id: input.supplier || null,
          description: input.description || null,
        })
        .select()
        .single()
    );
    return this.getItem(id);
  },

  async getItem(id: string): Promise<InventoryItem> {
    const row = unwrap(
      await supabase.from('inventory_items').select('*, suppliers ( name )').eq('id', id).single()
    ) as ItemWithSupplier;
    return toItem(row);
  },

  /** Adds stock and writes the matching audit row in one logical step. */
  async stockIn(itemId: string, input: StockInInput): Promise<InventoryItem> {
    const item = await this.getItem(itemId);
    const newQty = item.currentQty + input.qty;

    const { error } = await supabase
      .from('inventory_items')
      .update({ current_qty: newQty, cost_per_unit: input.unitCost || item.costPerUnit })
      .eq('id', itemId);
    if (error) throw new Error(describeError(error));

    await supabase.from('stock_movements').insert({
      inventory_item_id: itemId,
      item_name: item.name,
      type: 'stock_in',
      quantity: input.qty,
      unit: item.unit,
      prev_stock: item.currentQty,
      new_stock: newQty,
      supplier_id: input.supplierId || null,
      supplier_name: input.supplierName || null,
      po_ref: input.poRef || null,
      reference: input.poRef || input.ref || null,
      reason: input.reason || 'Purchase delivery',
      processed_by: input.processedBy,
    });

    return this.getItem(itemId);
  },

  async stockOut(itemId: string, input: StockOutInput): Promise<InventoryItem> {
    const item = await this.getItem(itemId);
    const newQty = Math.max(0, item.currentQty - input.qty);

    const { error } = await supabase.from('inventory_items').update({ current_qty: newQty }).eq('id', itemId);
    if (error) throw new Error(describeError(error));

    await supabase.from('stock_movements').insert({
      inventory_item_id: itemId,
      item_name: item.name,
      type: 'stock_out',
      quantity: input.qty,
      unit: item.unit,
      prev_stock: item.currentQty,
      new_stock: newQty,
      reference: input.ref || null,
      reason: input.reason,
      processed_by: input.processedBy,
    });

    return this.getItem(itemId);
  },

  async createSupplier(input: Omit<Supplier, 'id' | 'status'>): Promise<Supplier> {
    const id = await nextId('suppliers', 'SUP-', 3);
    unwrap(
      await supabase
        .from('suppliers')
        .insert({
          id,
          name: input.name,
          contact_person: input.contactPerson || null,
          phone: input.phone || null,
          email: input.email || null,
          address: input.address || null,
          category: input.category || null,
          status: 'active',
        })
        .select()
        .single()
    );
    const all = await this.listSuppliers();
    return all.find(s => s.id === id)!;
  },

  async updateSupplier(id: string, patch: Partial<Omit<Supplier, 'id'>>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.contactPerson !== undefined) update.contact_person = patch.contactPerson || null;
    if (patch.phone !== undefined) update.phone = patch.phone || null;
    if (patch.email !== undefined) update.email = patch.email || null;
    if (patch.address !== undefined) update.address = patch.address || null;
    if (patch.category !== undefined) update.category = patch.category || null;
    if (patch.status !== undefined) update.status = patch.status;

    const { error } = await supabase.from('suppliers').update(update).eq('id', id);
    if (error) throw new Error(describeError(error));
  },

  /**
   * Items and expenses reference suppliers, so the row is only removed when
   * nothing points at it; otherwise it is deactivated and kept for history.
   */
  async deleteSupplier(id: string): Promise<'deleted' | 'deactivated'> {
    const [{ count: itemCount }, { count: expenseCount }] = await Promise.all([
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('supplier_id', id),
      supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('supplier_id', id),
    ]);

    if ((itemCount ?? 0) > 0 || (expenseCount ?? 0) > 0) {
      await this.updateSupplier(id, { status: 'inactive' });
      return 'deactivated';
    }

    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw new Error(describeError(error));
    return 'deleted';
  },

  async createPurchaseOrder(input: {
    supplierId: string;
    supplierName: string;
    expectedDelivery: string;
    requestedBy: string;
    notes: string;
    items: { itemId: string; name: string; qty: number; unit: string; unitCost: number }[];
  }): Promise<PurchaseOrder> {
    const id = await nextId('purchase_orders', 'PO-');
    const total = input.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);

    const { error } = await supabase.from('purchase_orders').insert({
      id,
      supplier_id: input.supplierId || null,
      supplier_name: input.supplierName,
      date: today(),
      expected_delivery: input.expectedDelivery || null,
      status: 'pending',
      payment_status: 'unpaid',
      total,
      requested_by: input.requestedBy,
      notes: input.notes || null,
    });
    if (error) throw new Error(describeError(error));

    if (input.items.length) {
      await supabase.from('purchase_order_items').insert(
        input.items.map(i => ({
          purchase_order_id: id,
          inventory_item_id: i.itemId || null,
          name: i.name,
          quantity: i.qty,
          unit: i.unit,
          unit_cost: i.unitCost,
          subtotal: i.qty * i.unitCost,
        }))
      );
    }

    const orders = await this.listPurchaseOrders();
    return orders.find(o => o.id === id)!;
  },
};
