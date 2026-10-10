// UI-facing models. Services map Supabase rows (snake_case) into these so the
// pages keep working with the shapes they were already written against.

import type { LaundryStatus, PaymentMethod, PaymentStatus, StockMovementType, UserRole } from './database';

export type { LaundryStatus, PaymentMethod, PaymentStatus, StockMovementType, UserRole };

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  joined: string;
  lastLogin: string;
  avatarUrl: string | null;
  authUserId: string | null;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

export interface LaundryOrderItem {
  svcId: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface LaundryOrderAddon {
  id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface LaundryOrder {
  id: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  date: string;
  status: LaundryStatus;
  services: LaundryOrderItem[];
  addons: LaundryOrderAddon[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  gcashRef: string;
  processedBy: string;
  notes: string;
}

export interface WaterSaleItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface WaterSale {
  id: string;
  date: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  address: string;
  items: WaterSaleItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  amtPaid: number;
  change: number;
  paymentMethod: PaymentMethod;
  gcashRef: string;
  paymentStatus: PaymentStatus;
  delivery: boolean;
  deliveryAddress: string;
  notes: string;
  processedBy: string;
}

export interface Payment {
  id: string;
  date: string;
  linkedTo: string;
  type: string;
  customerId: string | null;
  customerName: string;
  description: string;
  amount: number;
  amtReceived: number;
  change: number;
  balance: number;
  method: PaymentMethod;
  gcashRef: string;
  status: PaymentStatus;
  processedBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  status: 'active' | 'inactive';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQty: number;
  reorderLevel: number;
  costPerUnit: number;
  unitPrice: number;
  supplier: string;
  supplierName: string;
  description: string;
  status: 'normal' | 'low' | 'critical';
}

export interface StockMovement {
  id: string;
  date: string;
  itemId: string;
  item: string;
  type: StockMovementType;
  qty: number;
  unit: string;
  prevStock: number;
  newStock: number;
  supplierId: string;
  supplierName: string;
  poRef: string;
  ref: string;
  processedBy: string;
  reason: string;
}

export interface PurchaseOrderItem {
  itemId: string;
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  expectedDelivery: string;
  receivedDate: string;
  supplier: string;
  supplierName: string;
  requestedBy: string;
  status: 'pending' | 'received' | 'cancelled';
  paymentStatus: PaymentStatus;
  items: PurchaseOrderItem[];
  total: number;
  notes: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string;
  supplier: string;
  by: string;
  notes: string;
}

export interface ActivityLog {
  id: number;
  datetime: string;
  employee: string;
  action: string;
  module: string;
}

export interface LaundryAddon {
  id: string;
  name: string;
  price: number;
}

