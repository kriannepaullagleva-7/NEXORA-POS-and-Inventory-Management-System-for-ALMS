import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  PageHeader, Card, CardHeader, CardBody, Badge, Button,
  Table, Thead, Tbody, Th, Td, Tr, KpiCard, StatRow, ChartTooltip,
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { monthlyRevenue, dailyRevenue } from '../data/finance';
import { laundryOrders } from '../data/laundry';
import { waterSales } from '../data/water';
import { inventoryItems } from '../data/inventory';
import { payments } from '../data/payments';
import { 
  TrendingUp, Activity, BarChart2, Droplet, 
  Waves, Package, FileText, Banknote, ShieldAlert,
  Wallet, Printer, Download, ShoppingCart, Percent
} from 'lucide-react';

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];

const servicePerformance = [
  { name: 'Wash, Dry & Fold', orders: 45, revenue: 5400, avgOrder: 120 },
  { name: 'Full Service W&D', orders: 38, revenue: 3230, avgOrder: 85 },
  { name: 'Bedsheets/Blankets', orders: 22, revenue: 3300, avgOrder: 150 },
  { name: 'Self-Service Wash', orders: 60, revenue: 3300, avgOrder: 55 },
  { name: 'Comforter/Duvet', orders: 15, revenue: 5250, avgOrder: 350 },
  { name: 'Sneakers', orders: 18, revenue: 4500, avgOrder: 250 },
];

const waterPerformance = [
  { name: '20L Gallon', qty: 280, revenue: 18200 },
  { name: '10L Gallon', qty: 120, revenue: 4800 },
  { name: '5L Gallon', qty: 180, revenue: 4500 },
  { name: '2.5L Slim', qty: 90, revenue: 1620 },
];

