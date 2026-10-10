import { useState } from 'react';
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Table,
  Thead,
  Tbody,
  Th,
  Td,
  Tr,
  Modal,
  Input,
  Select,
  SearchBar,
  useToast,
  KpiCard,
  RowActions,
  ViewAction,
  EditAction,
  DeleteAction,
  Confirm,
  StatRow
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { matchesQuery } from '../utils/search';
import { useAsync } from '../hooks/useAsync';
import { employeeService } from '../services/employeeService';
import { activityService } from '../services/activityService';
import { Avatar } from '../components/Avatar';
import type { ActivityLog, Employee } from '../types/models';
import {
  Users,
  UserCheck,
  Shield,
  KeySquare,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  UserPlus
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
  const [showView, setShowView] = useState<Employee | null>(null);
  const [confirmDeact, setConfirmDeact] = useState<Employee | null>(null);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'staff', phone: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [form, setForm] = useState({ name: '', role: 'staff', email: '', phone: '' });

  const { data: rows, loading, error, reload } = useAsync(() => employeeService.list(), []);
  const empList: Employee[] = rows.map(r => ({
    id: r.id, name: r.name, role: r.role, email: r.email, phone: r.phone ?? '',
    status: r.status, joined: r.joined ?? '', lastLogin: r.last_login ?? '',
    avatarUrl: r.avatar_url, authUserId: r.auth_user_id,
  }));

  const filtered = empList.filter(e =>
    matchesQuery(search, e.id, e.name, e.email, e.phone, e.role, e.status, e.joined, e.lastLogin)
  );

  const handleAdd = async () => {
    if (!form.name || !form.email) { toast.error('Name and email are required.'); return; }
    setSaving(true);
    try {
      await employeeService.create({
        name: form.name.trim(),
        role: form.role as 'admin' | 'staff',
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      toast.success('Employee record created. Create their login in Supabase Auth with the same email.');
      setShowAdd(false);
      setForm({ name: '', role: 'staff', email: '', phone: '' });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the employee.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (emp: Employee) => {
    setEditForm({ name: emp.name, role: emp.role, phone: emp.phone });
    setEditEmp(emp);
  };

  const saveEdit = async () => {
    if (!editEmp) return;
    if (!editForm.name.trim()) { toast.error('Full name is required.'); return; }
    setSaving(true);
    try {
      await employeeService.update(editEmp.id, {
        name: editForm.name.trim(),
        role: editForm.role as 'admin' | 'staff',
        phone: editForm.phone.trim() || null,
      });
      toast.success('Employee updated.');
      setEditEmp(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    try {
      await employeeService.setStatus(emp.id, emp.status === 'active' ? 'inactive' : 'active');
      toast.success(`Account ${emp.status === 'active' ? 'deactivated' : 'activated'} successfully.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the account.');
    }
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
        <KpiCard title="Total Employees" value={empList.length} icon={<Users className="w-5 h-5 text-blue-500" />} />
        <KpiCard title="Active Accounts" value={empList.filter(e=>e.status==='active').length} icon={<UserCheck className="w-5 h-5 text-green-500" />} />
        <KpiCard title="Administrators" value={empList.filter(e=>e.role==='admin').length} icon={<Shield className="w-5 h-5 text-purple-500" />} />
        <KpiCard title="Staff Accounts" value={empList.filter(e=>e.role==='staff').length} icon={<KeySquare className="w-5 h-5 text-amber-500" />} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search ID, name, email, phone, role, status…" className="w-full sm:w-80" />
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} employees</span>
          </div>
        </CardHeader>
        <Table maxHeight={400}>
            <Thead>
              <Tr>
                <Th>Employee ID</Th>
                <Th>Employee Profile</Th>
                <Th>Role</Th>
                <Th>Email Address</Th>
                <Th>Contact Number</Th>
                <Th>Last Login</Th>
                <Th>Status</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={8} align="center"><span className="text-slate-500 py-6 block">Loading employees…</span></Td></Tr>
              ) : error ? (
                <Tr><Td colSpan={8} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
              ) : filtered.length === 0 ? (
                <Tr><Td colSpan={8} align="center"><span className="text-slate-500 py-6 block">No employees found.</span></Td></Tr>
              ) : filtered.map(emp => (
                <Tr key={emp.id} onClick={() => setShowView(emp)}>
                  <Td className="num text-xs font-semibold text-blue-600">{emp.id}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} src={emp.avatarUrl} size="sm" />
                      <span className="font-semibold text-slate-900">{emp.name}</span>
                    </div>
                  </Td>
                  <Td><Badge variant={emp.role === 'admin' ? 'admin' : 'staff'}>{emp.role === 'admin' ? 'Admin' : 'Staff'}</Badge></Td>
                  <Td className="text-sm text-slate-700">{emp.email}</Td>
                  <Td className="num text-sm text-slate-600">{emp.phone || '—'}</Td>
                  <Td className="num text-xs text-slate-500">{emp.lastLogin ? fmt.datetime(emp.lastLogin) : 'Never'}</Td>
                  <Td><Badge variant={emp.status === 'active' ? 'active' : 'inactive'}>{emp.status.toUpperCase()}</Badge></Td>
                  <Td align="center">
                    <RowActions>
                      <ViewAction onClick={() => setShowView(emp)} title="View profile" />
                      <EditAction onClick={() => openEdit(emp)} title="Edit employee" />
                      <DeleteAction onClick={() => setConfirmDeact(emp)} title={emp.status === 'active' ? 'Deactivate account' : 'Activate account'} />
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Tbody>
        </Table>
      </Card>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Employee Account" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleAdd}>Create Account</Button></>}>
        <div className="space-y-4">
          <Input label="Full Name *" placeholder="e.g. Maria Santos" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
          <Select label="System Role *" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
            options={[{ value: 'admin', label: 'Admin' }, { value: 'staff', label: 'Staff' }]} />
          <Input label="Email Address *" type="email" placeholder="employee@alms.ph" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
          <Input label="Phone Number" placeholder="09XXXXXXXXX" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
          
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex gap-3 items-start mt-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
            <p>This creates the employee record only. To give them a login, add a user with the same email in Supabase → Authentication → Users; the account links automatically.</p>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      {showView && (
        <Modal open={!!showView} onClose={() => setShowView(null)} title="Employee Profile" size="sm"
          footer={<Button variant="outline" className="w-full justify-center" onClick={() => setShowView(null)}>Close Profile</Button>}>
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="flex justify-center mb-3">
                <Avatar name={showView.name} src={showView.avatarUrl} size="md" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">{showView.name}</h3>
              <Badge variant={showView.role === 'admin' ? 'admin' : 'staff'} className="mt-2">{showView.role === 'admin' ? 'Admin' : 'Staff'}</Badge>
            </div>
            <div className="space-y-3">
              <StatRow label="Employee ID" value={showView.id} mono />
              <StatRow label="Email" value={showView.email} />
              <StatRow label="Phone" value={showView.phone} />
              <StatRow label="Date Joined" value={showView.joined ? fmt.date(showView.joined) : '—'} />
              <StatRow label="Last Login" value={showView.lastLogin ? fmt.datetime(showView.lastLogin) : 'Never'} mono />
              <StatRow label="Status" value={<Badge variant={showView.status === 'active' ? 'active' : 'inactive'}>{showView.status.toUpperCase()}</Badge>} />
            </div>
          </div>
        </Modal>
      )}

      <Modal
        open={!!editEmp}
        onClose={() => setEditEmp(null)}
        title={`Edit ${editEmp?.name ?? 'Employee'}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditEmp(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={saveEdit}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name *" value={editForm.name}
            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
          <Select label="System Role *" value={editForm.role}
            onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
            options={[{ value: 'admin', label: 'Admin' }, { value: 'staff', label: 'Staff' }]} />
          <Input label="Contact Number" value={editForm.phone}
            onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Email Address" value={editEmp?.email ?? ''} disabled />
          <p className="text-xs text-slate-400">
            The e-mail is the link to the Supabase Auth login and cannot be changed here.
          </p>
        </div>
      </Modal>

      <Confirm
        open={!!confirmDeact} onClose={() => setConfirmDeact(null)}
        onConfirm={() => { if (confirmDeact) void handleToggleStatus(confirmDeact); }}
        title={confirmDeact?.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
        message={`Are you sure you want to ${confirmDeact?.status === 'active' ? 'deactivate' : 'activate'} ${confirmDeact?.name}'s account?`}
        confirmLabel={confirmDeact?.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
        danger={confirmDeact?.status === 'active'}
      />
    </div>
  );
}

function RolesPage() {
  // Counts come from the live employee list, not fixed numbers, so they stay
  // correct as accounts are added, deactivated or removed.
  const { data: employees } = useAsync(() => employeeService.list(), []);
  const adminCount = employees.filter(e => e.role === 'admin').length;
  const staffCount = employees.filter(e => e.role === 'staff').length;

  const roles = [
    {
      name: 'Admin', count: adminCount,
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
      name: 'Staff', count: staffCount,
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
  const { data: logs, loading, error } = useAsync<ActivityLog[]>(() => activityService.list(), []);

  const filtered = logs.filter(l =>
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
        <Table maxHeight={500}>
          <Thead>
            <Tr>
              <Th>Timestamp</Th>
              <Th>User</Th>
              <Th>Module</Th>
              <Th>Event Description</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={4} align="center"><span className="text-slate-500 py-6 block">Loading activity…</span></Td></Tr>
            ) : error ? (
              <Tr><Td colSpan={4} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
            ) : filtered.length === 0 ? (
              <Tr><Td colSpan={4} align="center"><span className="text-slate-500 py-6 block">No activity recorded yet.</span></Td></Tr>
            ) : filtered.map(log => (
              <Tr key={log.id}>
                <Td className="font-mono text-xs font-medium text-slate-500">{fmt.datetime(log.datetime)}</Td>
                <Td className="font-semibold text-slate-800">{log.employee}</Td>
                <Td>
                  <span className={`inline-flex items-center text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${moduleColors[log.module] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {log.module}
                  </span>
                </Td>
                <Td className="text-slate-700 text-sm">{log.action}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
