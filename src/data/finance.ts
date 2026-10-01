export const expenses = [
  { id: 'EXP-001', date: '2026-09-25', category: 'Inventory/Supplies', description: 'PO-0021 — Procter & Gamble Dist.', amount: 3655, method: 'cash', supplier: 'Procter & Gamble Dist.', ref: 'PO-0021', by: 'Maria Santos', notes: '' },
  { id: 'EXP-002', date: '2026-09-20', category: 'Inventory/Supplies', description: 'PO-0020 — AquaPure Supplies Co.', amount: 5500, method: 'bank', supplier: 'AquaPure Supplies Co.', ref: 'PO-0020', by: 'Maria Santos', notes: '' },
  { id: 'EXP-003', date: '2026-09-15', category: 'Utilities', description: 'Meralco Electric Bill — September 2026', amount: 8400, method: 'bank', supplier: 'Meralco', ref: 'MRL-09-2026', by: 'Maria Santos', notes: '' },
  { id: 'EXP-004', date: '2026-09-15', category: 'Utilities', description: 'MWSS Water Bill — September 2026', amount: 2200, method: 'bank', supplier: 'MWSS', ref: 'MWSS-09-2026', by: 'Maria Santos', notes: '' },
  { id: 'EXP-005', date: '2026-09-01', category: 'Rent', description: 'Monthly Rental — September 2026', amount: 15000, method: 'bank', supplier: 'Property Owner', ref: 'RENT-09-2026', by: 'Maria Santos', notes: '' },
  { id: 'EXP-006', date: '2026-09-01', category: 'Salaries/Wages', description: 'Staff Payroll — Sep 1–15', amount: 24000, method: 'bank', supplier: '', ref: 'PAY-SEP-01', by: 'Maria Santos', notes: '' },
  { id: 'EXP-007', date: '2026-09-10', category: 'Maintenance', description: 'Washing machine belt replacement', amount: 850, method: 'cash', supplier: 'FastFix Appliance', ref: '', by: 'Maria Santos', notes: '' },
  { id: 'EXP-008', date: '2026-09-18', category: 'Transportation', description: 'Delivery fuel reimbursement', amount: 500, method: 'cash', supplier: '', ref: '', by: 'Juan dela Cruz', notes: '' },
];

export const dailyRevenue = [
  { day: 'Mon', laundry: 4200, water: 1800, cashSales: 3600, gcashSales: 2400 },
  { day: 'Tue', laundry: 5100, water: 2200, cashSales: 4500, gcashSales: 2800 },
  { day: 'Wed', laundry: 4800, water: 2000, cashSales: 4100, gcashSales: 2700 },
  { day: 'Thu', laundry: 6500, water: 2800, cashSales: 5800, gcashSales: 3500 },
  { day: 'Fri', laundry: 7200, water: 3100, cashSales: 6400, gcashSales: 3900 },
  { day: 'Sat', laundry: 11800, water: 5200, cashSales: 10200, gcashSales: 6800 },
  { day: 'Sun', laundry: 8900, water: 3800, cashSales: 7500, gcashSales: 5200 },
];

export const monthlyRevenue = [
  { month: 'Jan', laundry: 42000, water: 21000, cashSales: 38000, gcashSales: 25000, expenses: 34500 },
  { month: 'Feb', laundry: 38000, water: 19000, cashSales: 34000, gcashSales: 23000, expenses: 31200 },
  { month: 'Mar', laundry: 51000, water: 24000, cashSales: 45000, gcashSales: 30000, expenses: 38400 },
  { month: 'Apr', laundry: 47000, water: 22000, cashSales: 41000, gcashSales: 28000, expenses: 36100 },
  { month: 'May', laundry: 55000, water: 26000, cashSales: 49000, gcashSales: 32000, expenses: 42300 },
  { month: 'Jun', laundry: 49000, water: 23000, cashSales: 44000, gcashSales: 28000, expenses: 38900 },
  { month: 'Jul', laundry: 58000, water: 28000, cashSales: 53000, gcashSales: 33000, expenses: 46000 },
  { month: 'Aug', laundry: 62000, water: 30000, cashSales: 56000, gcashSales: 36000, expenses: 49200 },
  { month: 'Sep', laundry: 48000, water: 27000, cashSales: 43000, gcashSales: 32000, expenses: 68105 },
];
