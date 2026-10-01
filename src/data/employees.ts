export interface Employee {
  id: string;
  name: string;
  role: 'admin' | 'staff';
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  joined: string;
  lastLogin: string;
}

export const employees: Employee[] = [
  { id: 'EMP-001', name: 'Aedzel Louis M. Sarmiento', role: 'admin', email: 'almswaterrefillingstation@gmail.com', phone: '0932-854-5660', status: 'active', joined: '2023-01-10', lastLogin: '2026-09-29 08:02' },
  { id: 'EMP-002', name: 'Maria Santos', role: 'staff', email: 'maria.santos@alms.ph', phone: '0928-123-4567', status: 'active', joined: '2024-03-15', lastLogin: '2026-09-29 08:15' },
  { id: 'EMP-003', name: 'Ana Reyes', role: 'staff', email: 'ana.reyes@alms.ph', phone: '0939-123-4567', status: 'active', joined: '2024-06-01', lastLogin: '2026-09-28 17:40' },
  { id: 'EMP-004', name: 'Pedro Garcia', role: 'staff', email: 'pedro.garcia@alms.ph', phone: '0945-123-4567', status: 'inactive', joined: '2024-02-20', lastLogin: '2026-09-10 09:00' },
];
