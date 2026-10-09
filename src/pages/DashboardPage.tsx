import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardBody, Badge, Button, KpiCard, Table, Thead, Tbody, Th, Td, Tr, ChartTooltip } from '../components/ui';
import { fmt } from '../utils/formatters';
import { useAsync } from '../hooks/useAsync';
import { useState } from 'react';
import { reportService, type Period, type PeriodSummary } from '../services/reportService';
import { laundryService } from '../services/laundryService';
import {
  Banknote, CreditCard, Receipt, Waves, Droplet,
  Search, PackagePlus, PackageMinus,
  FileText, ShoppingCart, BellRing
} from 'lucide-react';
import type { PageId } from '../components/Layout';

interface Props { onNavigate: (p: PageId) => void; userRole: 'admin' | 'staff'; }

export default function DashboardPage({ onNavigate, userRole }: Props) {
  // The headline figures follow this filter; the lists below stay on today,
  // because they are what the counter staff act on right now.
  const [period, setPeriod] = useState<Period>('daily');

  const { data: summary, loading: summaryLoading } = useAsync<PeriodSummary>(
    () => reportService.summary(period),
    {
      label: 'Today', from: '', to: '',
      laundryRevenue: 0, waterRevenue: 0, totalRevenue: 0,
      laundryCount: 0, waterCount: 0, totalTransactions: 0,
      cash: 0, gcash: 0, expenses: 0, netRevenue: 0, averageTicket: 0, outstanding: 0,
    },
    [period]
  );

  const { data: snapshot, loading: snapshotLoading } = useAsync(
    () => reportService.todaySnapshot(),
    { laundryOrders: [], waterSales: [], cash: 0, gcash: 0, paymentCount: 0 }
  );
  const { data: dailyRevenue } = useAsync(() => reportService.dailyRevenue(), []);
  const { data: allOrders } = useAsync(() => laundryService.listOrders(), []);

  const todayLaundry = snapshot.laundryOrders as any[];
  const todayWater = snapshot.waterSales as any[];

  const periodCash = summary.cash;
  const periodGCash = summary.gcash;
  const periodCollected = periodCash + periodGCash;
  const readyOrders = allOrders.filter(o => o.status === 'ready');
  const readyCount = readyOrders.length;

  const recentTransactions = [
    ...todayLaundry.map(o => ({
      id: o.id, type: 'Laundry', customer: o.customer_name,
      amount: Number(o.total) || 0, method: o.payment_method || 'unpaid',
      status: o.payment_status, employee: o.processed_by, date: o.date,
    })),
    ...todayWater.map(s => ({
      id: s.id, type: 'Water', customer: s.customer_name,
      amount: Number(s.total) || 0, method: s.payment_method,
      status: s.payment_status, employee: s.processed_by, date: s.date,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const quickActions = [
    { label: 'New Laundry', page: 'laundry-new' as PageId, icon: <Waves className="w-4 h-4" /> },
    { label: 'New Water Sale', page: 'water-new' as PageId, icon: <Droplet className="w-4 h-4" /> },
    { label: 'Record Payment', page: 'payments-new' as PageId, icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Order Tracker', page: 'laundry-orders' as PageId, icon: <Search className="w-4 h-4" /> },
    { label: 'Stock In', page: 'inventory-stock' as PageId, icon: <PackagePlus className="w-4 h-4" /> },
    { label: 'Stock Out', page: 'inventory-stock' as PageId, icon: <PackageMinus className="w-4 h-4" /> },
    ...(userRole === 'admin' ? [
      { label: 'Add Expense', page: 'finance-expenses' as PageId, icon: <FileText className="w-4 h-4" /> },
      { label: 'Purchase Order', page: 'inventory-purchase' as PageId, icon: <ShoppingCart className="w-4 h-4" /> },
    ] : []),
  ];

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Period filter — every figure in the row below reads from it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 tracking-tight">{summary.label}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {summaryLoading
              ? 'Loading…'
              : summary.from === summary.to
                ? summary.from
                : `${summary.from} to ${summary.to}`}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Reporting period">
          {([
            ['daily', 'Today'],
            ['weekly', 'Week'],
            ['monthly', 'Month'],
            ['yearly', 'Year'],
          ] as [Period, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              aria-pressed={period === id}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                period === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <KpiCard
          title="Sales"
          value={fmt.peso(summary.totalRevenue)}
          subtext={summaryLoading ? 'Loading…' : `${summary.label.toLowerCase()} · ${summary.totalTransactions} transaction${summary.totalTransactions === 1 ? '' : 's'}`}
          icon={<Banknote className="w-5 h-5" />}
          onClick={() => onNavigate('payments-history')}
        />
        <KpiCard
          title="Cash Collected"
          value={fmt.peso(periodCash)}
          subtext={periodCollected > 0 ? `${Math.round((periodCash / periodCollected) * 100)}% of collections` : 'No collections yet'}
          icon={<Banknote className="w-5 h-5" />}
          onClick={() => onNavigate('payments-history')}
        />
        <KpiCard
          title="GCash Collected"
          value={fmt.peso(periodGCash)}
          subtext={periodCollected > 0 ? `${Math.round((periodGCash / periodCollected) * 100)}% of collections` : 'No collections yet'}
          icon={<CreditCard className="w-5 h-5" />}
          onClick={() => onNavigate('payments-history')}
        />
        <KpiCard
          title="Transactions"
          value={`${summary.totalTransactions}`}
          subtext={`${summary.laundryCount} laundry · ${summary.waterCount} water`}
          icon={<Receipt className="w-5 h-5" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 py-1 overflow-x-auto flex-nowrap pb-2 -mx-6 px-6 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex-shrink-0 mr-1">Quick Actions</span>
        {quickActions.map(a => (
          <Button
            key={a.label}
            variant="outline"
            size="sm"
            onClick={() => onNavigate(a.page)}
            className="font-semibold whitespace-nowrap flex-shrink-0 text-center justify-center text-xs sm:text-sm"
          >
            <span className="text-blue-500">{a.icon}</span>
            <span className="hidden sm:inline">{a.label}</span>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
        {/* Revenue Chart */}
        <div className={`${readyCount > 0 ? 'lg:col-span-3' : 'lg:col-span-5'} flex flex-col ${userRole !== 'admin' ? 'order-last lg:order-last' : ''}`}>
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 tracking-tight">Weekly Revenue</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Cash vs GCash · last 7 days</p>
                  </div>
                  <div className="flex gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-600" />Cash</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-300" />GCash</span>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="flex-1 pt-2">
                {/* Height comes from CSS so the chart follows a window resize;
                    a one-off window.innerWidth read never updates. */}
                <div className="h-[250px] sm:h-[300px] lg:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRevenue} barSize={24} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={45} dx={-10} />
                    <Tooltip isAnimationActive={false} formatter={(v: any) => fmt.peso(v)} cursor={{fill: '#e0f2fe'}} content={<ChartTooltip formatter={(v: any) => fmt.peso(v)} />} />
                    <Bar dataKey="cashSales" name="Cash" fill="#2563eb" radius={[4,4,0,0]} />
                    <Bar dataKey="gcashSales" name="GCash" fill="#cbd5e1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>

        {/* Action Center — hidden entirely when there is nothing ready for pickup */}
        {readyCount > 0 && (
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-amber-600" />
                    Ready for Pickup · {readyCount} orders
                  </h3>
                  <button onClick={() => onNavigate('laundry-orders')} className="text-xs text-blue-600 font-medium hover:underline">View tracker</button>
                </div>
              </CardHeader>
              <CardBody className="flex-1">
                <div className="space-y-1.5">
                  {readyOrders.slice(0, 6).map(o => (
                    <div key={o.id} onClick={() => onNavigate('laundry-orders')}
                      className="flex items-center justify-between py-2.5 px-3 bg-amber-50/50 rounded-lg border border-amber-100 transition-smooth hover:border-amber-200 hover:shadow-sm cursor-pointer">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{o.customerName}</p>
                        <p className="text-xs text-slate-500 font-mono">{o.id}</p>
                      </div>
                      <Badge variant="ready">Ready</Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 tracking-tight">Recent Transactions (Today)</h3>
            <div className="flex gap-3">
              <button onClick={() => onNavigate('laundry-orders')} className="text-xs font-medium text-blue-600 hover:underline">Laundry</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => onNavigate('water-history')} className="text-xs font-medium text-blue-600 hover:underline">Water</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => onNavigate('payments-history')} className="text-xs font-medium text-blue-600 hover:underline">Payments</button>
            </div>
          </div>
        </CardHeader>
        <Table maxHeight={400}>
          <Thead>
            <Tr>
              <Th>Transaction ID</Th>
              <Th>Type</Th>
              <Th>Customer</Th>
              <Th align="right">Amount</Th>
              <Th>Method</Th>
              <Th>Status</Th>
              <Th>Time</Th>
              <Th align="center">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {snapshotLoading ? (
              <Tr><Td colSpan={8} align="center"><span className="text-slate-500 py-6 block">Loading transactions…</span></Td></Tr>
            ) : recentTransactions.length === 0 ? (
              <Tr><Td colSpan={8} align="center"><span className="text-slate-500">No transactions recorded today.</span></Td></Tr>
            ) : recentTransactions.map(t => (
              <Tr key={t.id}>
                <Td className="font-mono font-medium text-blue-600">{t.id}</Td>
                <Td><Badge variant={t.type === 'Laundry' ? 'blue' : 'gray'}>{t.type}</Badge></Td>
                <Td className="font-medium text-slate-800">{t.customer}</Td>
                <Td align="right" className="font-mono font-semibold text-slate-900">{fmt.peso(t.amount)}</Td>
                <Td>
                  {t.method && t.method !== 'unpaid' ? (
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t.method}</span>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </Td>
                <Td>
                  <Badge variant={t.status === 'paid' ? 'paid' : t.status === 'partial' ? 'partial' : 'unpaid'}>
                    {t.status === 'paid' ? 'Paid' : t.status === 'partial' ? 'Partial' : 'Unpaid'}
                  </Badge>
                </Td>
                <Td className="font-mono text-xs text-slate-500">{t.date.split(' ')[1] || t.date}</Td>
                <Td align="center">
                  <Button size="xs" variant="ghost" onClick={() => onNavigate(t.type === 'Laundry' ? 'laundry-orders' : 'water-history')} icon={<Receipt className="w-4 h-4 text-slate-400"/>} title="View" />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
