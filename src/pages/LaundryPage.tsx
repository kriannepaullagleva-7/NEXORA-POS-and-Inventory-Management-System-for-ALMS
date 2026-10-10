import { useState, useMemo, useEffect } from 'react';
import {
  Pagination,
  PAGE_SIZE,
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
  Confirm,
  Input,
  Textarea,
  SearchBar,
  PeriodFilter,
  ExportDialog,
  useToast,
  KpiCard,
  RowActions,
  ViewAction,
  EditAction,
  DeleteAction
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { matchesQuery } from '../utils/search';
import { printReceipt, exportReportPdf } from '../utils/pdf';
import { resolveReportRange, withinReportRange, type ReportPeriod } from '../utils/reportPeriod';
import { useAsync } from '../hooks/useAsync';
import { laundryService } from '../services/laundryService';
import { paymentService } from '../services/paymentService';
import { activityService } from '../services/activityService';
import { customerService } from '../services/customerService';
import { useProducts, useCustomers } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { LaundryOrder, LaundryStatus } from '../types/models';
import ProductCatalog from '../components/ProductCatalog';
import {
  WashingMachine,
  Banknote,
  Smartphone,
  Plus,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  ReceiptText,
  Tag,
  Clock,
  Package,
  History,
  Shirt,
  PlusCircle,
  MinusCircle,
  XCircle,
  Download
} from 'lucide-react';

import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; onNavigate: (p: PageId) => void; userName: string; }

export default function LaundryPage({ subPage, onNavigate, userName }: Props) {
  if (subPage === 'laundry-new') return <LaundryPOS onNavigate={onNavigate} userName={userName} />;
  if (subPage === 'laundry-history') return <LaundryHistoryPage onNavigate={onNavigate} />;
  if (subPage === 'laundry-services') return <ProductCatalog module="laundry" />;
  return <OrderTrackerPage onNavigate={onNavigate} />;
}

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress', ready: 'Ready for Pickup',
  released: 'Released', cancelled: 'Cancelled',
};
const STATUS_BADGE: Record<string, any> = {
  pending:'pending', in_progress:'inprogress', ready:'ready', released:'released', cancelled:'cancelled',
};
const NEXT_STATUS: Record<string, string> = {
  pending:'in_progress', in_progress:'ready', ready:'released',
};
const NEXT_LABEL: Record<string, string> = {
  pending:'Start Processing', in_progress:'Mark Ready for Pickup', ready:'Mark Released',
};

