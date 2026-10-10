// Row shapes for the live Supabase schema (public). Verified against the running
// project, not generated — regenerate with the Supabase CLI if the schema changes.

export type UserRole = 'admin' | 'staff';
export type RecordStatus = 'active' | 'inactive';
export type LaundryStatus = 'pending' | 'in_progress' | 'ready' | 'released' | 'cancelled';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type PaymentMethod = 'cash' | 'gcash' | 'bank' | 'unpaid' | '';
export type StockMovementType = 'stock_in' | 'stock_out';

export interface EmployeeRow {
  id: string;
  auth_user_id: string | null;
  name: string;
  role: UserRole;
  email: string;
  phone: string | null;
  status: RecordStatus;
  joined: string | null;
  last_login: string | null;
  /** Added by the ALMS migration — base64 data URL or remote image URL. */
  avatar_url: string | null;
}

export interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface LaundryServiceRow {
  id: string;
  name: string;
  category: string;
  type: string;
  price: number;
  unit: string;
  /** Added by the ALMS migration. */
  description: string | null;
  is_active: boolean;
  /** Weight ceiling per load; null means no limit. */
  max_kg: number | null;
}

export interface LaundryAddonRow {
  id: string;
  name: string;
  price: number;
}

export interface LaundryOrderRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string | null;
  address: string | null;
  date: string;
  status: LaundryStatus;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  change_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  gcash_reference: string | null;
  processed_by: string | null;
  notes: string | null;
}

export interface LaundryOrderServiceRow {
  id: string;
  laundry_order_id: string;
  laundry_service_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface LaundryOrderAddonRow {
  id: string;
  laundry_order_id: string;
  laundry_addon_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface WaterProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  icon: string | null;
  stock: number | null;
  /** Added by the ALMS migration. */
  unit: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  track_stock: boolean;
  /** Refills count toward the tiered delivery fee; caps and bottles do not. */
  counts_for_delivery: boolean;
}

export interface WaterTransactionRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string | null;
  address: string | null;
  date: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  amount_paid: number;
  change_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  gcash_reference: string | null;
  delivery: boolean;
  delivery_address: string | null;
  processed_by: string | null;
  notes: string | null;
}

export interface WaterTransactionItemRow {
  id: string;
  transaction_id: string;
  water_product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PaymentRow {
  id: string;
  laundry_order_id: string | null;
  water_transaction_id: string | null;
  customer_id: string | null;
  amount: number;
  amount_received: number;
  change_amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  payment_date: string;
  gcash_reference: string | null;
  processed_by: string | null;
  /** Added by the ALMS migration. */
  customer_name: string | null;
  type: string | null;
  description: string | null;
  balance: number;
}

export interface InventoryItemRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  supplier_id: string | null;
  description: string | null;
  /** Added by the ALMS migration. */
  current_qty: number;
  reorder_level: number;
  cost_per_unit: number;
}

export interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  status: RecordStatus;
}

export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string;
  supplier_id: string | null;
  recorded_by: string | null;
  notes: string | null;
}

export interface ActivityLogRow {
  id: string;
  employee_id: string | null;
  action: string;
  module: string;
  datetime: string;
}

/** Added by the ALMS migration — the UI needs these but they were not in the DB. */
export interface PurchaseOrderRow {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  date: string;
  expected_delivery: string | null;
  received_date: string | null;
  status: 'pending' | 'received' | 'cancelled';
  payment_status: PaymentStatus;
  total: number;
  requested_by: string | null;
  notes: string | null;
}

export interface PurchaseOrderItemRow {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  subtotal: number;
}

export interface StockMovementRow {
  id: string;
  inventory_item_id: string;
  item_name: string;
  type: StockMovementType;
  quantity: number;
  unit: string;
  prev_stock: number;
  new_stock: number;
  supplier_id: string | null;
  supplier_name: string | null;
  po_ref: string | null;
  reference: string | null;
  reason: string | null;
  processed_by: string | null;
  datetime: string;
}
