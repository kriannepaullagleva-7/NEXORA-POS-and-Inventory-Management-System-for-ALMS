import { useState } from 'react';
import { matchesQuery } from '../utils/search';
import { today } from '../services/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
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
  ExportDialog,
  Input,
  Select,
  Textarea,
  SearchBar,
  useToast,
  KpiCard
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { exportReportPdf } from '../utils/pdf';
import { useAsync } from '../hooks/useAsync';
import { reportService } from '../services/reportService';
import { financeService } from '../services/financeService';
import { inventoryService } from '../services/inventoryService';
import { activityService } from '../services/activityService';
import { useAuth } from '../context/AuthContext';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  Activity,
  Plus,
  Download,
  Printer
} from 'lucide-react';

import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; }

export default function FinancePage({ subPage }: Props) {
  if (subPage === 'finance-expenses') return <ExpensesPage />;
  if (subPage === 'finance-reports') return <FinancialReportsPage />;
  return <FinanceDashboard />;
}

function FinanceDashboard() {
  const { data: monthlyRevenue } = useAsync(() => reportService.monthlyRevenue(), []);
  const { data: expenses } = useAsync(() => financeService.listExpenses(), []);
  const [dateRange, setDateRange] = useState<'month'|'quarter'|'ytd'>('ytd');

  const sliceMap = { month: 1, quarter: 3, ytd: 9 };
  const data = monthlyRevenue.slice(-sliceMap[dateRange]);

  const totalCashSales   = data.reduce((s, m) => s + m.cashSales, 0);
  const totalGcashSales  = data.reduce((s, m) => s + m.gcashSales, 0);
  const totalRevenue     = totalCashSales + totalGcashSales;
  const totalExpenses    = data.reduce((s, m) => s + m.expenses, 0);
  const netRevenue       = totalRevenue - totalExpenses;

  const expByCategory = Object.entries(
    expenses.reduce((acc: Record<string, number>, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const expByCashMethod = expenses.filter(e => e.method === 'cash').reduce((s, e) => s + e.amount, 0);
  const expByBankMethod = expenses.filter(e => e.method === 'bank').reduce((s, e) => s + e.amount, 0);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
  const dateLabels = { month: 'This Month', quarter: 'Last 3 Months', ytd: `Year to date ${new Date().getFullYear()}` };

  return (
    <div className="space-y-6">
      <PageHeader title="Finance Overview" subtitle="Revenue, expenses, and financial summary"
        actions={
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['month','quarter','ytd'] as const).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dateRange===r ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
                {r === 'month' ? 'Month' : r === 'quarter' ? 'Quarter' : 'YTD'}
              </button>
            ))}
          </div>
        } />

      {/* 6-card KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Revenue" value={fmt.peso(totalRevenue)} subtext={dateLabels[dateRange]}
          icon={<Banknote className="w-5 h-5 text-slate-500" />} />
        <KpiCard title="Cash Sales" value={fmt.peso(totalCashSales)}
          icon={<Banknote className="w-5 h-5 text-green-500" />} />
        <KpiCard title="GCash Sales" value={fmt.peso(totalGcashSales)}
          icon={<Wallet className="w-5 h-5 text-blue-500" />} />
        <KpiCard title="Total Expenses" value={fmt.peso(totalExpenses)} trend={{ value: 'vs revenue', up: false }}
          icon={<TrendingDown className="w-5 h-5 text-red-500" />} />
        <KpiCard title="Net Revenue" value={fmt.peso(netRevenue)} trend={{ value: netRevenue >= 0 ? 'Profitable' : 'Loss', up: netRevenue >= 0 }}
          icon={<TrendingUp className={`w-5 h-5 ${netRevenue >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />} />
        <KpiCard title="Margin %" value={`${totalRevenue > 0 ? (netRevenue/totalRevenue*100).toFixed(1) : 0}%`} 
          icon={<Activity className="w-5 h-5 text-slate-400" />} />
      </div>

      {/* Cash vs GCash bar chart + Expense pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">Revenue by Payment Method</h3>
                <p className="text-xs text-slate-500 mt-0.5">Cash vs GCash per month · {dateLabels[dateRange]}</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500 inline-block" />Cash</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />GCash</span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="flex-1 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} barSize={24} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={45} dx={-10} />
                <Tooltip isAnimationActive={false} formatter={(v: any) => fmt.peso(v)} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: 12 }} />
                <Bar dataKey="cashSales" name="Cash" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="gcashSales" name="GCash" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <h3 className="font-semibold text-slate-900 tracking-tight">Expense Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">September 2026</p>
          </CardHeader>
          <CardBody className="flex-1">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={expByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                  {expByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip isAnimationActive={false} formatter={(v: any) => fmt.peso(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {expByCategory.map((e, i) => (
                <div key={e.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 font-medium truncate max-w-30">{e.name}</span>
                  </div>
                  <span className="font-mono text-slate-900 font-bold">{fmt.peso(e.value)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Revenue vs Expenses line chart + method breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-slate-900 tracking-tight">Revenue vs Expenses Trend</h3>
            <p className="text-xs text-slate-500 mt-0.5">{dateLabels[dateRange]}</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={45} dx={-10} />
                <Tooltip isAnimationActive={false} formatter={(v: any, n: any) => [fmt.peso(v), n === 'rev' ? 'Total Revenue' : 'Expenses']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                <Area type="monotone" dataKey={d => d.cashSales + d.gcashSales} name="rev" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="expenses" name="exp" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900 tracking-tight">Payment Method Breakdown</h3></CardHeader>
          <CardBody>
            <div className="space-y-5">
              {[
                { label: 'Cash Sales', val: totalCashSales, color: '#22c55e', bg: 'bg-green-100', icon: <Banknote className="w-4 h-4 text-green-600" /> },
                { label: 'GCash Sales', val: totalGcashSales, color: '#3b82f6', bg: 'bg-blue-100', icon: <Wallet className="w-4 h-4 text-blue-600" /> },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-2 items-center">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">{item.icon} {item.label}</span>
                    <span className="font-mono font-bold text-slate-900">{fmt.peso(item.val)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${totalRevenue > 0 ? (item.val/totalRevenue*100).toFixed(0) : 0}%`, background: item.color }} />
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 mt-1.5">{totalRevenue > 0 ? (item.val/totalRevenue*100).toFixed(1) : 0}% of total revenue</p>
                </div>
              ))}
              
              <div className="pt-4 mt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Expenses by Method</p>
                <div className="space-y-2">
                  {[
                    { label: 'Cash Expenses', val: expByCashMethod, color: 'text-green-700', icon: <Banknote className="w-3.5 h-3.5 text-green-600" /> },
                    { label: 'Bank Transfer', val: expByBankMethod, color: 'text-slate-700', icon: <Wallet className="w-3.5 h-3.5 text-slate-500" /> },
                  ].map(e => (
                    <div key={e.label} className="flex justify-between text-sm py-1 items-center">
                      <span className="flex items-center gap-2 text-slate-600 font-medium">{e.icon} {e.label}</span>
                      <span className={`font-mono font-bold ${e.color}`}>{fmt.peso(e.val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ExpensesPage() {
  const { data: expenses, loading, error, reload } = useAsync(() => financeService.listExpenses(), []);
  const { data: suppliers } = useAsync(() => inventoryService.listSuppliers(), []);
  const { employee } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    category: '', description: '', amount: '', date: today(),
    method: 'cash', supplierId: '', notes: '',
  });
  const toast = useToast();

  const filtered = expenses.filter(e =>
    matchesQuery(search, e.id, e.date, e.category, e.description, e.amount, e.method, e.supplier, e.by, e.notes)
  );
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const handleAdd = async () => {
    if (!form.category) { toast.error('Select an expense category.'); return; }
    if (!form.description.trim()) { toast.error('Enter a description.'); return; }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return; }

    setSaving(true);
    try {
      await financeService.createExpense({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount,
        method: form.method,
        supplierId: form.supplierId || null,
        recordedBy: employee?.name ?? '',
        notes: form.notes.trim(),
      });
      await activityService.log(employee?.id ?? null, 'Finance', `Recorded ${form.category} expense of ${fmt.peso(amount)}`);
      toast.success('Expense recorded successfully.');
      setShowAdd(false);
      setForm({ category: '', description: '', amount: '', date: today(), method: 'cash', supplierId: '', notes: '' });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Management" subtitle="Record, track, and categorize business expenses"
        actions={<Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Add Expense</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Expenses" value={fmt.peso(expenses.reduce((s: number, e: any)=>s+e.amount,0))} icon={<TrendingDown className="w-5 h-5 text-red-500" />} />
        {['Inventory Purchase','Utilities','Rent'].map(cat => (
          <KpiCard key={cat} title={cat} value={fmt.peso(expenses.filter((e: any) => e.category === cat).reduce((s: number, e: any)=>s+e.amount,0))} icon={<Receipt className="w-5 h-5 text-slate-400" />} />
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <SearchBar value={search} onChange={setSearch} placeholder="Search expenses by ID, date, category, description, amount, method or staff…" className="w-full sm:w-80" />
            <div className="text-right ml-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Filtered Total</p>
              <p className="font-mono text-lg font-bold text-slate-900">{fmt.peso(total)}</p>
            </div>
          </div>
        </CardHeader>
        <Table maxHeight={400}>
            <Thead>
              <Tr>
                <Th>Expense ID</Th>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Method</Th>
                <Th align="right">Amount</Th>
                <Th>Recorded By</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={7} align="center"><span className="text-slate-500 py-6 block">Loading expenses…</span></Td></Tr>
              ) : error ? (
                <Tr><Td colSpan={7} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
              ) : filtered.length === 0 ? (
                <Tr><Td colSpan={7} align="center"><span className="text-slate-500 py-6 block">No expenses recorded yet.</span></Td></Tr>
              ) : filtered.map((exp: any) => (
                <Tr key={exp.id}>
                  <Td className="font-mono text-xs font-bold text-blue-600">{exp.id}</Td>
                  <Td className="text-sm font-medium text-slate-600">{fmt.date(exp.date)}</Td>
                  <Td><Badge variant="gray">{exp.category}</Badge></Td>
                  <Td className="font-medium text-slate-800">{exp.description}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 uppercase">
                      {exp.method === 'cash' ? <Banknote className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                      {exp.method}
                    </span>
                  </Td>
                  <Td align="right" className="font-mono font-bold text-red-600">{fmt.peso(exp.amount)}</Td>
                  <Td className="text-xs font-medium text-slate-500">{exp.by}</Td>
                </Tr>
              ))}
            </Tbody>
        </Table>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record New Expense" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleAdd}>Save Expense</Button></>}>
        <div className="space-y-4">
          <Select label="Expense Category *" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            options={[{value:'',label:'Select...'},{value:'Inventory/Supplies',label:'Inventory / Supplies'},{value:'Utilities',label:'Utilities'},{value:'Rent',label:'Rent'},{value:'Salaries',label:'Salaries'},{value:'Maintenance',label:'Maintenance'},{value:'Other',label:'Other'}]} />
          <Input label="Description *" placeholder="Brief description of expense" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Amount (₱) *" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            <Input label="Date *" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Payment Method *" value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}
              options={[{value:'cash',label:'Cash'},{value:'bank',label:'Bank Transfer'},{value:'gcash',label:'GCash'}]} />
            <Select label="Supplier (Optional)" value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}
              options={[{ value: '', label: 'None' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
          </div>
          <Textarea label="Notes / Reference (Optional)" rows={2} placeholder="Invoice numbers, additional details…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

function FinancialReportsPage() {
  const { data: monthlyRevenue, loading } = useAsync(() => reportService.monthlyRevenue(), []);
  const { data: expenses } = useAsync(() => financeService.listExpenses(), []);
  const [exportMode, setExportMode] = useState<'export' | 'print' | null>(null);
  const toast = useToast();
  const totalRev = monthlyRevenue.reduce((s: number, m: any)=>s+m.laundry+m.water,0);
  const totalExp = expenses.reduce((s: number, e: any)=>s+e.amount,0);
  const laundryRev = monthlyRevenue.reduce((s: number, m: any) => s + m.laundry, 0);
  const waterRev = monthlyRevenue.reduce((s: number, m: any) => s + m.water, 0);

  const handleExportConfirm = () => {
    exportReportPdf({
      reportTitle: 'Financial Reports — Monthly P&L Statement',
      action: exportMode === 'print' ? 'print' : 'save',
      columns: ['Period', 'Laundry Rev.', 'Water Rev.', 'Total Revenue', 'Est. Expenses', 'Net Income', 'Profit Margin'],
      rows: monthlyRevenue.map((m: any) => {
        const rev = m.laundry + m.water;
        const exp = m.expenses || 0;
        const net = rev - exp;
        const margin = rev > 0 ? `${((net / rev) * 100).toFixed(1)}%` : '0.0%';
        return [`${m.month} 2026`, fmt.peso(m.laundry), fmt.peso(m.water), fmt.peso(rev), fmt.peso(exp), fmt.peso(net), margin];
      }),
      fileName: 'ALMS_Financial_Report.pdf',
    });
    toast.success(exportMode === 'print' ? 'Report ready to print.' : 'Financial report exported.');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" subtitle="Comprehensive financial summaries, statements, and analysis"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportMode('export')} icon={<Download className="w-4 h-4" />}>Export PDF</Button>
            <Button variant="outline" onClick={() => setExportMode('print')} icon={<Printer className="w-4 h-4" />}>Print</Button>
          </div>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader><h3 className="font-semibold text-slate-900 tracking-tight">Revenue vs Expenses — Monthly</h3></CardHeader>
          <CardBody className="flex-1 pt-2 min-h-80">
            <ResponsiveContainer width="100%" height="100%" minHeight={280}>
              <BarChart data={monthlyRevenue.map(m => ({ ...m, total: m.laundry + m.water, expense: m.expenses }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={45} dx={-10} />
                <Tooltip isAnimationActive={false} formatter={(v: any) => fmt.peso(v)} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} iconType="circle" />
                <Bar dataKey="total" name="Gross Revenue" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="Total Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="bg-slate-900 text-white pb-4 rounded-t-[14px]">
            <h3 className="font-bold tracking-tight text-base">Financial Summary</h3>
            <p className="text-xs text-slate-400 mt-1">September 2026</p>
          </CardHeader>
          <CardBody className="bg-slate-50 flex-1">
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-green-100 shadow-sm">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Total Revenue</p>
                <p className="text-2xl font-bold text-green-700 font-mono tracking-tight">{fmt.peso(totalRev)}</p>
                <div className="mt-3 pt-3 border-t border-green-50 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">Laundry Sales</span><span className="font-mono font-bold text-slate-800">{fmt.peso(laundryRev)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">Water Sales</span><span className="font-mono font-bold text-slate-800">{fmt.peso(waterRev)}</span></div>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> Total Expenses</p>
                <p className="text-2xl font-bold text-red-700 font-mono tracking-tight">{fmt.peso(totalExp)}</p>
                <div className="mt-3 pt-3 border-t border-red-50 space-y-2">
                  {Object.entries(
                    expenses.reduce((acc: Record<string, number>, e: any) => {
                      acc[e.category] = (acc[e.category] || 0) + e.amount;
                      return acc;
                    }, {})
                  ).slice(0, 5).map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">{category}</span>
                      <span className="font-mono font-bold text-slate-800">{fmt.peso(amount as number)}</span>
                    </div>
                  ))}
                  {expenses.length === 0 && <p className="text-xs text-slate-400">No expenses recorded yet.</p>}
                </div>
              </div>
              
              <div className="p-4 bg-slate-900 rounded-xl shadow-md mt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Income (Profit)</p>
                <p className="text-2xl font-bold text-white font-mono tracking-tight">{fmt.peso(totalRev - totalExp)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><h3 className="font-semibold text-slate-900 tracking-tight">Monthly P&L Statement (Year-to-Date)</h3></CardHeader>
        <Table maxHeight={400}>
          <Thead>
            <Tr>
              <Th>Period</Th>
              <Th align="right">Laundry Rev.</Th>
              <Th align="right">Water Rev.</Th>
              <Th align="right">Total Revenue</Th>
              <Th align="right">Est. Expenses</Th>
              <Th align="right">Net Income</Th>
              <Th align="right">Profit Margin</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={7} align="center"><span className="text-slate-500 py-6 block">Loading report…</span></Td></Tr>
            ) : monthlyRevenue.length === 0 ? (
              <Tr><Td colSpan={7} align="center"><span className="text-slate-500 py-6 block">No revenue recorded yet.</span></Td></Tr>
            ) : monthlyRevenue.map((m: any) => {
              const rev = m.laundry + m.water;
              const exp = m.expenses || 0;
              const net = rev - exp;
              const margin = ((net/rev)*100).toFixed(1);
              return (
                <Tr key={m.month}>
                  <Td className="font-bold text-slate-900">{m.month} 2026</Td>
                  <Td align="right" className="font-mono text-slate-700 font-medium">{fmt.peso(m.laundry)}</Td>
                  <Td align="right" className="font-mono text-slate-600 font-medium">{fmt.peso(m.water)}</Td>
                  <Td align="right" className="font-mono font-bold text-green-700">{fmt.peso(rev)}</Td>
                  <Td align="right" className="font-mono font-bold text-red-600">{fmt.peso(exp)}</Td>
                  <Td align="right" className="font-mono font-bold text-slate-900 text-base tracking-tight">{fmt.peso(net)}</Td>
                  <Td align="right">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold ${parseFloat(margin) > 40 ? 'bg-green-100 text-green-700' : parseFloat(margin) > 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {margin}%
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>

      <ExportDialog
        open={exportMode !== null}
        onClose={() => setExportMode(null)}
        onConfirm={handleExportConfirm}
        title={exportMode === 'print' ? 'Print Report?' : 'Export Report?'}
        reportTitle="Monthly P&L Statement"
        rowCount={monthlyRevenue.length}
        confirmLabel={exportMode === 'print' ? 'Print' : 'Export PDF'}
      />
    </div>
  );
}