export default function AnalyticsPage() {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('monthly');

  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.laundry + m.water, 0);
  const laundryRev = monthlyRevenue.reduce((s, m) => s + m.laundry, 0);
  const waterRev = monthlyRevenue.reduce((s, m) => s + m.water, 0);
  const totalTxns = laundryOrders.length + waterSales.length;
  const lowStock = inventoryItems.filter(i => i.status !== 'normal').length;
  const inventoryValue = inventoryItems.reduce((s, i) => s + i.currentQty * i.costPerUnit, 0);
  const estExpenses = totalRevenue * 0.55;
  const netRevenue = totalRevenue - estExpenses;

  const revenueByService = [
    { name: 'Laundry', value: laundryRev },
    { name: 'Water', value: waterRev },
  ];

  const paymentMix = [
    { name: 'Cash', value: payments.filter(p=>p.method==='cash').reduce((s,p)=>s+p.amount,0) },
    { name: 'GCash', value: payments.filter(p=>p.method==='gcash').reduce((s,p)=>s+p.amount,0) },
  ];

  const reports = [
    { id: 'overview', label: 'Overview' },
    { id: 'laundry', label: 'Laundry Analytics' },
    { id: 'water', label: 'Water Sales' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'payments', label: 'Payment Trends' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Business Intelligence" subtitle="Analytics, comprehensive reports, and performance insights"
        actions={
          <div className="flex gap-2">
            <select className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-500 shadow-sm transition-all"
              value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="yearly">This Year</option>
            </select>
            <Button variant="outline" icon={<Download className="w-4 h-4" />}>Export Report</Button>
            <Button variant="outline" icon={<Printer className="w-4 h-4" />}>Print</Button>
          </div>
        } />

      {/* Report Type Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {reports.map(r => (
          <button key={r.id} onClick={() => setReportType(r.id)}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-smooth border ${reportType === r.id ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-700 shadow-lg hover:shadow-lg -translate-y-0.5' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <KpiCard title="Total Revenue" value={fmt.peso(totalRevenue)} mono trend={{ value: '+8.2%', up: true }}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />} />
        <KpiCard title="Laundry Revenue" value={fmt.peso(laundryRev)} mono trend={{ value: '+5.4%', up: true }}
          icon={<Waves className="w-5 h-5 text-slate-500" />} />
        <KpiCard title="Water Revenue" value={fmt.peso(waterRev)} mono trend={{ value: '+11.2%', up: true }}
          icon={<Droplet className="w-5 h-5 text-slate-500" />} />
        <KpiCard title="Net Profit Margin" value={`${(netRevenue/totalRevenue*100).toFixed(0)}%`} mono trend={{ value: 'Above target', up: true }}
          icon={<Percent className="w-5 h-5 text-slate-400" />} />
        <KpiCard title="Total Transactions" value={totalTxns} 
          icon={<ShoppingCart className="w-5 h-5 text-slate-400" />} />
        <KpiCard title="Laundry Orders" value={laundryOrders.length} 
          icon={<FileText className="w-5 h-5 text-slate-400" />} />
        <KpiCard title="Low Stock Alerts" value={lowStock} 
          icon={<ShieldAlert className={`w-5 h-5 ${lowStock > 0 ? 'text-red-500' : 'text-slate-400'}`} />} />
        <KpiCard title="Inventory Value" value={fmt.peso(inventoryValue)} mono 
          icon={<Package className="w-5 h-5 text-slate-400" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <h3 className="font-semibold text-slate-900 tracking-tight">Daily Revenue (This Week)</h3>
          </CardHeader>
          <CardBody className="flex-1">
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : window.innerWidth < 1024 ? 240 : 260}>
              <AreaChart data={dailyRevenue}>
                <defs>
                  <linearGradient id="laundryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={45} dx={-10} />
                <Tooltip isAnimationActive={false} formatter={(v: any) => fmt.peso(v)} cursor={{fill: '#e0f2fe'}} content={<ChartTooltip formatter={(v: any) => fmt.peso(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} iconType="circle" />
                <Area type="monotone" dataKey="laundry" name="Laundry" stroke="#3b82f6" fill="url(#laundryGrad)" strokeWidth={2} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="water" name="Water" stroke="#06b6d4" fill="url(#waterGrad)" strokeWidth={2} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader><h3 className="font-semibold text-slate-900 tracking-tight">Revenue by Service</h3></CardHeader>
          <CardBody className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-8 w-full">
              <div className="h-48 w-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueByService} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                      {revenueByService.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip isAnimationActive={false} formatter={(v: any) => fmt.peso(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4">
                {revenueByService.map((item, i) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-slate-700 font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{fmt.peso(item.value)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(item.value/totalRevenue*100).toFixed(0)}%`, background: COLORS[i] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader><h3 className="font-semibold text-slate-900 tracking-tight">Monthly Trend (Year-to-Date)</h3></CardHeader>
          <CardBody className="flex-1">
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : window.innerWidth < 1024 ? 240 : 260}>
              <LineChart data={monthlyRevenue.map(m => ({ ...m, total: m.laundry + m.water }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={45} dx={-10} />
                <Tooltip isAnimationActive={false} formatter={(v: any) => fmt.peso(v)} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} iconType="circle" />
                <Line type="monotone" dataKey="total" name="Total Revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="laundry" name="Laundry" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="water" name="Water" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader><h3 className="font-semibold text-slate-900 tracking-tight">Payment Method Analysis</h3></CardHeader>
          <CardBody className="flex-1 flex flex-col justify-between">
            <div className="space-y-5 pt-4">
              {paymentMix.map((item, i) => (
                <div key={item.name}>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      {i === 0 ? <Banknote className="w-4 h-4 text-green-600"/> : <Wallet className="w-4 h-4 text-blue-600"/>}
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">{fmt.peso(item.value)}</span>
                      <span className="text-xs font-medium text-slate-400">{(item.value / paymentMix.reduce((s,p)=>s+p.value,0)*100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${(item.value / paymentMix.reduce((s,p)=>s+p.value,0)*100).toFixed(0)}%`,
                      background: ['#22c55e','#3b82f6'][i],
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Summary</p>
              <div className="space-y-2">
                <StatRow label="Total Transactions" value={payments.length.toString()} />
                <StatRow label="Total Collected" value={fmt.peso(payments.reduce((s,p)=>s+p.amount,0))} mono />
                <StatRow label="Avg. Ticket Size" value={fmt.peso(payments.reduce((s,p)=>s+p.amount,0)/payments.length)} mono />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Laundry Service Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 tracking-tight">Laundry Services Performance</h3>
            <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5"/>}>Export</Button>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>Service Name</Th>
              <Th align="center">Orders Completed</Th>
              <Th align="right">Revenue Generated</Th>
              <Th align="right">Avg. Order Value</Th>
              <Th>Revenue Share</Th>
            </Tr>
          </Thead>
          <Tbody>
            {servicePerformance.sort((a,b)=>b.revenue-a.revenue).map((svc, i) => {
              const totalServiceRev = servicePerformance.reduce((s,s2)=>s+s2.revenue,0);
              const share = (svc.revenue/totalServiceRev*100).toFixed(0);
              return (
                <Tr key={svc.name}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>#{i+1}</span>
                      <span className="font-bold text-slate-800">{svc.name}</span>
                    </div>
                  </Td>
                  <Td align="center" className="font-mono text-slate-600 font-medium">{svc.orders}</Td>
                  <Td align="right" className="font-mono font-bold text-green-700">{fmt.peso(svc.revenue)}</Td>
                  <Td align="right" className="font-mono text-slate-700 font-medium">{fmt.peso(svc.avgOrder)}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 w-8">{share}%</span>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>

      {/* Water Performance */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 tracking-tight">Water Products Performance</h3>
        </CardHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>Product Configuration</Th>
              <Th align="center">Quantity Sold</Th>
              <Th align="right">Total Revenue</Th>
              <Th>Category Share</Th>
            </Tr>
          </Thead>
          <Tbody>
            {waterPerformance.sort((a,b)=>b.revenue-a.revenue).map((prod, i) => {
              const total = waterPerformance.reduce((s,p)=>s+p.revenue,0);
              const share = (prod.revenue/total*100).toFixed(0);
              return (
                <Tr key={prod.name}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>#{i+1}</span>
                      <span className="font-bold text-slate-800">{prod.name}</span>
                    </div>
                  </Td>
                  <Td align="center" className="font-mono text-slate-600 font-medium">{prod.qty}</Td>
                  <Td align="right" className="font-mono font-bold text-cyan-700">{fmt.peso(prod.revenue)}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 w-8">{share}%</span>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
