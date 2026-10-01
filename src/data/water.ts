export const waterProducts = [
  { id: 'WAT-001', name: '20L Round/Slim Gallon (Refill)', category: 'Gallon', price: 25, icon: '🛢️', stock: 999 },
  { id: 'WAT-002', name: '10L Gallon (Refill)', category: 'Gallon', price: 15, icon: '💧', stock: 999 },
  { id: 'WAT-003', name: '4L Gallon (Refill)', category: 'Gallon', price: 10, icon: '💧', stock: 999 },
  { id: 'WAT-004', name: 'Gallon Cap (Replacement)', category: 'Cap', price: 5, icon: '🔵', stock: 500 },
  { id: 'WAT-005', name: '500mL Bottled Water', category: 'Bottled', price: 20, icon: '🍶', stock: 120 },
  { id: 'WAT-006', name: 'Mineral Water 1L', category: 'Bottled', price: 35, icon: '🍶', stock: 75 },
];

export const waterSales = [
  { id: 'WAT-TXN-0120', date: '2026-09-29 09:14', customerName: 'Walk-in', phone: '', address: '', items: [{ id:'WAT-001', name: '20L Round/Slim Gallon (Refill)', qty: 3, price: 25, subtotal: 75 }], subtotal: 75, deliveryFee: 0, discount: 0, total: 75, amtPaid: 100, change: 25, paymentMethod: 'cash', gcashRef: '', paymentStatus: 'paid', delivery: false, deliveryAddress: '', notes: '', processedBy: 'Juan dela Cruz' },
  { id: 'WAT-TXN-0119', date: '2026-09-29 08:55', customerName: 'Renato Castillo', phone: '09451112233', address: '5 Kalayaan Blvd, Makati', items: [{ id:'WAT-001', name: '20L Round/Slim Gallon (Refill)', qty: 5, price: 25, subtotal: 125 }], subtotal: 125, deliveryFee: 170, discount: 0, total: 295, amtPaid: 295, change: 0, paymentMethod: 'gcash', gcashRef: 'GCH-99120', paymentStatus: 'paid', delivery: true, deliveryAddress: '5 Kalayaan Blvd, Makati', notes: 'Deliver before noon', processedBy: 'Juan dela Cruz' },
];
