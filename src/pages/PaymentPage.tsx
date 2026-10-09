import { useState } from 'react';
import {
  PageHeader, Card, CardHeader, CardBody, Badge, Button,
  Modal, Confirm, Input, Select, Textarea, SearchBar, PeriodFilter, ExportDialog,
  useToast, KpiCard, StatRow, Table, Thead, Tbody, Th, Td, Tr, RowActions, ViewAction
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { matchesQuery } from '../utils/search';
import { printReceipt, exportReportPdf } from '../utils/pdf';
import { resolveReportRange, withinReportRange, type ReportPeriod } from '../utils/reportPeriod';
import { useAsync } from '../hooks/useAsync';
import { paymentService } from '../services/paymentService';
import { laundryService } from '../services/laundryService';
import { waterService } from '../services/waterService';
import { activityService } from '../services/activityService';
import { useAuth } from '../context/AuthContext';
import {
  Banknote,
  ChevronLeft,
  Plus,
  Smartphone,
  ReceiptText,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; onNavigate: (p: PageId) => void; userName: string; }

export default function PaymentPage({ subPage, onNavigate, userName }: Props) {
  if (subPage === 'payments-new') return <RecordPaymentPage onNavigate={onNavigate} userName={userName} />;
  return <PaymentLedger onNavigate={onNavigate} />;
}

// ─── Payment Ledger ───────────────────────────────────────────────────────────
function PaymentLedger({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const toast = useToast();
  const { data: payments, loading, error } = useAsync(() => paymentService.list(), []);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [viewPayment, setViewPayment] = useState<any>(null);
  const [confirmPrint, setConfirmPrint] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const range = resolveReportRange(period, { from: customFrom, to: customTo });

  const printPaymentReceipt = (pay: any) => {
    printReceipt({
      businessName: 'ALMS',
      tagline: pay.type === 'water' ? 'Water Refilling Station' : pay.type === 'laundry' ? 'Laundry Shop' : 'Debt Ledger',
      txnId: pay.id,
      dateTime: fmt.datetime(pay.date),
      cashier: pay.processedBy,
      customer: pay.customerName,
      items: [{ name: pay.description || pay.linkedTo || 'Payment', qty: 1, price: pay.amount, subtotal: pay.amount }],
      total: pay.amount,
      paymentMethod: pay.method,
      amountReceived: pay.amtReceived,
      change: pay.change > 0 ? pay.change : undefined,
      balance: pay.balance > 0 ? pay.balance : undefined,
      gcashRef: pay.gcashRef || undefined,
    });
    toast.success(`Receipt for ${pay.id} downloaded.`);
  };

  const totalCash = payments.filter(p => p.method === 'cash').reduce((a, p) => a + p.amount, 0);
  const totalGcash = payments.filter(p => p.method === 'gcash').reduce((a, p) => a + p.amount, 0);
  const totalRevenue = totalCash + totalGcash;

  const debtRecords = payments.filter(p => p.type === 'debt' || p.status === 'unpaid');
  const totalDebt = debtRecords.reduce((a, p) => a + p.balance, 0);

  const filtered = payments.filter(p => {
    const matchSearch = matchesQuery(
      search,
      p.id, p.linkedTo, p.customerName, p.processedBy, p.description,
      p.type, p.method, p.status, p.amount, p.balance, p.gcashRef, p.date
    );
    const matchMethod = methodFilter === 'all' || p.method === methodFilter || (methodFilter === 'unpaid' && p.method === 'unpaid');
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchPeriod = withinReportRange(p.date, range);
    return matchSearch && matchMethod && matchType && matchStatus && matchPeriod;
  });

  const handleExport = () => {
    if (filtered.length === 0) { toast.error('No records to export for the current filters.'); return; }
    const totals = filtered.reduce((s, p) => ({ amount: s.amount + p.amount, received: s.received + p.amtReceived, balance: s.balance + p.balance }), { amount: 0, received: 0, balance: 0 });
    exportReportPdf({
      reportTitle: 'Payment Ledger',
      period: range.label,
      filtersLabel: [
        methodFilter !== 'all' ? `Method: ${methodFilter}` : null,
        typeFilter !== 'all' ? `Type: ${typeFilter}` : null,
        statusFilter !== 'all' ? `Status: ${statusFilter}` : null,
        search ? `Search: "${search}"` : null,
      ].filter(Boolean).join(' · ') || undefined,
      columns: ['Transaction ID', 'Customer', 'Type', 'Amount', 'Received', 'Balance', 'Method', 'Status', 'Date'],
      rows: filtered.map(p => [
        p.id, p.customerName || 'Walk-in', p.type, fmt.peso(p.amount), fmt.peso(p.amtReceived),
        p.balance > 0 ? fmt.peso(p.balance) : '—', p.method.toUpperCase(), p.status.toUpperCase(), fmt.datetime(p.date),
      ]),
      totalsRow: ['', '', 'TOTAL', fmt.peso(totals.amount), fmt.peso(totals.received), fmt.peso(totals.balance), '', '', ''],
      fileName: `ALMS_Payment_Ledger_${range.label.replace(/\s+/g, '_')}.pdf`,
    });
    toast.success('Payment Ledger exported.');
  };

  const methodBadge = (method: string) => {
    if (method === 'gcash') return <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><Smartphone className="w-3 h-3" /> GCASH</span>;
    if (method === 'cash') return <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Banknote className="w-3 h-3" /> CASH</span>;
    return <span className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> UNPAID</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Ledger" subtitle={`${range.label} — Cash, GCash, and Debt`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowExport(true)} icon={<Download className="w-4 h-4" />}>Export PDF</Button>
            <Button onClick={() => onNavigate('payments-new')} icon={<Plus className="w-4 h-4" />}>
              Record Payment or Debt
            </Button>
          </>
        } />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Total Collected" value={fmt.peso(totalRevenue)} icon={<Banknote className="w-5 h-5 text-slate-400" />}
          subtext={`${payments.filter(p => p.status === 'paid').length} transactions`} />
        <KpiCard title="Cash Collected" value={fmt.peso(totalCash)} icon={<Banknote className="w-5 h-5 text-slate-400" />}
          subtext={`${payments.filter(p => p.method === 'cash').length} transactions`} />
        <KpiCard title="GCash Collected" value={fmt.peso(totalGcash)} icon={<Smartphone className="w-5 h-5 text-slate-400" />}
          subtext={`${payments.filter(p => p.method === 'gcash').length} transactions`} />
        <KpiCard title="Outstanding Debt" value={fmt.peso(totalDebt)} icon={<AlertCircle className="w-5 h-5 text-slate-400" />}
          subtext={`${debtRecords.length} unpaid records`} trend={{ value: 'Action needed', up: false }} />
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search payment, order, customer, method, status…" className="w-full sm:w-80" />
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select options={[
                { label: 'All Payments', value: 'all' }, { label: 'Cash', value: 'cash' }, { label: 'GCash', value: 'gcash' }, { label: 'Unpaid / Debt', value: 'unpaid' }
              ]} value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="w-36" />
              <Select options={[
                { label: 'All Types', value: 'all' }, { label: 'Laundry', value: 'laundry' }, { label: 'Water', value: 'water' }, { label: 'Debt Ledger', value: 'debt' }
              ]} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-36" />
              <Select options={[
                { label: 'All Statuses', value: 'all' }, { label: 'Paid', value: 'paid' }, { label: 'Partial', value: 'partial' }, { label: 'Debt', value: 'unpaid' }
              ]} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36" />
              <PeriodFilter period={period} onPeriodChange={setPeriod} customFrom={customFrom} customTo={customTo}
                onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }} />
            </div>
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{range.label} · {filtered.length} records</span>
          </div>
        </CardHeader>
        <Table maxHeight={320}>
            <Thead>
              <Tr>
                <Th>Transaction ID</Th>
                <Th>Customer</Th>
                <Th>Type</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Received</Th>
                <Th align="right">Balance</Th>
                <Th>Payment</Th>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={10} align="center"><span className="text-slate-500 py-6 block">Loading payments…</span></Td></Tr>
              ) : error ? (
                <Tr><Td colSpan={10} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
              ) : filtered.length === 0 ? (
                <Tr><Td colSpan={10} align="center"><span className="text-slate-500 py-6 block">No payments match your filters</span></Td></Tr>
              ) : filtered.map(pay => (
                <Tr key={pay.id} onClick={() => setViewPayment(pay)}>
                  <Td className="num text-xs font-semibold text-blue-600">{pay.id}</Td>
                  <Td className="font-medium text-slate-800">{pay.customerName}</Td>
                  <Td>
                    <Badge variant={pay.type === 'laundry' ? 'blue' : pay.type === 'water' ? 'green' : 'red'}>
                      {pay.type === 'laundry' ? 'Laundry' : pay.type === 'water' ? 'Water' : 'Debt'}
                    </Badge>
                  </Td>
                  <Td align="right" className="num font-semibold text-slate-900">{fmt.peso(pay.amount)}</Td>
                  <Td align="right" className="num text-slate-600">{fmt.peso(pay.amtReceived)}</Td>
                  <Td align="right" className={`num font-bold ${pay.balance > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                    {pay.balance > 0 ? fmt.peso(pay.balance) : '—'}
                  </Td>
                  <Td>{methodBadge(pay.method)}</Td>
                  <Td>
                    <Badge variant={pay.status === 'paid' ? 'paid' : pay.status === 'partial' ? 'partial' : 'unpaid'}>
                      {pay.status === 'paid' ? 'Paid' : pay.status === 'partial' ? 'Partial' : pay.type === 'debt' ? 'Debt' : 'Unpaid'}
                    </Badge>
                  </Td>
                  <Td className="num text-xs text-slate-500">{fmt.datetime(pay.date)}</Td>
                  <Td align="center">
                    <RowActions>
                      <ViewAction onClick={() => setViewPayment(pay)} />
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Tbody>
        </Table>
      </Card>

      {/* Payment Detail Modal */}
      {viewPayment && (
        <Modal open={!!viewPayment} onClose={() => setViewPayment(null)} title="Transaction Details" size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setViewPayment(null)}>Close</Button>
              <Button variant="outline" onClick={() => setConfirmPrint(true)} icon={<ReceiptText className="w-4 h-4" />}>Print Receipt</Button>
            </>
          }>
          <div className="space-y-5">
            {/* Header section */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <p className="text-xl font-bold text-slate-900 tracking-tight">{fmt.peso(viewPayment.amount)}</p>
                <p className="text-sm text-slate-500 mt-1">{viewPayment.customerName}</p>
                {viewPayment.description && <p className="text-xs text-slate-400 mt-0.5">{viewPayment.description}</p>}
              </div>
              <Badge variant={viewPayment.status === 'paid' ? 'paid' : viewPayment.status === 'partial' ? 'partial' : 'unpaid'}>
                {viewPayment.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Transaction ID</p>
                <p className="font-mono text-slate-800">{viewPayment.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                <p className="text-slate-800">{fmt.datetime(viewPayment.date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Method</p>
                <div>{methodBadge(viewPayment.method)}</div>
              </div>
              {viewPayment.gcashRef && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reference No.</p>
                  <p className="font-mono text-slate-800">{viewPayment.gcashRef}</p>
                </div>
              )}
              {viewPayment.linkedTo && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Linked Order</p>
                  <p className="font-mono text-blue-600">{viewPayment.linkedTo}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Processed By</p>
                <p className="text-slate-800">{viewPayment.processedBy}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <StatRow label="Total Amount" value={fmt.peso(viewPayment.amount)} mono />
              <StatRow label="Amount Received" value={fmt.peso(viewPayment.amtReceived)} mono />
              {viewPayment.change > 0 && <StatRow label="Change Given" value={fmt.peso(viewPayment.change)} mono />}
              {viewPayment.balance > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <StatRow label="Unpaid Balance (Debt)" value={<span className="font-bold text-red-600">{fmt.peso(viewPayment.balance)}</span>} mono />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      <Confirm
        open={confirmPrint}
        onClose={() => setConfirmPrint(false)}
        onConfirm={() => viewPayment && printPaymentReceipt(viewPayment)}
        title="Print Receipt?"
        message={`Generate an 80mm receipt PDF for transaction ${viewPayment?.id ?? ''}.`}
        confirmLabel="Print Receipt"
      />

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={handleExport}
        title="Export Payment Ledger?"
        reportTitle="Payment Ledger"
        period={range.label}
        filters={[methodFilter !== 'all' ? methodFilter : null, typeFilter !== 'all' ? typeFilter : null, statusFilter !== 'all' ? statusFilter : null].filter(Boolean).join(', ') || 'None'}
        rowCount={filtered.length}
      />
    </div>
  );
}

// ─── Record Payment ───────────────────────────────────────────────────────────
function RecordPaymentPage({ onNavigate, userName }: { onNavigate: (p: PageId) => void; userName: string }) {
  const toast = useToast();
  const [recordType, setRecordType] = useState<'laundry' | 'water' | 'debt'>('laundry');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderSearch, setOrderSearch] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'unpaid' | ''>('');
  const [amountReceived, setAmountReceived] = useState('');
  const [gcashRef, setGcashRef] = useState('');

  // Debt specific states
  const [debtCustomer, setDebtCustomer] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDesc, setDebtDesc] = useState('');

  const { employee } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { data: laundryOrders } = useAsync(() => laundryService.listOrders(), []);
  const { data: waterSales } = useAsync(() => waterService.listSales(), []);

  const orders = recordType === 'laundry'
    ? laundryOrders.filter(o => !['released', 'cancelled'].includes(o.status) && o.paymentStatus !== 'paid')
    : recordType === 'water' ? waterSales : [];

  const filteredOrders = orders.filter((o: any) =>
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerName.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const isDebtMode = recordType === 'debt';

  const total = isDebtMode ? (parseFloat(debtAmount) || 0) : (selectedOrder?.total || 0);
  const alreadyPaid = isDebtMode ? 0 : (selectedOrder?.paid || selectedOrder?.amtPaid || 0);
  const outstanding = Math.max(0, total - alreadyPaid);
  const received = parseFloat(amountReceived) || 0;
  const change = paymentMethod === 'unpaid' ? 0 : Math.max(0, received - outstanding);
  const balance = paymentMethod === 'unpaid' ? outstanding : Math.max(0, outstanding - received);

  const handleSubmit = async () => {
    if (isDebtMode) {
      if (!debtCustomer.trim()) { toast.error('Enter customer name.'); return; }
      if (!debtAmount || parseFloat(debtAmount) <= 0) { toast.error('Enter valid debt amount.'); return; }
      if (!debtDesc.trim()) { toast.error('Enter a description for the debt.'); return; }
    } else {
      if (!selectedOrder) { toast.error('Select an order first.'); return; }
      if (!paymentMethod) { toast.error('Select a payment method.'); return; }
      if (paymentMethod !== 'unpaid' && (!amountReceived || received <= 0)) { toast.error('Enter amount received.'); return; }
      if (paymentMethod === 'gcash' && !gcashRef) { toast.error('Enter GCash reference number.'); return; }
    }

    setSubmitting(true);
    try {
      if (isDebtMode) {
        const amount = parseFloat(debtAmount);
        await paymentService.create({
          customerName: debtCustomer.trim(),
          type: 'debt',
          description: debtDesc.trim(),
          amount,
          amtReceived: 0,
          change: 0,
          balance: amount,
          method: 'unpaid',
          status: 'unpaid',
          processedBy: userName,
        });
        await activityService.log(employee?.id ?? null, 'Payment', `Recorded debt of ${fmt.peso(amount)} for ${debtCustomer.trim()}`);
        toast.success(`Debt record created for ${debtCustomer}`);
      } else {
        const status = paymentMethod === 'unpaid' ? 'unpaid' : received >= outstanding ? 'paid' : 'partial';
        const isLaundry = recordType === 'laundry';

        await paymentService.create({
          laundryOrderId: isLaundry ? selectedOrder.id : null,
          waterTransactionId: isLaundry ? null : selectedOrder.id,
          customerId: selectedOrder.customerId ?? null,
          customerName: selectedOrder.customerName,
          type: isLaundry ? 'laundry' : 'water',
          amount: outstanding,
          amtReceived: paymentMethod === 'unpaid' ? 0 : received,
          change,
          balance,
          method: paymentMethod,
          status,
          gcashRef,
          processedBy: userName,
        });

        // Keep the originating order's payment state in step with the ledger.
        if (isLaundry && paymentMethod !== 'unpaid') {
          await laundryService.markPaid(selectedOrder.id, received, paymentMethod, gcashRef);
        }

        await activityService.log(
          employee?.id ?? null,
          'Payment',
          `Recorded ${paymentMethod.toUpperCase()} payment of ${fmt.peso(received)} for ${selectedOrder.id}`
        );

        toast.success(`Payment recorded for ${selectedOrder.id}. Status: ${status.toUpperCase()}`);
        if (change > 0) toast.info(`Change due: ${fmt.peso(change)}`);
      }
      onNavigate('payments');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => onNavigate('payments')} icon={<ChevronLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Record Transaction</h1>
          <p className="text-xs text-slate-500 mt-0.5">Process payment or record a customer debt</p>
        </div>
      </div>

      <Card>
        <CardBody className="p-1.5 flex gap-1 bg-slate-100 rounded-xl">
          <button onClick={() => { setRecordType('laundry'); setSelectedOrder(null); setPaymentMethod(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${recordType === 'laundry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            🧺 Laundry Order
          </button>
          <button onClick={() => { setRecordType('water'); setSelectedOrder(null); setPaymentMethod(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${recordType === 'water' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            💧 Water Sale
          </button>
          <button onClick={() => { setRecordType('debt'); setSelectedOrder(null); setPaymentMethod('unpaid'); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${recordType === 'debt' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            ⚠️ Record Debt
          </button>
        </CardBody>
      </Card>

      {isDebtMode ? (
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">New Debt Record</h3></CardHeader>
          <CardBody className="space-y-4">
            <Input label="Customer Name" placeholder="Enter customer name" value={debtCustomer} onChange={e => setDebtCustomer(e.target.value)} />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Debt Amount (₱)</label>
              <Input type="number" placeholder="0.00" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} />
            </div>
            <Textarea label="Description / Reason" placeholder="E.g., Unpaid balance for laundry..." value={debtDesc} onChange={e => setDebtDesc(e.target.value)} rows={3} />
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Debt Creation Notice</p>
                <p className="text-xs text-red-600 mt-1">This will create a standalone debt record in the ledger. The customer will owe the specified amount until paid.</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><h3 className="font-semibold text-slate-900">Find Order</h3></CardHeader>
            <CardBody>
              <SearchBar value={orderSearch} onChange={setOrderSearch} placeholder="Search by order # or customer name…" />
              <div className="mt-4 max-h-60 overflow-y-auto pr-2 space-y-2">
                {filteredOrders.map((o: any) => (
                  <button key={o.id} onClick={() => setSelectedOrder(o)}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${selectedOrder?.id === o.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold text-slate-900 text-xs">{o.id}</span>
                        <span className="ml-3 font-medium text-slate-600">{o.customerName}</span>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900">{fmt.peso(o.total)}</span>
                        <Badge variant={o.paymentStatus === 'paid' ? 'paid' : o.paymentStatus === 'partial' ? 'partial' : 'unpaid'}>
                          {o.paymentStatus || 'unpaid'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredOrders.length === 0 && <div className="text-center text-slate-400 py-6 text-sm">No pending orders found.</div>}
              </div>
            </CardBody>
          </Card>

          {selectedOrder && (
            <Card>
              <CardHeader><h3 className="font-semibold text-slate-900">Process Payment</h3></CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-slate-50 rounded-xl mb-6 border border-slate-100">
                  <StatRow label="Order #" value={<span className="font-mono text-blue-600">{selectedOrder.id}</span>} />
                  <StatRow label="Outstanding Balance" value={<span className="font-mono font-bold text-red-600 text-base">{fmt.peso(outstanding)}</span>} />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Payment Method</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => setPaymentMethod('cash')}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'cash' ? 'bg-green-50 text-green-700 border-green-500 ring-1 ring-green-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <Banknote className="w-5 h-5" /> Cash
                      </button>
                      <button onClick={() => setPaymentMethod('gcash')}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'gcash' ? 'bg-blue-50 text-blue-700 border-blue-500 ring-1 ring-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <Smartphone className="w-5 h-5" /> GCash
                      </button>
                      <button onClick={() => setPaymentMethod('unpaid')}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'unpaid' ? 'bg-red-50 text-red-700 border-red-500 ring-1 ring-red-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <AlertCircle className="w-5 h-5" /> Mark as Debt
                      </button>
                    </div>
                  </div>

                  {(paymentMethod === 'cash' || paymentMethod === 'gcash') && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1.5 block">Amount Received (₱)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">₱</span>
                          <input type="number" value={amountReceived} min={0}
                            onChange={e => setAmountReceived(e.target.value)}
                            placeholder={outstanding.toFixed(2)}
                            className="w-full pl-9 pr-4 py-3.5 text-lg font-mono font-bold rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-slate-50 focus:bg-white"
                          />
                        </div>
                      </div>

                      {paymentMethod === 'gcash' && (
                        <Input label="GCash Reference No." placeholder="e.g. 00012345678" value={gcashRef} onChange={e => setGcashRef(e.target.value)} />
                      )}

                      {received > 0 && (
                        <div className={`p-4 rounded-xl border ${received >= outstanding ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                          {received >= outstanding ? (
                            <div className="flex justify-between items-center text-green-800">
                              <span className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Change Due</span>
                              <span className="font-mono font-bold text-xl">{fmt.peso(change)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center text-amber-800">
                              <span className="font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Remaining Debt</span>
                              <span className="font-mono font-bold text-xl">{fmt.peso(balance)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'unpaid' && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-800 flex items-start gap-3 mt-4 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Marking as unpaid debt</p>
                        <p className="text-sm mt-1">This order will be added to the debt ledger with an outstanding balance of <span className="font-mono font-bold">{fmt.peso(outstanding)}</span>.</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => onNavigate('payments')}>Cancel</Button>
        <Button variant="primary" loading={submitting} onClick={handleSubmit}
          disabled={isDebtMode ? false : (!selectedOrder || !paymentMethod || (paymentMethod !== 'unpaid' && !amountReceived))}>
          {isDebtMode ? 'Create Debt Record' : 'Confirm Transaction'}
        </Button>
      </div>
    </div>
  );
}
