import React, { useState } from 'react';
import {
  PageHeader, Card, CardHeader, CardBody, Badge, Button,
  Table, Thead, Tbody, Th, Td, Tr, Modal, Input, Select,
  SearchBar, Tabs, useToast, KpiCard, Confirm, StatRow,
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { employees } from '../data/employees';
import { activityLogs } from '../data/activityLogs';
import { 
  Users, UserCheck, Shield, KeySquare, 
  Plus, Search, Eye, AlertCircle, ShieldAlert,
  CheckCircle2, XCircle, Activity, UserPlus
} from 'lucide-react';

import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; onNavigate: (p: PageId) => void; }

export default function UserManagementPage({ subPage, onNavigate }: Props) {
  if (subPage === 'roles') return <RolesPage />;
  if (subPage === 'activity-logs') return <ActivityLogsPage />;
  return <EmployeesPage onNavigate={onNavigate} />;
}

function EmployeesPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState<any>(null);
  const [confirmDeact, setConfirmDeact] = useState<any>(null);
  const toast = useToast();
  const [empList, setEmpList] = useState(employees);
  const [form, setForm] = useState({ name: '', role: 'staff', email: '', phone: '' });

  const filtered = empList.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name || !form.email) { toast.error('Name and email are required.'); return; }
    const newEmp = { id: `EMP-00${empList.length + 1}`, ...form, status: 'active', joined: '2026-09-29', lastLogin: 'Never' };
    setEmpList(p => [...p, newEmp as any]);
    toast.success('Employee account created successfully.');
    setShowAdd(false);
    setForm({ name: '', role: 'staff', email: '', phone: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage employee accounts, access levels, and credentials"
        actions={
          <Button onClick={() => setShowAdd(true)} icon={<UserPlus className="w-4 h-4" />}>
            Add Employee
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Employees" value={empList.length} mono icon={<Users className="w-5 h-5 text-blue-500" />} />
        <KpiCard title="Active Accounts" value={empList.filter(e=>e.status==='active').length} mono icon={<UserCheck className="w-5 h-5 text-green-500" />} />
        <KpiCard title="Administrators" value={empList.filter(e=>e.role==='admin').length} mono icon={<Shield className="w-5 h-5 text-purple-500" />} />
        <KpiCard title="Staff / Staffs" value={empList.filter(e=>e.role==='staff').length} mono icon={<KeySquare className="w-5 h-5 text-amber-500" />} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search employees by name or email…" className="w-full sm:w-80" />
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} employees</span>
          </div>
        </CardHeader>
        <div className="max-h-[400px] overflow-y-auto relative">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee Profile</Th>
                <Th>Role</Th>
                <Th>Contact Information</Th>
                <Th>Date Joined</Th>
                <Th>Last Login</Th>
                <Th>Status</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map(emp => (
                <Tr key={emp.id} onClick={() => setShowView(emp)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-inner">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{emp.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{emp.id}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge variant={emp.role === 'admin' ? 'admin' : 'staff'}>{emp.role === 'admin' ? 'Admin / Admin' : 'Staff / Staff'}</Badge></Td>
                  <Td>
                    <p className="text-sm font-medium text-slate-700">{emp.email}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{emp.phone}</p>
                  </Td>
                  <Td className="text-sm text-slate-600 font-medium">{fmt.date(emp.joined)}</Td>
                  <Td className="font-mono text-xs text-slate-500">{emp.lastLogin}</Td>
                  <Td><Badge variant={emp.status === 'active' ? 'active' : 'inactive'}>{emp.status.toUpperCase()}</Badge></Td>
                  <Td align="center">
                    <div className="flex gap-1 justify-center" onClick={e => e.stopPropagation()}>
                      <Button size="xs" variant="ghost" onClick={() => setShowView(emp)} icon={<Eye className="w-4 h-4"/>} title="View Profile" />
                      <Button size="xs" variant="ghost" className={emp.status === 'active' ? 'text-red-500 hover:bg-red-50 hover:text-red-600' : 'text-green-500 hover:bg-green-50 hover:text-green-600'} onClick={() => setConfirmDeact(emp)} icon={emp.status === 'active' ? <XCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4" />} title={emp.status === 'active' ? 'Deactivate' : 'Activate'} />
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </Card>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Employee Account" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" onClick={handleAdd}>Create Account</Button></>}>
        <div className="space-y-4">
          <Input label="Full Name *" placeholder="e.g. Maria Santos" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
          <Select label="System Role *" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
            options={[{ value: 'admin', label: 'Admin / Admin' }, { value: 'staff', label: 'Staff / Staff' }]} />
          <Input label="Email Address *" type="email" placeholder="employee@alms.ph" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
          <Input label="Phone Number" placeholder="09XXXXXXXXX" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
          
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex gap-3 items-start mt-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
            <p>A temporary password will be securely generated and sent to the employee's email. They will be required to change it on their first login.</p>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      {showView && (
        <Modal open={!!showView} onClose={() => setShowView(null)} title="Employee Profile" size="sm"
          footer={<Button variant="outline" className="w-full justify-center" onClick={() => setShowView(null)}>Close Profile</Button>}>
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-inner">
                {showView.name.charAt(0)}
              </div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">{showView.name}</h3>
              <Badge variant={showView.role === 'admin' ? 'admin' : 'staff'} className="mt-2">{showView.role === 'admin' ? 'Admin / Admin' : 'Staff / Staff'}</Badge>
            </div>
            <div className="space-y-3">
              <StatRow label="Employee ID" value={showView.id} mono />
              <StatRow label="Email" value={showView.email} />
              <StatRow label="Phone" value={showView.phone} />
              <StatRow label="Date Joined" value={fmt.date(showView.joined)} />
              <StatRow label="Last Login" value={showView.lastLogin} mono />
              <StatRow label="Status" value={<Badge variant={showView.status === 'active' ? 'active' : 'inactive'}>{showView.status.toUpperCase()}</Badge>} />
            </div>
          </div>
        </Modal>
      )}

      <Confirm
        open={!!confirmDeact} onClose={() => setConfirmDeact(null)}
        onConfirm={() => {
          setEmpList(p => p.map(e => e.id === confirmDeact.id ? {...e, status: e.status === 'active' ? 'inactive' : 'active'} : e));
          toast.success(`Account ${confirmDeact.status === 'active' ? 'deactivated' : 'activated'} successfully.`);
        }}
        title={confirmDeact?.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
        message={`Are you sure you want to ${confirmDeact?.status === 'active' ? 'deactivate' : 'activate'} ${confirmDeact?.name}'s account?`}
        confirmLabel={confirmDeact?.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
        danger={confirmDeact?.status === 'active'}
      />
    </div>
  );
}

function RolesPage() {
  const roles = [
    {
      name: 'Admin / Admin', count: 1,
      permissions: [
        'View Dashboard', 'User Management', 'Laundry Operations', 'Water Refilling',
        'Payment Management', 'Inventory Management', 'Finance Management',
        'Business Intelligence', 'Activity Logs', 'System Settings',
        'Add/Edit Employees', 'Create Purchase Orders', 'View Financial Reports',
        'Export Data', 'Process Refunds',
      ],
      restricted: [],
    },
    {
      name: 'Staff / Staff', count: 3,
      permissions: [
        'View Dashboard', 'Laundry Operations', 'Water Refilling',
        'Payment Management (Basic)', 'Inventory (View Only)',
        'Process Laundry Orders', 'Process Water Sales', 'Record Payments',
        'Send Pickup Notifications',
      ],
      restricted: [
        'User Management', 'Finance Reports', 'Business Intelligence',
        'Edit Inventory', 'Create Purchase Orders', 'System Settings',
        'View Activity Logs', 'Process Refunds',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Roles & Permissions" subtitle="Role-based access control and system authorization policies" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map(role => (
          <Card key={role.name} className="flex flex-col">
            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 tracking-tight">{role.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{role.count} employee(s) assigned to this role</p>
                </div>
                <Badge variant={role.name.includes('Admin') ? 'admin' : 'staff'}>{role.name.includes('Admin') ? 'Level 2' : 'Level 1'}</Badge>
              </div>
            </CardHeader>
            <CardBody className="flex-1">
              <div className="mb-5">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Allowed Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map(p => (
                    <span key={p} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-100 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              {role.restricted.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">Restricted Access</p>
                  <div className="flex flex-wrap gap-2">
                    {role.restricted.map(p => (
                      <span key={p} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-100 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
      
      <Card className="p-5 bg-amber-50 border border-amber-200 shadow-sm">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-amber-900">Role Configuration Lock</p>
            <p className="text-sm text-amber-800 mt-1">Role permissions are locked at the system level for compliance. Please contact the primary system administrator to request any modifications to the base policies.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  
  const filtered = activityLogs.filter(l =>
    l.employee.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.module.toLowerCase().includes(search.toLowerCase())
  );
  
  const moduleColors: Record<string, string> = {
    Laundry: 'bg-blue-100 text-blue-700 border-blue-200', 
    Payment: 'bg-green-100 text-green-700 border-green-200',
    'Water Refilling': 'bg-cyan-100 text-cyan-700 border-cyan-200', 
    Inventory: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Logs" subtitle="Immutable audit trail of all system actions and events" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search logs by user, action, or module…" className="w-full sm:w-96" />
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} log entries</span>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>Timestamp</Th>
              <Th>User</Th>
              <Th>Module</Th>
              <Th>Event Description</Th>
              <Th>IP Address</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(log => (
              <Tr key={log.id}>
                <Td className="font-mono text-xs font-medium text-slate-500">{log.datetime}</Td>
                <Td className="font-semibold text-slate-800">{log.employee}</Td>
                <Td>
                  <span className={`inline-flex items-center text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${moduleColors[log.module] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {log.module}
                  </span>
                </Td>
                <Td className="text-slate-700 text-sm">{log.action}</Td>
                <Td className="font-mono text-[11px] text-slate-400">{log.ip}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
