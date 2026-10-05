export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQty: number;
  reorderLevel: number;
  costPerUnit: number;
  supplier: string;
  supplierName: string;
  status: 'normal' | 'low' | 'critical';
}

export interface StockMovement {
  id: string;
  date: string;
  itemId: string;
  item: string;
  type: 'stock_in' | 'stock_out';
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

export const suppliers = [
  { id: 'SUP-001', name: 'Procter & Gamble Dist.', contactPerson: 'Aldo Ramos', phone: '028001234', email: 'sales@pgdist.ph', address: 'Tondo, Manila', status: 'active', category: 'Laundry' },
  { id: 'SUP-002', name: 'AquaPure Supplies Co.', contactPerson: 'Gina Cruz', phone: '028005678', email: 'orders@aquapure.ph', address: 'Caloocan, MM', status: 'active', category: 'Water' },
  { id: 'SUP-003', name: 'Clorox PH Distributor', contactPerson: 'Ben Santos', phone: '028009012', email: 'clorox@phsupply.com', address: 'Pasay, MM', status: 'active', category: 'Laundry' },
  { id: 'SUP-004', name: 'General Supplies PH', contactPerson: 'Rica Lopez', phone: '028003456', email: 'info@generalsupplies.ph', address: 'Divisoria, Manila', status: 'active', category: 'Mixed' },
  { id: 'SUP-005', name: 'Office Depot PH', contactPerson: 'Tina Reyes', phone: '028007890', email: 'b2b@officedepot.ph', address: 'SM Mall of Asia, Pasay', status: 'active', category: 'Office' },
];

// Products: basic product catalog (no stock operations)
export const inventoryProducts = [
  { id: 'INV-001', name: 'Ariel Detergent Powder (1kg)', category: 'Laundry', unit: 'kg', unitPrice: 120, description: 'Heavy-duty detergent powder for commercial laundry use', supplier: 'SUP-001', supplierName: 'Procter & Gamble Dist.' },
  { id: 'INV-002', name: 'Downy Fabric Softener (900mL)', category: 'Laundry', unit: 'bottle', unitPrice: 165, description: 'Concentrated fabric softener, floral scent', supplier: 'SUP-001', supplierName: 'Procter & Gamble Dist.' },
  { id: 'INV-003', name: 'Clorox Bleach (3.785L)', category: 'Laundry', unit: 'jug', unitPrice: 280, description: 'Industrial-grade whitening bleach', supplier: 'SUP-003', supplierName: 'Clorox PH Distributor' },
  { id: 'INV-004', name: 'Mr. Clean Stain Remover', category: 'Laundry', unit: 'bottle', unitPrice: 95, description: 'Concentrated stain remover for stubborn stains', supplier: 'SUP-001', supplierName: 'Procter & Gamble Dist.' },
  { id: 'INV-005', name: '20L Purified Water Gallon (empty)', category: 'Water', unit: 'pcs', unitPrice: 250, description: 'Empty food-grade 20-liter gallon containers', supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.' },
  { id: 'INV-006', name: 'Gallon Cap (Universal)', category: 'Water', unit: 'pcs', unitPrice: 2.50, description: 'Standard universal gallon caps', supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.' },
  { id: 'INV-007', name: 'Tamper-Proof Seal Wrap', category: 'Water', unit: 'rolls', unitPrice: 180, description: 'Heat-shrink tamper-evident seal for gallon safety', supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.' },
  { id: 'INV-008', name: 'Laundry Mesh Bag (Large)', category: 'Accessories', unit: 'pcs', unitPrice: 85, description: 'Heavy-duty zipped mesh laundry bags', supplier: 'SUP-004', supplierName: 'General Supplies PH' },
  { id: 'INV-009', name: 'Receipt Rolls (57mm)', category: 'Office', unit: 'rolls', unitPrice: 35, description: 'Thermal paper receipt rolls for POS printer', supplier: 'SUP-005', supplierName: 'Office Depot PH' },
  { id: 'INV-010', name: 'Packaging Bag (Large)', category: 'Packaging', unit: 'pcs', unitPrice: 3, description: 'Clear plastic packaging bags for laundry', supplier: 'SUP-004', supplierName: 'General Supplies PH' },
];

// Stocks: product + current stock levels + reorder info
export const inventoryItems: InventoryItem[] = [
  { id: 'INV-001', name: 'Ariel Detergent Powder (1kg)', category: 'Laundry', unit: 'kg', currentQty: 15, reorderLevel: 10, costPerUnit: 120, supplier: 'SUP-001', supplierName: 'Procter & Gamble Dist.', status: 'normal' },
  { id: 'INV-002', name: 'Downy Fabric Softener (900mL)', category: 'Laundry', unit: 'bottle', currentQty: 8, reorderLevel: 10, costPerUnit: 165, supplier: 'SUP-001', supplierName: 'Procter & Gamble Dist.', status: 'low' },
  { id: 'INV-003', name: 'Clorox Bleach (3.785L)', category: 'Laundry', unit: 'jug', currentQty: 4, reorderLevel: 5, costPerUnit: 280, supplier: 'SUP-003', supplierName: 'Clorox PH Distributor', status: 'low' },
  { id: 'INV-004', name: 'Mr. Clean Stain Remover', category: 'Laundry', unit: 'bottle', currentQty: 12, reorderLevel: 8, costPerUnit: 95, supplier: 'SUP-001', supplierName: 'Procter & Gamble Dist.', status: 'normal' },
  { id: 'INV-005', name: '20L Purified Water Gallon (empty)', category: 'Water', unit: 'pcs', currentQty: 45, reorderLevel: 30, costPerUnit: 250, supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.', status: 'normal' },
  { id: 'INV-006', name: 'Gallon Cap (Universal)', category: 'Water', unit: 'pcs', currentQty: 200, reorderLevel: 100, costPerUnit: 2.50, supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.', status: 'normal' },
  { id: 'INV-007', name: 'Tamper-Proof Seal Wrap', category: 'Water', unit: 'rolls', currentQty: 3, reorderLevel: 5, costPerUnit: 180, supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.', status: 'critical' },
  { id: 'INV-008', name: 'Laundry Mesh Bag (Large)', category: 'Accessories', unit: 'pcs', currentQty: 20, reorderLevel: 10, costPerUnit: 85, supplier: 'SUP-004', supplierName: 'General Supplies PH', status: 'normal' },
  { id: 'INV-009', name: 'Receipt Rolls (57mm)', category: 'Office', unit: 'rolls', currentQty: 6, reorderLevel: 4, costPerUnit: 35, supplier: 'SUP-005', supplierName: 'Office Depot PH', status: 'normal' },
  { id: 'INV-010', name: 'Packaging Bag (Large)', category: 'Packaging', unit: 'pcs', currentQty: 150, reorderLevel: 100, costPerUnit: 3, supplier: 'SUP-004', supplierName: 'General Supplies PH', status: 'normal' },
];

export const purchaseOrders = [
  {
    id: 'PO-0021', date: '2026-09-25', expectedDelivery: '2026-09-27', supplier: 'SUP-001', supplierName: 'Procter & Gamble Dist.',
    requestedBy: 'Maria Santos', status: 'received', receivedDate: '2026-09-27', paymentStatus: 'paid',
    items: [
      { itemId: 'INV-001', name: 'Ariel Detergent Powder (1kg)', qty: 10, unit: 'kg', unitCost: 120, subtotal: 1200 },
      { itemId: 'INV-002', name: 'Downy Fabric Softener (900mL)', qty: 12, unit: 'bottle', unitCost: 165, subtotal: 1980 },
      { itemId: 'INV-004', name: 'Mr. Clean Stain Remover', qty: 5, unit: 'bottle', unitCost: 95, subtotal: 475 },
    ],
    total: 3655, notes: 'Monthly reorder',
  },
  {
    id: 'PO-0020', date: '2026-09-20', expectedDelivery: '2026-09-22', supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.',
    requestedBy: 'Maria Santos', status: 'received', receivedDate: '2026-09-22', paymentStatus: 'paid',
    items: [
      { itemId: 'INV-005', name: '20L Purified Water Gallon (empty)', qty: 20, unit: 'pcs', unitCost: 250, subtotal: 5000 },
      { itemId: 'INV-006', name: 'Gallon Cap (Universal)', qty: 200, unit: 'pcs', unitCost: 2.50, subtotal: 500 },
    ],
    total: 5500, notes: '',
  },
  {
    id: 'PO-0022', date: '2026-09-29', expectedDelivery: '2026-10-01', supplier: 'SUP-002', supplierName: 'AquaPure Supplies Co.',
    requestedBy: 'Maria Santos', status: 'pending', receivedDate: '', paymentStatus: 'unpaid',
    items: [
      { itemId: 'INV-007', name: 'Tamper-Proof Seal Wrap', qty: 5, unit: 'rolls', unitCost: 180, subtotal: 900 },
    ],
    total: 900, notes: 'Urgent — critical stock',
  },
];

export const stockMovements: StockMovement[] = [
  { id: 'SM-0045', date: '2026-09-27 10:30', itemId: 'INV-001', item: 'Ariel Detergent Powder (1kg)', type: 'stock_in', qty: 10, unit: 'kg', prevStock: 5, newStock: 15, supplierId: 'SUP-001', supplierName: 'Procter & Gamble Dist.', poRef: 'PO-0021', ref: 'PO-0021', processedBy: 'Maria Santos', reason: 'Purchase delivery' },
  { id: 'SM-0044', date: '2026-09-27 10:30', itemId: 'INV-002', item: 'Downy Fabric Softener (900mL)', type: 'stock_in', qty: 12, unit: 'bottle', prevStock: 8, newStock: 20, supplierId: 'SUP-001', supplierName: 'Procter & Gamble Dist.', poRef: 'PO-0021', ref: 'PO-0021', processedBy: 'Maria Santos', reason: 'Purchase delivery' },
  { id: 'SM-0043', date: '2026-09-29 09:25', itemId: 'INV-002', item: 'Downy Fabric Softener (900mL)', type: 'stock_out', qty: 12, unit: 'bottle', prevStock: 20, newStock: 8, supplierId: '', supplierName: '', poRef: '', ref: 'LAU-0048', processedBy: 'Juan dela Cruz', reason: 'Laundry Usage' },
  { id: 'SM-0042', date: '2026-09-29 09:25', itemId: 'INV-001', item: 'Ariel Detergent Powder (1kg)', type: 'stock_out', qty: 2, unit: 'kg', prevStock: 17, newStock: 15, supplierId: '', supplierName: '', poRef: '', ref: 'LAU-0048', processedBy: 'Juan dela Cruz', reason: 'Laundry Usage' },
  { id: 'SM-0041', date: '2026-09-27 16:25', itemId: 'INV-005', item: '20L Purified Water Gallon (empty)', type: 'stock_out', qty: 12, unit: 'pcs', prevStock: 57, newStock: 45, supplierId: '', supplierName: '', poRef: '', ref: 'WAT-TXN-0116', processedBy: 'Ana Reyes', reason: 'Water Refilling Usage' },
  { id: 'SM-0040', date: '2026-09-27 16:25', itemId: 'INV-007', item: 'Tamper-Proof Seal Wrap', type: 'stock_out', qty: 1, unit: 'rolls', prevStock: 4, newStock: 3, supplierId: '', supplierName: '', poRef: '', ref: 'WAT-TXN-0116', processedBy: 'Ana Reyes', reason: 'Water Refilling Usage' },
  { id: 'SM-0039', date: '2026-09-20 15:00', itemId: 'INV-005', item: '20L Purified Water Gallon (empty)', type: 'stock_in', qty: 20, unit: 'pcs', prevStock: 37, newStock: 57, supplierId: 'SUP-002', supplierName: 'AquaPure Supplies Co.', poRef: 'PO-0020', ref: 'PO-0020', processedBy: 'Maria Santos', reason: 'Purchase delivery' },
];
