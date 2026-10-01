export interface LaundryService {
  id: string;
  name: string;
  category: string;
  type: 'per_load' | 'per_kg' | 'per_item' | 'per_pair';
  price: number;
  unit: string;
}

export interface LaundryAddon {
  id: string;
  name: string;
  price: number;
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
  qty?: number;
  price: number;
  subtotal: number;
}

export interface LaundryOrder {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  email: string;
  date: string;
  status: 'pending' | 'in_progress' | 'ready' | 'released' | 'cancelled';
  services: LaundryOrderItem[];
  addons: LaundryOrderAddon[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  paymentMethod: 'cash' | 'gcash' | '';
  gcashRef: string;
  processedBy: string;
  notifStatus: 'pending' | 'sent' | 'failed';
  notes: string;
}

export const laundryServices: LaundryService[] = [
  { id: 'SVC-001', name: 'Clothes Wash (≤8kg)', category: 'Clothes', type: 'per_load', price: 50, unit: 'load' },
  { id: 'SVC-002', name: 'Clothes Dry (≤8kg)', category: 'Clothes', type: 'per_load', price: 60, unit: 'load' },
  { id: 'SVC-003', name: 'Beddings/Towels Wash+Dry (≤4kg)', category: 'Special Items', type: 'per_load', price: 160, unit: 'load' },
];

export const laundryAddons: LaundryAddon[] = [
  { id: 'ADD-001', name: 'Detergent (sachet)', price: 15 },
  { id: 'ADD-002', name: 'Fabric Softener', price: 15 },
  { id: 'ADD-003', name: 'Bleach', price: 20 },
  { id: 'ADD-004', name: 'Stain Remover', price: 25 },
  { id: 'ADD-005', name: 'Extra Rinse', price: 10 },
];

export const laundryOrders: LaundryOrder[] = [
  {
    id: 'LAU-0048', customerId: 'CUS-001', customerName: 'Rosario Buenaventura',
    phone: '09171112233', email: 'rosario.b@gmail.com',
    date: '2026-09-29 09:20', status: 'in_progress',
    services: [{ svcId: 'SVC-004', name: 'Wash, Dry & Fold', qty: 4.5, unit: 'kg', price: 120, subtotal: 540 }],
    addons: [{ id: 'ADD-002', name: 'Fabric Softener', qty: 1, price: 15, subtotal: 15 }],
    subtotal: 555, discount: 0, total: 555, paid: 0, change: 0,
    paymentStatus: 'unpaid', paymentMethod: '', gcashRef: '',
    processedBy: 'Juan dela Cruz', notifStatus: 'pending',
    notes: 'Handle with care — delicate fabrics',
  },
  {
    id: 'LAU-0047', customerId: 'CUS-002', customerName: 'Emmanuel Fernandez',
    phone: '09281112233', email: 'emman.f@yahoo.com',
    date: '2026-09-29 08:30', status: 'ready',
    services: [{ svcId: 'SVC-003', name: 'Full Service (Wash & Dry)', qty: 3, unit: 'kg', price: 85, subtotal: 255 }],
    addons: [{ id: 'ADD-001', name: 'Detergent (sachet)', qty: 2, price: 15, subtotal: 30 }],
    subtotal: 285, discount: 0, total: 285, paid: 285, change: 15,
    paymentStatus: 'paid', paymentMethod: 'cash', gcashRef: '',
    processedBy: 'Juan dela Cruz', notifStatus: 'sent',
    notes: '',
  },
  {
    id: 'LAU-0046', customerId: 'CUS-003', customerName: 'Ligaya Villanueva',
    phone: '09391112233', email: 'ligaya.v@gmail.com',
    date: '2026-09-28 14:10', status: 'released',
    services: [{ svcId: 'SVC-005', name: 'Bedsheets / Blankets', qty: 2, unit: 'item', price: 150, subtotal: 300 }],
    addons: [],
    subtotal: 300, discount: 0, total: 300, paid: 300, change: 0,
    paymentStatus: 'paid', paymentMethod: 'gcash', gcashRef: 'GCH-99115',
    processedBy: 'Ana Reyes', notifStatus: 'sent',
    notes: '',
  },
  {
    id: 'LAU-0045', customerId: 'CUS-004', customerName: 'Renato Castillo',
    phone: '09451112233', email: 'renato.c@gmail.com',
    date: '2026-09-28 11:00', status: 'pending',
    services: [{ svcId: 'SVC-007', name: 'Comforter / Duvet', qty: 1, unit: 'item', price: 350, subtotal: 350 }],
    addons: [{ id: 'ADD-004', name: 'Stain Remover', qty: 1, price: 25, subtotal: 25 }],
    subtotal: 375, discount: 25, total: 350, paid: 0, change: 0,
    paymentStatus: 'unpaid', paymentMethod: '', gcashRef: '',
    processedBy: 'Juan dela Cruz', notifStatus: 'pending',
    notes: 'Customer will pay on pickup',
  },
  {
    id: 'LAU-0044', customerId: 'CUS-005', customerName: 'Marites Ocampo',
    phone: '09171223344', email: 'marites.o@outlook.com',
    date: '2026-09-27 16:00', status: 'cancelled',
    services: [{ svcId: 'SVC-001', name: 'Self-Service Wash', qty: 2, unit: 'load', price: 55, subtotal: 110 }],
    addons: [],
    subtotal: 110, discount: 0, total: 110, paid: 0, change: 0,
    paymentStatus: 'unpaid', paymentMethod: '', gcashRef: '',
    processedBy: 'Ana Reyes', notifStatus: 'pending',
    notes: 'Customer cancelled — item not yet processed',
  },
  {
    id: 'LAU-0043', customerId: 'CUS-006', customerName: 'Danilo Soriano',
    phone: '09281223344', email: 'danilo.s@gmail.com',
    date: '2026-09-27 14:30', status: 'released',
    services: [{ svcId: 'SVC-008', name: 'Sneaker Cleaning', qty: 2, unit: 'pair', price: 250, subtotal: 500 }],
    addons: [],
    subtotal: 500, discount: 0, total: 500, paid: 500, change: 0,
    paymentStatus: 'paid', paymentMethod: 'gcash', gcashRef: 'GCH-99110',
    processedBy: 'Ana Reyes', notifStatus: 'sent',
    notes: '',
  },
];