// ─── Order Tracker ───────────────────────────────────────────────────────────
function OrderTrackerPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { data: orders, loading, error, reload } = useAsync(() => laundryService.listOrders(), []);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [viewOrder, setViewOrder] = useState<LaundryOrder | null>(null);
  const [editOrder, setEditOrder] = useState<LaundryOrder | null>(null);
  const [editForm, setEditForm] = useState({ customerName: '', phone: '', notes: '', discount: '' });
  const [deleteTarget, setDeleteTarget] = useState<LaundryOrder | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [confirmPrint, setConfirmPrint] = useState(false);
  const toast = useToast();
  const { employee } = useAuth();

  const printOrderReceipt = (order: any) => {
    printReceipt({
      businessName: 'ALMS Laundry Shop',
      tagline: 'Professional Care',
      txnId: order.id,
      dateTime: fmt.datetime(order.date),
      cashier: order.processedBy,
      customer: order.customerName,
      items: [
        ...order.services.map((s: any) => ({ name: s.name, qty: s.qty, unit: s.unit, price: s.price, subtotal: s.subtotal })),
        ...order.addons.map((a: any) => ({ name: a.name, qty: a.qty || 1, price: a.price, subtotal: a.subtotal })),
      ],
      discount: order.discount > 0 ? order.discount : undefined,
      total: order.total,
      paymentMethod: order.paymentMethod || 'unpaid',
      amountReceived: order.paid,
      change: order.change > 0 ? order.change : undefined,
      balance: order.paymentStatus !== 'paid' ? order.total - order.paid : undefined,
      gcashRef: order.gcashRef || undefined,
    });
    toast.success(`Receipt for ${order.id} downloaded.`);
  };

  const counts = {
    all: orders.length,
    pending: orders.filter(o=>o.status==='pending').length,
    in_progress: orders.filter(o=>o.status==='in_progress').length,
    ready: orders.filter(o=>o.status==='ready').length,
    released: orders.filter(o=>o.status==='released').length,
    cancelled: orders.filter(o=>o.status==='cancelled').length,
  };

  const filtered = orders.filter(o =>
    (tab === 'all' || o.status === tab) &&
    matchesQuery(
      search,
      o.id, o.customerName, o.phone, o.date, o.total, o.processedBy, o.notes,
      o.paymentMethod, o.paymentStatus, STATUS_LABELS[o.status],
      o.services.map(sv => sv.name), o.addons.map(a => a.name)
    )
  );

  // Paint one page at a time so a long order list never locks up the tablet.
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, tab]);

  const applyStatus = async (order: LaundryOrder, newStatus: LaundryStatus, message: string) => {
    try {
      const updated = await laundryService.updateStatus(order.id, newStatus);
      await activityService.log(employee?.id ?? null, 'Laundry', `Updated ${order.id} status to ${STATUS_LABELS[newStatus]}`);
      toast.success(message);
      if (viewOrder?.id === order.id) setViewOrder(updated);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the order.');
    }
  };

  const updateStatus = (order: LaundryOrder) => {
    const newStatus = NEXT_STATUS[order.status] as LaundryStatus;
    void applyStatus(
      order,
      newStatus,
      newStatus === 'ready' ? `Order ${order.id} marked Ready for Pickup.` : `Order ${order.id} → ${STATUS_LABELS[newStatus]}`
    );
  };

  const cancelOrder = (order: LaundryOrder) => {
    void applyStatus(order, 'cancelled', `Order ${order.id} cancelled.`);
  };

  const openEdit = (order: LaundryOrder) => {
    setEditForm({
      customerName: order.customerName,
      phone: order.phone,
      notes: order.notes,
      discount: String(order.discount || 0),
    });
    setEditOrder(order);
  };

  const saveEdit = async () => {
    if (!editOrder) return;
    if (!editForm.customerName.trim()) { toast.error('Customer name is required.'); return; }
    const discount = parseFloat(editForm.discount) || 0;
    if (discount < 0) { toast.error('Discount cannot be negative.'); return; }
    if (discount > editOrder.subtotal) { toast.error('Discount cannot exceed the order subtotal.'); return; }

    setBusy(true);
    try {
      const updated = await laundryService.updateOrder(editOrder.id, {
        customerName: editForm.customerName.trim(),
        phone: editForm.phone.trim(),
        notes: editForm.notes.trim(),
        discount,
      });
      await activityService.log(employee?.id ?? null, 'Laundry', `Edited laundry order ${updated.id}`);
      toast.success(`Order ${updated.id} updated.`);
      if (viewOrder?.id === updated.id) setViewOrder(updated);
      setEditOrder(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the order.');
    } finally {
      setBusy(false);
    }
  };

  const removeOrder = async () => {
    if (!deleteTarget) return;
    try {
      await laundryService.deleteOrder(deleteTarget.id);
      await activityService.log(employee?.id ?? null, 'Laundry', `Deleted laundry order ${deleteTarget.id}`);
      toast.success(`Order ${deleteTarget.id} deleted.`);
      if (viewOrder?.id === deleteTarget.id) setViewOrder(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the order.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const methodBadge = (method: string) => {
    if (method === 'gcash') return <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><Smartphone className="w-3 h-3" /> GCASH</span>;
    if (method === 'cash') return <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Banknote className="w-3 h-3" /> CASH</span>;
    return <span className="text-xs font-bold text-slate-400">—</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Laundry Operations" subtitle="Monitor and manage all laundry orders"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => onNavigate('laundry-history')} variant="outline" icon={<History className="w-4 h-4" />}>
              Sales History
            </Button>
            <Button onClick={() => onNavigate('laundry-new')} icon={<Plus className="w-4 h-4" />}>
              New Order
            </Button>
          </div>
        } />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Active Orders" value={counts.pending + counts.in_progress} icon={<WashingMachine className="w-5 h-5 text-blue-500" />} />
        <KpiCard title="Ready for Pickup" value={counts.ready} icon={<Package className="w-5 h-5 text-green-500" />} />
        <KpiCard title="Unpaid Orders" value={orders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'cancelled').length} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} />
        <KpiCard title="Total Revenue" value={fmt.peso(orders.filter(o => o.status !== 'cancelled').reduce((a, b) => a + b.total, 0))} icon={<Banknote className="w-5 h-5 text-slate-500" />} />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.entries(counts).map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${tab===k ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            {k === 'in_progress' ? 'In Progress' : k === 'all' ? 'All Orders' : STATUS_LABELS[k]}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${tab===k ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{v}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <SearchBar value={search} onChange={setSearch} placeholder="Search orders, customer, phone, service, status…" className="w-full sm:w-80" />
        </CardHeader>
        <Table maxHeight={350}>
            <Thead>
            <Tr>
              <Th>Order ID</Th>
              <Th>Customer</Th>
              <Th>Date Received</Th>
              <Th align="center">Items</Th>
              <Th align="right">Total</Th>
              <Th>Method</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th align="center">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">Loading orders…</span></Td></Tr>
            ) : error ? (
              <Tr><Td colSpan={9} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
            ) : filtered.length === 0 ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">No orders found</span></Td></Tr>
            ) : visible.map(order => (
              <Tr key={order.id} onClick={() => setViewOrder(order)}>
                <Td className="num text-xs font-semibold text-blue-600">{order.id}</Td>
                <Td className="font-medium text-slate-800">{order.customerName}</Td>
                <Td className="num text-xs text-slate-500">{fmt.shortDate(order.date)}</Td>
                <Td className="num text-sm text-slate-600">{order.services.length}</Td>
                <Td align="right" className="num font-bold text-slate-900">{fmt.peso(order.total)}</Td>
                <Td>
                  <span className={`text-xs font-bold ${order.paymentMethod==='gcash'?'text-blue-600':order.paymentMethod==='cash'?'text-emerald-600':'text-slate-400'}`}>
                    {order.paymentMethod && order.paymentMethod !== 'unpaid' ? order.paymentMethod.toUpperCase() : '—'}
                  </span>
                </Td>
                <Td>
                  <Badge variant={order.paymentStatus === 'paid' ? 'paid' : order.paymentStatus === 'partial' ? 'partial' : 'unpaid'}>
                    {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                  </Badge>
                </Td>
                <Td><Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge></Td>
                <Td align="center">
                  <RowActions>
                    <ViewAction onClick={() => setViewOrder(order)} />
                    <EditAction
                      onClick={() => openEdit(order)}
                      disabled={laundryService.isLocked(order)}
                      title={laundryService.isLocked(order) ? 'Released and paid orders cannot be edited' : 'Edit order'}
                    />
                    <DeleteAction
                      onClick={() => setDeleteTarget(order)}
                      disabled={laundryService.isLocked(order)}
                      title={laundryService.isLocked(order) ? 'Released and paid orders cannot be deleted' : 'Delete order'}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Pagination page={page} total={filtered.length} onPage={setPage} />
      </Card>

      {/* Order Detail Modal */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Order Details" size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setViewOrder(null)}>Close</Button>
              {NEXT_STATUS[viewOrder.status] && (
                <Button variant="primary" onClick={() => updateStatus(viewOrder)}>
                  {NEXT_LABEL[viewOrder.status]}
                </Button>
              )}
            </>
          }>
          <div className="space-y-5">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <p className="text-xl font-bold text-slate-900 tracking-tight">{viewOrder.id}</p>
                <p className="text-sm text-slate-500 mt-1">{viewOrder.customerName}</p>
              </div>
              <Badge variant={STATUS_BADGE[viewOrder.status]}>{STATUS_LABELS[viewOrder.status]}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Customer Phone</p>
                <p className="font-mono text-slate-800">{viewOrder.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date Received</p>
                <p className="text-slate-800">{fmt.datetime(viewOrder.date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Payment Method</p>
                <div>{methodBadge(viewOrder.paymentMethod)}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Payment Status</p>
                <Badge variant={viewOrder.paymentStatus === 'paid' ? 'paid' : viewOrder.paymentStatus === 'partial' ? 'partial' : 'unpaid'}>
                  {viewOrder.paymentStatus}
                </Badge>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase flex justify-between">
                <span>Services</span><span>Amount</span>
              </div>
              <div className="divide-y divide-slate-50">
                {viewOrder.services.map((s: any, i: number) => (
                  <div key={i} className="px-4 py-2.5 text-sm flex justify-between">
                    <span>{s.name} <span className="text-slate-400 text-xs ml-1">({s.qty} {s.unit})</span></span>
                    <span className="font-mono font-medium">{fmt.peso(s.subtotal)}</span>
                  </div>
                ))}
                {viewOrder.addons.map((a: any, i: number) => (
                  <div key={i} className="px-4 py-2.5 text-sm flex justify-between bg-slate-50/50">
                    <span className="text-slate-500 flex items-center gap-1.5"><Tag className="w-3 h-3" /> {a.name}</span>
                    <span className="font-mono text-slate-600">{fmt.peso(a.subtotal || a.price)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-200">
                <div className="px-4 py-2.5 text-sm flex justify-between bg-slate-50">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-mono text-slate-600">{fmt.peso(viewOrder.subtotal)}</span>
                </div>
                {viewOrder.discount > 0 && (
                  <div className="px-4 py-2 text-sm flex justify-between bg-slate-50 border-t border-slate-100 text-green-700">
                    <span>Discount</span>
                    <span className="font-mono">-{fmt.peso(viewOrder.discount)}</span>
                  </div>
                )}
                <div className="px-4 py-3 text-sm flex justify-between border-t border-slate-200 font-bold bg-slate-50">
                  <span className="text-slate-800">TOTAL</span>
                  <span className="font-mono text-slate-900 text-base">{fmt.peso(viewOrder.total)}</span>
                </div>
              </div>
            </div>
            
            {viewOrder.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Notes</p>
                <p className="text-amber-900">{viewOrder.notes}</p>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmPrint(true)} icon={<ReceiptText className="w-4 h-4" />}>Print Receipt</Button>
              {!['released', 'cancelled'].includes(viewOrder.status) && (
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => cancelOrder(viewOrder)}>Cancel Order</Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Order */}
      <Modal
        open={!!editOrder}
        onClose={() => setEditOrder(null)}
        title={`Edit Order ${editOrder?.id ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOrder(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={saveEdit}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Customer Name *" value={editForm.customerName}
            onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))} />
          <Input label="Contact Number" value={editForm.phone}
            onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Discount (₱)" type="number" min={0} value={editForm.discount}
            onChange={e => setEditForm(p => ({ ...p, discount: e.target.value }))} />
          <Textarea label="Notes" rows={2} value={editForm.notes}
            onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />

          {editOrder && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="num font-medium">{fmt.peso(editOrder.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">New Total</span><span className="num font-bold text-slate-900">{fmt.peso(Math.max(0, editOrder.subtotal - (parseFloat(editForm.discount) || 0)))}</span></div>
              <p className="text-xs text-slate-400 pt-1">Service lines keep the price they were sold at.</p>
            </div>
          )}
        </div>
      </Modal>

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeOrder}
        title={`Delete ${deleteTarget?.id ?? ''}?`}
        message="This removes the order and its service lines. Any recorded payment stays in the ledger. This cannot be undone."
        confirmLabel="Delete Order"
        danger
      />

      <Confirm
        open={confirmPrint}
        onClose={() => setConfirmPrint(false)}
        onConfirm={() => viewOrder && printOrderReceipt(viewOrder)}
        title="Print Receipt?"
        message={`Generate a 58mm receipt PDF for order ${viewOrder?.id ?? ''}.`}
        confirmLabel="Print Receipt"
      />
    </div>
  );
}

// ─── Laundry POS ────────────────────────────────────────────────────────────────
interface CartLine { svcId: string; name: string; price: number; qty: number; unit: string; subtotal: number; maxKg?: number | null; }

function LaundryPOS({ onNavigate, userName }: { onNavigate: (p: PageId) => void; userName: string }) {
  const toast = useToast();
  const { byModule } = useProducts();
  const { customers } = useCustomers();
  const { employee } = useAuth();
  const { data: laundryAddons } = useAsync(() => laundryService.listAddons(), []);
  const [saving, setSaving] = useState(false);
  const laundryServices = byModule('laundry').filter(p => p.active);

  const [custSearch, setCustSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCust, setIsNewCust] = useState(false);
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '' });
  
  const [cart, setCart] = useState<CartLine[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cash'|'gcash'|'unpaid'|''>('');
  const [amountReceived, setAmountReceived] = useState('');
  const [gcashRef, setGcashRef] = useState('');

  const [showReceipt, setShowReceipt] = useState(false);
  const [confirmPrint, setConfirmPrint] = useState(false);
  // The database assigns the order id on save; there is none to show before
  // then. Printing a receipt with a made-up id would put a number on paper that
  // no order matches (and that may collide with a real order), so both the
  // receipt id and the print action wait for a successful save to set this.
  const [savedId, setSavedId] = useState<string | null>(null);

  const filteredCusts = customers.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.phone.includes(custSearch)
  );

  const addToCart = (svc: any) => {
    setCart(prev => {
      const ex = prev.find(c => c.svcId === svc.id);
      if (ex) return prev.map(c => c.svcId === svc.id ? {...c, qty: c.qty + 1, subtotal: (c.qty+1)*c.price} : c);
      return [...prev, { svcId: svc.id, name: svc.name, price: svc.price, qty: 1, unit: svc.unit, subtotal: svc.price, maxKg: svc.maxKg ?? null }];
    });
  };

  // These services are priced per load with a weight ceiling per load, so the
  // useful number for the counter staff is how much weight the order covers.
  const capacityKg = useMemo(
    () => cart.reduce((total, line) => total + (line.maxKg ? line.maxKg * line.qty : 0), 0),
    [cart]
  );

  const updateQty = (svcId: string, qty: number) => {
    if (qty <= 0) setCart(p => p.filter(c => c.svcId !== svcId));
    else setCart(p => p.map(c => c.svcId === svcId ? {...c, qty, subtotal: qty*c.price} : c));
  };

  const toggleAddon = (addon: any) => {
    setAddons(prev => prev.find(a => a.id === addon.id) ? prev.filter(a => a.id !== addon.id) : [...prev, addon]);
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.subtotal, 0) + addons.reduce((s, a) => s + a.price, 0);
  const total        = Math.max(0, cartSubtotal - discount);
  const received     = paymentMethod === 'unpaid' ? 0 : (parseFloat(amountReceived) || 0);
  const change       = paymentMethod === 'unpaid' ? 0 : Math.max(0, received - total);
  const balance      = paymentMethod === 'unpaid' ? total : Math.max(0, total - received);

  const custName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : (isNewCust && newCust.firstName ? `${newCust.firstName} ${newCust.lastName}` : null);

  const handleSave = () => {
    if (cart.length === 0) { toast.error('Add at least one service to the order.'); return; }
    if (!custName && !isNewCust && !selectedCustomer) { toast.error('Select a customer for laundry tracking.'); return; }
    if (!paymentMethod) { toast.error('Select payment method or Pay Later.'); return; }
    if (paymentMethod === 'gcash' && received > 0 && !gcashRef) { toast.error('Enter GCash reference.'); return; }
    if (paymentMethod !== 'unpaid' && received <= 0) { toast.error('Enter received amount.'); return; }
    setShowReceipt(true);
  };

  /** Writes the order (and its service/add-on lines) once the receipt is confirmed. */
  const persistOrder = async () => {
    setSaving(true);
    try {
      let customerId: string | null = selectedCustomer?.id ?? null;
      if (!customerId && isNewCust && newCust.firstName) {
        const created = await customerService.findOrCreate({
          firstName: newCust.firstName,
          lastName: newCust.lastName,
          email: newCust.email,
          phone: newCust.phone,
          address: newCust.address,
        });
        customerId = created?.id ?? null;
      }

      const order = await laundryService.createOrder({
        customerId,
        customerName: custName ?? 'Walk-in',
        phone: selectedCustomer?.phone ?? newCust.phone ?? '',
        services: cart.map(c => ({ svcId: c.svcId, qty: c.qty, price: c.price, subtotal: c.subtotal })),
        addons: addons.map(a => ({ id: a.id, qty: 1, price: a.price, subtotal: a.price })),
        subtotal: cartSubtotal,
        discount,
        total,
        paid: paymentMethod === 'unpaid' ? 0 : received,
        change,
        paymentStatus: paymentMethod === 'unpaid' ? 'unpaid' : received >= total ? 'paid' : 'partial',
        paymentMethod: paymentMethod === 'unpaid' ? '' : paymentMethod,
        gcashRef,
        processedBy: userName,
        notes,
      });

      // Mirror the sale into the payment ledger so Finance sees it.
      if (paymentMethod !== 'unpaid' && received > 0) {
        await paymentService.create({
          laundryOrderId: order.id,
          customerId,
          customerName: order.customerName,
          type: 'laundry',
          amount: total,
          amtReceived: received,
          change,
          balance,
          method: paymentMethod,
          status: received >= total ? 'paid' : 'partial',
          gcashRef,
          processedBy: userName,
        });
      }

      await activityService.log(employee?.id ?? null, 'Laundry', `Created laundry order ${order.id} for ${order.customerName}`);

      setSavedId(order.id);
      toast.success(`Order ${order.id} created!`);
      if (change > 0) toast.info(`Change due: ${fmt.peso(change)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the order.');
    } finally {
      setSaving(false);
    }
  };

  // Receipt UI
  if (showReceipt) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="flex items-center gap-3 mb-6">
          {!savedId && <Button variant="outline" size="sm" onClick={() => setShowReceipt(false)} icon={<ChevronLeft className="w-4 h-4" />}>Back to Edit</Button>}
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{savedId ? 'Receipt' : 'Review Receipt'}</h1>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none print:w-full">
          <div className="bg-slate-900 px-6 py-6 text-white text-center rounded-t-2xl">
            <div className="w-12 h-12 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-3">
              <Shirt className="w-6 h-6 text-white" />
            </div>
            <div className="text-xl font-bold tracking-tight">ALMS Laundry Shop</div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Professional Care</div>
            <div className="mt-4 font-mono text-sm bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 inline-block shadow-inner">{savedId ?? 'Not yet saved'}</div>
          </div>
          
          <div className="px-6 py-5 grid grid-cols-2 gap-4 text-sm border-b border-dashed border-slate-200">
            <div><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Customer</p><p className="font-semibold text-slate-800">{custName || 'Walk-in'}</p></div>
            <div className="text-right"><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Date Received</p><p className="font-medium text-slate-800">{new Date().toLocaleString('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p></div>
            <div><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Cashier</p><p className="text-slate-800">{userName}</p></div>
            <div className="text-right"><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Status</p><Badge variant="pending">Pending</Badge></div>
          </div>
          
          <div className="px-6 py-5 border-b border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-4 tracking-wider">Services & Add-ons</p>
            <div className="space-y-3">
              {cart.map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div><span className="font-medium text-slate-800">{c.name}</span><span className="text-slate-500 ml-2 text-xs">× {c.qty} {c.unit}</span></div>
                  <span className="font-mono font-medium text-slate-900">{fmt.peso(c.subtotal)}</span>
                </div>
              ))}
              {addons.map((a, i) => (
                <div key={i} className="flex justify-between text-sm pt-3 mt-3 border-t border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5"><Tag className="w-4 h-4" /> {a.name}</span>
                  <span className="font-mono font-medium text-slate-900">{fmt.peso(a.price)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="px-6 py-4 bg-slate-50">
            <div className="flex justify-between font-bold text-slate-900 text-lg mb-4">
              <span>TOTAL</span><span className="font-mono">{fmt.peso(total)}</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Payment Method</span><span className="font-bold uppercase text-slate-800">{paymentMethod === 'unpaid' ? 'Unpaid' : paymentMethod}</span></div>
              {gcashRef && <div className="flex justify-between text-slate-600"><span>Reference No.</span><span className="font-mono">{gcashRef}</span></div>}
              
              {paymentMethod !== 'unpaid' && (
                <>
                  <div className="flex justify-between text-slate-600"><span>Amount Received</span><span className="font-mono text-slate-800">{fmt.peso(received)}</span></div>
                  {change > 0 && <div className="flex justify-between text-green-700 font-semibold pt-1 border-t border-slate-200 mt-1"><span>Change Due</span><span className="font-mono">{fmt.peso(change)}</span></div>}
                </>
              )}
              
              {balance > 0 && (
                <div className="flex justify-between text-red-600 font-bold pt-1 border-t border-slate-200 mt-1">
                  <span>Balance (Debt)</span><span className="font-mono">{fmt.peso(balance)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className={`px-6 py-4 text-center text-sm font-bold uppercase tracking-widest ${paymentMethod === 'unpaid' || balance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {paymentMethod === 'unpaid' || balance > 0 ? 'UNPAID / DEBT RECORDED' : 'FULLY PAID'}
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 justify-center" disabled={!savedId} onClick={() => setConfirmPrint(true)} icon={<ReceiptText className="w-4 h-4" />}>Print Receipt</Button>
          {savedId
            ? <Button variant="primary" className="flex-1 justify-center" onClick={() => onNavigate('laundry')}>Done</Button>
            : <Button variant="primary" className="flex-1 justify-center" loading={saving} onClick={persistOrder}>Confirm &amp; Finish</Button>}
        </div>

        <Confirm
          open={confirmPrint}
          onClose={() => setConfirmPrint(false)}
          onConfirm={() => {
            printReceipt({
              businessName: 'ALMS Laundry Shop',
              tagline: 'Professional Care',
              txnId: savedId ?? '',
              dateTime: new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
              cashier: userName,
              customer: custName || 'Walk-in',
              items: [
                ...cart.map(c => ({ name: c.name, qty: c.qty, unit: c.unit, price: c.price, subtotal: c.subtotal })),
                ...addons.map(a => ({ name: a.name, qty: 1, price: a.price, subtotal: a.price })),
              ],
              discount: discount > 0 ? discount : undefined,
              total,
              paymentMethod: paymentMethod || 'unpaid',
              amountReceived: paymentMethod !== 'unpaid' ? received : undefined,
              change: change > 0 ? change : undefined,
              balance: balance > 0 ? balance : undefined,
              gcashRef: gcashRef || undefined,
            });
            toast.success('Receipt downloaded.');
          }}
          title="Print Receipt?"
          message={`Generate a 58mm receipt PDF for order ${savedId ?? ''}.`}
          confirmLabel="Print Receipt"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-[calc(100vh-110px)] max-h-[760px]">
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => onNavigate('laundry')} icon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Laundry Order</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">New Order · {new Date().toLocaleDateString('en-PH')}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 min-h-0">
        {/* LEFT PANEL */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-1 pb-4">
          
          {/* Customer Selection */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Customer</h3>
                <div className="flex gap-2">
                  <Button size="xs" variant={!isNewCust ? 'primary' : 'outline'} onClick={() => { setIsNewCust(false); setSelectedCustomer(null); }}>Existing</Button>
                  <Button size="xs" variant={isNewCust ? 'primary' : 'outline'} onClick={() => { setIsNewCust(true); setSelectedCustomer(null); }}>New Customer</Button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="py-4">
              {!isNewCust ? (
                <div className="space-y-3">
                  <SearchBar value={custSearch} onChange={setCustSearch} placeholder="Search customer name or phone…" />
                  {custSearch && !selectedCustomer && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                      {filteredCusts.length === 0 ? (
                        <div className="p-3 text-sm text-center text-slate-500">No customers found</div>
                      ) : filteredCusts.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustSearch(''); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                          <p className="text-sm font-semibold text-slate-900">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{c.phone} · {c.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCustomer && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{selectedCustomer.phone}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{selectedCustomer.email}</p>
                      </div>
                      <Button size="xs" variant="ghost" onClick={() => setSelectedCustomer(null)}>Change</Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input placeholder="First Name *" value={newCust.firstName} onChange={e => setNewCust(p=>({...p,firstName:e.target.value}))} />
                  <Input placeholder="Last Name *" value={newCust.lastName} onChange={e => setNewCust(p=>({...p,lastName:e.target.value}))} />
                  <Input placeholder="Phone Number *" value={newCust.phone} onChange={e => setNewCust(p=>({...p,phone:e.target.value}))} />
                  <Input placeholder="Email (Optional)" type="email" value={newCust.email} onChange={e => setNewCust(p=>({...p,email:e.target.value}))} />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Services Grid */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-semibold text-slate-900 text-sm">Services</h3>
            </CardHeader>
            <CardBody className="py-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {laundryServices.map(svc => {
                  const inCart = cart.find(c => c.svcId === svc.id);
                  return (
                    <div key={svc.id} onClick={() => addToCart(svc)}
                      className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${inCart ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'}`}>
                      {inCart && (
                        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">{inCart.qty}</div>
                      )}
                      <p className="text-sm font-bold text-slate-800 leading-tight mb-1 pr-6">{svc.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-slate-500">{fmt.peso(svc.price)} / {svc.unit}</p>
                        {svc.maxKg ? (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                            up to {svc.maxKg}kg per {svc.unit}
                          </span>
                        ) : null}
                      </div>
                      
                      {inCart && (
                        <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                          <button onClick={() => updateQty(svc.id, inCart.qty - 1)} className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 flex items-center justify-center"><MinusCircle className="w-5 h-5"/></button>
                          <span className="font-mono font-bold text-sm text-blue-900">{inCart.qty}</span>
                          <button onClick={() => updateQty(svc.id, inCart.qty + 1)} className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 flex items-center justify-center"><PlusCircle className="w-5 h-5"/></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-900 text-sm mb-3">Add-ons</h3>
                <div className="flex flex-wrap gap-2">
                  {laundryAddons.map(addon => {
                    const selected = !!addons.find(a => a.id === addon.id);
                    return (
                      <button key={addon.id} onClick={() => toggleAddon(addon)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border font-medium transition-all ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                        {selected && <CheckCircle2 className="w-4 h-4" />}
                        {addon.name}
                        <span className={`text-xs ${selected ? 'text-blue-200' : 'text-slate-400'}`}>+{fmt.peso(addon.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-6">
                 <Textarea label="Special Instructions / Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Handle with care, etc." rows={2} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT PANEL — Cart & Payment */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
          {/* Cart Header */}
          <div className="bg-slate-900 px-6 py-4 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WashingMachine className="w-5 h-5 text-blue-400" />
                <span className="font-bold tracking-wide">Current Order</span>
              </div>
              <div className="flex items-center gap-2">
                {capacityKg > 0 && (
                  <Badge variant="gray" className="bg-slate-800 text-slate-300 border-none">up to {capacityKg}kg</Badge>
                )}
                <Badge variant="blue" className="bg-slate-800 text-blue-400 border-none">{cart.reduce((a,c)=>a+c.qty,0)} Items</Badge>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
            {cart.length === 0 && addons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Shirt className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-sm font-semibold text-slate-400">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">Select services from the left to begin.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map((c, i) => (
                  <div key={i} className="p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{c.name}</p>
                      <button onClick={() => setCart(p => p.filter(x => x.svcId !== c.svcId))} className="text-slate-400 hover:text-red-500">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">
                        {c.qty} × {fmt.peso(c.price)}
                        {c.maxKg ? <span className="text-slate-400"> · up to {c.maxKg * c.qty}kg</span> : null}
                      </div>
                      <span className="font-mono font-bold text-slate-900">{fmt.peso(c.subtotal)}</span>
                    </div>
                  </div>
                ))}
                {addons.map((a, i) => (
                  <div key={`addon-${i}`} className="p-4 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-700">{fmt.peso(a.price)}</span>
                      <button onClick={() => setAddons(p => p.filter(x => x.id !== a.id))} className="text-slate-400 hover:text-red-500">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Section */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white">
            <div className="px-6 py-4">
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span className="font-mono font-medium">{fmt.peso(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>Discount</span>
                  <div className="flex items-center gap-1 w-24">
                    <span className="text-green-600 font-bold">- ₱</span>
                    <input type="number" value={discount || ''} min={0} max={cartSubtotal}
                      onChange={e => setDiscount(Math.min(parseFloat(e.target.value)||0, cartSubtotal))}
                      className="w-full text-right text-sm font-mono font-bold border border-green-200 rounded-md py-1 px-2 outline-none focus:border-green-500 text-green-700 bg-green-50"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-slate-100">
                  <span className="font-bold text-slate-900">Total Amount</span>
                  <span className="font-mono font-bold text-2xl text-slate-900 tracking-tight">{fmt.peso(total)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all ${paymentMethod==='cash' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Banknote className="w-4 h-4" /> Cash
                  </button>
                  <button onClick={() => setPaymentMethod('gcash')} className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all ${paymentMethod==='gcash' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Smartphone className="w-4 h-4" /> GCash
                  </button>
                  <button onClick={() => setPaymentMethod('unpaid')} className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all ${paymentMethod==='unpaid' ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Clock className="w-4 h-4" /> Pay Later
                  </button>
                </div>

                {(paymentMethod === 'cash' || paymentMethod === 'gcash') && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₱</span>
                      <input type="number" value={amountReceived} min={0} onChange={e => setAmountReceived(e.target.value)} placeholder={total.toFixed(2)}
                        className="w-full pl-10 pr-4 py-3 text-lg font-mono font-bold rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-all" />
                    </div>
                    {paymentMethod === 'gcash' && <Input placeholder="GCash Ref #" value={gcashRef} onChange={e=>setGcashRef(e.target.value)} className="mb-3" />}
                    
                    {received >= total && total > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-green-700 bg-green-50 px-4 py-2.5 rounded-xl border border-green-200">
                        <span>Change</span><span className="font-mono text-base">{fmt.peso(change)}</span>
                      </div>
                    )}
                    {received > 0 && received < total && (
                      <div className="flex justify-between items-center text-sm font-bold text-red-700 bg-red-50 px-4 py-2.5 rounded-xl border border-red-200">
                        <span>Balance</span><span className="font-mono text-base">{fmt.peso(balance)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {paymentMethod === 'unpaid' && (
                  <div className="flex justify-between items-center text-sm font-bold text-amber-700 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200 mb-2">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Payment Pending</span><span className="font-mono text-base">{fmt.peso(total)}</span>
                  </div>
                )}

                <Button variant="primary" size="lg" className="w-full justify-center py-3.5!" onClick={handleSave}>
                  Create Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
function LaundryHistoryPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [page, setPage] = useState(1);
  const { data: orders, loading } = useAsync(() => laundryService.listOrders(), []);
  const completed = orders.filter(o => ['released','cancelled'].includes(o.status));
  const range = resolveReportRange(period, { from: customFrom, to: customTo });
  const filtered = completed.filter(o =>
    (tab === 'all' || o.status === tab) &&
    (o.id.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase())) &&
    withinReportRange(o.date, range)
  );

  // Paint one page at a time; `filtered` stays whole for the totals and export.
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, tab, period, customFrom, customTo]);

  const handleExport = () => {
    if (filtered.length === 0) { toast.error('No records to export for the current filters.'); return; }
    const total = filtered.reduce((s, o) => s + o.total, 0);
    exportReportPdf({
      reportTitle: 'Laundry Sales History',
      period: range.label,
      filtersLabel: [tab !== 'all' ? `Status: ${tab}` : null, search ? `Search: "${search}"` : null].filter(Boolean).join(' · ') || undefined,
      columns: ['Order ID', 'Customer', 'Date', 'Services', 'Total', 'Method', 'Payment', 'Status', 'Processed By'],
      rows: filtered.map(o => [
        o.id, o.customerName, fmt.date(o.date), o.services.map(s => s.name).join(', '),
        fmt.peso(o.total), o.paymentMethod ? o.paymentMethod.toUpperCase() : '—',
        o.paymentStatus.toUpperCase(), o.status.toUpperCase(), o.processedBy,
      ]),
      totalsRow: ['', '', '', 'TOTAL', fmt.peso(total), '', '', '', ''],
      fileName: `ALMS_Laundry_Sales_History_${range.label.replace(/\s+/g, '_')}.pdf`,
    });
    toast.success('Laundry Sales History exported.');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Laundry Sales History" subtitle={`${range.label} — completed and cancelled orders`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowExport(true)} icon={<Download className="w-4 h-4" />}>Export PDF</Button>
            <Button onClick={() => onNavigate('laundry')} variant="outline" icon={<ChevronLeft className="w-4 h-4" />}>
              Back to Tracker
            </Button>
          </div>
        } />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search orders…" className="w-72" />
            <div className="flex gap-2">
              {['all','released','cancelled'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all capitalize ${tab===t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {t === 'all' ? 'All History' : t === 'released' ? 'Completed' : 'Cancelled'}
                </button>
              ))}
            </div>
            <PeriodFilter period={period} onPeriodChange={setPeriod} customFrom={customFrom} customTo={customTo}
              onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }} />
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} records</span>
          </div>
        </CardHeader>
        <Table maxHeight={500}>
            <Thead>
              <Tr>
              <Th>Order ID</Th>
              <Th>Customer</Th>
              <Th>Date Received</Th>
              <Th>Services</Th>
              <Th align="right">Total</Th>
              <Th>Method</Th><Th>Payment</Th>
              <Th>Status</Th>
              <Th>Processed By</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">Loading history…</span></Td></Tr>
            ) : filtered.length === 0 ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">No completed orders yet.</span></Td></Tr>
            ) : visible.map(o => (
              <Tr key={o.id}>
                <Td className="font-mono text-xs font-semibold text-blue-600">{o.id}</Td>
                <Td className="font-medium text-slate-800">{o.customerName}</Td>
                <Td className="text-xs text-slate-500 font-medium">{fmt.shortDate(o.date)}</Td>
                <Td className="text-xs text-slate-600 max-w-[150px] truncate">{o.services.map((s:any)=>s.name).join(', ')}</Td>
                <Td align="right" className="font-mono font-bold">{fmt.peso(o.total)}</Td>
                <Td><span className={`text-xs font-bold ${o.paymentMethod==='gcash'?'text-blue-600':'text-emerald-600'}`}>{o.paymentMethod ? o.paymentMethod.toUpperCase() : '—'}</span></Td>
   <Td><Badge variant={o.paymentStatus === 'paid' ? 'paid' : 'unpaid'}>{o.paymentStatus.toUpperCase()}</Badge></Td>
                <Td><Badge variant={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge></Td>
                <Td className="text-xs text-slate-500">{o.processedBy}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Pagination page={page} total={filtered.length} onPage={setPage} />
      </Card>

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={handleExport}
        title="Export Laundry Sales History?"
        reportTitle="Laundry Sales History"
        period={range.label}
        filters={tab === 'all' ? 'All statuses' : tab}
        rowCount={filtered.length}
      />
    </div>
  );
}
