import { useState, useMemo, useEffect } from 'react';
import { matchesQuery } from '../utils/search';
import { today } from '../services/helpers';
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
  Confirm,
  Input,
  Textarea,
  SearchBar,
  PeriodFilter,
  ExportDialog,
  useToast,
  KpiCard,
  Pagination,
  PAGE_SIZE
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { printReceipt, exportReportPdf } from '../utils/pdf';
import { resolveReportRange, withinReportRange, type ReportPeriod } from '../utils/reportPeriod';
import { useAsync } from '../hooks/useAsync';
import { waterService } from '../services/waterService';
import { pricingService, calcDeliveryFee, describeDeliveryFee } from '../services/pricingService';
import { paymentService } from '../services/paymentService';
import { customerService } from '../services/customerService';
import { activityService } from '../services/activityService';
import { useProducts, useCustomers } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { WaterSale } from '../types/models';
import ProductCatalog from '../components/ProductCatalog';
import {
  Droplets,
  Banknote,
  Smartphone,
  ShoppingCart,
  Plus,
  MapPin,
  Truck,
  ChevronLeft,
  Droplet,
  AlertCircle,
  ReceiptText,
  XCircle,
  ImageOff,
  Download
} from 'lucide-react';

import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; onNavigate: (p: PageId) => void; userName: string; }

export default function WaterRefillingPage({ subPage, onNavigate, userName }: Props) {
  if (subPage === 'water-new') return <WaterPOS onNavigate={onNavigate} userName={userName} />;
  if (subPage === 'water-products') return <ProductCatalog module="water" />;
  return <WaterDashboard onNavigate={onNavigate} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function WaterDashboard({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const toast = useToast();
  const { data: waterSales, loading, error } = useAsync(() => waterService.listSales(), []);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [viewSale, setViewSale] = useState<WaterSale | null>(null);
  const [confirmReprint, setConfirmReprint] = useState(false);
  const [page, setPage] = useState(1);

  const range = resolveReportRange(period, { from: customFrom, to: customTo });

  const reprintReceipt = (sale: any) => {
    printReceipt({
      businessName: 'ALMS Water Refilling',
      tagline: 'Alkaline • Purified • Mineral',
      txnId: sale.id,
      dateTime: fmt.datetime(sale.date),
      cashier: sale.processedBy,
      customer: sale.customerName,
      items: sale.items.map((i: any) => ({ name: i.name, qty: i.qty, price: i.price, subtotal: i.subtotal })),
      deliveryFee: sale.deliveryFee > 0 ? sale.deliveryFee : undefined,
      discount: sale.discount > 0 ? sale.discount : undefined,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      amountReceived: sale.amtPaid,
      change: sale.change > 0 ? sale.change : undefined,
      gcashRef: sale.gcashRef || undefined,
    });
    toast.success(`Receipt for ${sale.id} downloaded.`);
  };

  const todaySales = waterSales.filter(s => s.date.startsWith(today()));
  const todayCash  = todaySales.filter(s => s.paymentMethod === 'cash').reduce((a, s) => a + s.total, 0);
  const todayGcash = todaySales.filter(s => s.paymentMethod === 'gcash').reduce((a, s) => a + s.total, 0);
  
  const todayGallons = todaySales.reduce((acc, sale) => {
    return acc + sale.items.reduce((b: number, item: any) => 
      b + (item.name.includes('Gallon') && !item.name.includes('Cap') ? item.qty : 0), 0);
  }, 0);

  const filtered = waterSales.filter(s =>
    matchesQuery(search, s.id, s.date, s.customerName, s.phone, s.address, s.total,
      s.paymentMethod, s.paymentStatus, s.gcashRef, s.processedBy,
      s.delivery ? 'delivery' : 'walk-in pickup', s.items.map(i => i.name)) &&
    withinReportRange(s.date, range)
  );

  // Paint one page at a time; `filtered` stays whole for the totals and export.
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, period, customFrom, customTo]);

  const handleExport = () => {
    if (filtered.length === 0) { toast.error('No records to export for the current filters.'); return; }
    const totals = filtered.reduce((s, sale) => ({ total: s.total + sale.total, delivery: s.delivery + sale.deliveryFee }), { total: 0, delivery: 0 });
    exportReportPdf({
      reportTitle: 'Water Refilling Sales History',
      period: range.label,
      filtersLabel: search ? `Search: "${search}"` : undefined,
      columns: ['Transaction ID', 'Customer', 'Date', 'Items', 'Delivery Fee', 'Total', 'Method', 'Type', 'Processed By'],
      rows: filtered.map(s => [
        s.id, s.customerName, fmt.date(s.date), s.items.map(i => `${i.qty}x ${i.name}`).join(', '),
        s.deliveryFee > 0 ? fmt.peso(s.deliveryFee) : '—', fmt.peso(s.total),
        s.paymentMethod ? s.paymentMethod.toUpperCase() : '—', s.delivery ? 'Delivery' : 'Walk-in', s.processedBy,
      ]),
      totalsRow: ['', '', '', 'TOTAL', fmt.peso(totals.delivery), fmt.peso(totals.total), '', '', ''],
      fileName: `ALMS_Water_Sales_History_${range.label.replace(/\s+/g, '_')}.pdf`,
    });
    toast.success('Water Refilling Sales History exported.');
  };

  const methodBadge = (method: string) => {
    if (method === 'gcash') return <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><Smartphone className="w-3 h-3" /> GCASH</span>;
    if (method === 'cash') return <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Banknote className="w-3 h-3" /> CASH</span>;
    return <span className="text-xs font-bold text-slate-400">—</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Water Refilling" subtitle={`${range.label} — sales, deliveries, and inventory tracking`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowExport(true)} icon={<Download className="w-4 h-4" />}>Export PDF</Button>
            <Button onClick={() => onNavigate('water-new')} icon={<Plus className="w-4 h-4" />}>
              New Sale
            </Button>
          </>
        } />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Today's Revenue" value={fmt.peso(todayCash + todayGcash)} icon={<Droplets className="w-5 h-5 text-blue-500" />} />
        <KpiCard title="Cash Sales" value={fmt.peso(todayCash)} icon={<Banknote className="w-5 h-5 text-green-500" />} />
        <KpiCard title="GCash Sales" value={fmt.peso(todayGcash)} icon={<Smartphone className="w-5 h-5 text-blue-500" />} />
        <KpiCard title="Gallons Sold" value={`${todayGallons} gal`} icon={<Droplet className="w-5 h-5 text-cyan-500" />} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search sales by ID, date, customer, phone, amount, method or status…" className="w-full sm:w-80" />
            <PeriodFilter period={period} onPeriodChange={setPeriod} customFrom={customFrom} customTo={customTo}
              onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }} />
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} records</span>
          </div>
        </CardHeader>
        <Table maxHeight={300}>
            <Thead>
              <Tr>
              <Th>Transaction ID</Th>
              <Th>Customer</Th>
              <Th>Date</Th>
              <Th>Items Summary</Th>
              <Th align="right">Total</Th>
              <Th>Method</Th>
              <Th>Type</Th>
              <Th>Processed By</Th>
              <Th align="center">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">Loading sales…</span></Td></Tr>
            ) : error ? (
              <Tr><Td colSpan={9} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
            ) : filtered.length === 0 ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">No sales found</span></Td></Tr>
            ) : visible.map(sale => (
              <Tr key={sale.id} onClick={() => setViewSale(sale)}>
                <Td className="font-mono text-xs text-blue-600 font-semibold">{sale.id}</Td>
                <Td>
                  <p className="font-medium text-slate-800">{sale.customerName}</p>
                  {sale.phone && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.phone}</p>}
                </Td>
                <Td className="text-xs text-slate-500 font-medium">{fmt.shortDate(sale.date)}</Td>
                <Td className="text-xs text-slate-600 max-w-50 truncate" title={sale.items.map((i:any) => `${i.qty}× ${i.name}`).join(', ')}>
                  {sale.items.map((i:any) => `${i.qty}× ${i.name}`).join(', ')}
                </Td>
                <Td align="right" className="font-mono font-bold text-slate-900">{fmt.peso(sale.total)}</Td>
                <Td>{methodBadge(sale.paymentMethod)}</Td>
                <Td>
                  <Badge variant={sale.delivery ? 'blue' : 'gray'}>
                    {sale.delivery ? 'Delivery' : 'Walk-in'}
                  </Badge>
                </Td>
                <Td className="text-xs text-slate-500">{sale.processedBy}</Td>
                <Td align="center">
                  <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setViewSale(sale); }} icon={<ReceiptText className="w-4 h-4 text-slate-500" />} title="View Details" />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Pagination page={page} total={filtered.length} onPage={setPage} />
      </Card>

      {/* Sale Detail Modal */}
      {viewSale && (
        <Modal open={!!viewSale} onClose={() => setViewSale(null)} title="Water Sale Details" size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setViewSale(null)}>Close</Button>
              <Button variant="outline" onClick={() => setConfirmReprint(true)} icon={<ReceiptText className="w-4 h-4" />}>Reprint Receipt</Button>
            </>
          }>
          <div className="space-y-5">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <p className="text-xl font-bold text-slate-900 tracking-tight">{fmt.peso(viewSale.total)}</p>
                <p className="text-sm text-slate-500 mt-1">{viewSale.customerName}</p>
              </div>
              <Badge variant={viewSale.delivery ? 'blue' : 'gray'}>
                {viewSale.delivery ? 'DELIVERY' : 'WALK-IN'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Transaction ID</p>
                <p className="font-mono text-slate-800">{viewSale.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                <p className="text-slate-800">{fmt.datetime(viewSale.date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Method</p>
                <div>{methodBadge(viewSale.paymentMethod)}</div>
              </div>
              {viewSale.gcashRef && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reference No.</p>
                  <p className="font-mono text-slate-800">{viewSale.gcashRef}</p>
                </div>
              )}
            </div>

            {viewSale.delivery && viewSale.deliveryAddress && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Delivery Details</span>
                </div>
                <p className="text-sm text-blue-900 font-medium">{viewSale.deliveryAddress}</p>
                {viewSale.phone && <p className="text-xs text-blue-700 mt-1">{viewSale.phone}</p>}
                {viewSale.notes && <p className="text-xs text-blue-600 mt-2 italic">"{viewSale.notes}"</p>}
              </div>
            )}

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase flex justify-between">
                <span>Items</span><span>Amount</span>
              </div>
              <div className="divide-y divide-slate-50">
                {viewSale.items.map((item: any, i: number) => (
                  <div key={i} className="px-4 py-2.5 text-sm flex justify-between">
                    <span>{item.qty}× {item.name} <span className="text-slate-400 text-xs ml-1">@ {fmt.peso(item.price)}</span></span>
                    <span className="font-mono font-medium">{fmt.peso(item.qty * item.price)}</span>
                  </div>
                ))}
              </div>
              {viewSale.deliveryFee > 0 && (
                <div className="px-4 py-2.5 text-sm flex justify-between bg-slate-50/50 border-t border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5"><Truck className="w-4 h-4" /> Delivery Fee</span>
                  <span className="font-mono text-slate-700">{fmt.peso(viewSale.deliveryFee)}</span>
                </div>
              )}
              <div className="px-4 py-3 text-sm flex justify-between border-t border-slate-200 font-bold bg-slate-50">
                <span className="text-slate-800">TOTAL</span>
                <span className="font-mono text-slate-900 text-base">{fmt.peso(viewSale.total)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Confirm
        open={confirmReprint}
        onClose={() => setConfirmReprint(false)}
        onConfirm={() => viewSale && reprintReceipt(viewSale)}
        title="Reprint Receipt?"
        message={`Generate an 80mm receipt PDF for transaction ${viewSale?.id ?? ''}.`}
        confirmLabel="Reprint Receipt"
      />

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={handleExport}
        title="Export Water Sales History?"
        reportTitle="Water Refilling Sales History"
        period={range.label}
        rowCount={filtered.length}
      />
    </div>
  );
}

// ─── Water POS ────────────────────────────────────────────────────────────────
interface CartLine { productId: string; name: string; price: number; qty: number; category: string; subtotal: number; countsForDelivery: boolean; }

function WaterPOS({ onNavigate, userName }: { onNavigate: (p: PageId) => void; userName: string }) {
  const toast = useToast();
  const { byModule, refresh: refreshProducts } = useProducts();
  const { customers } = useCustomers();
  const { employee } = useAuth();
  const [saving, setSaving] = useState(false);
  const { data: deliveryTiers } = useAsync(() => pricingService.listDeliveryTiers(), []);
  const waterProducts = byModule('water').filter(p => p.active);

  const [custSearch, setCustSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCust, setIsNewCust] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });
  
  const [cart, setCart] = useState<CartLine[]>([]);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cash'|'gcash'|'unpaid'|''>('');
  const [amountReceived, setAmountReceived] = useState('');
  const [gcashRef, setGcashRef] = useState('');

  const [activeCategory, setActiveCategory] = useState('All');
  const [showReceipt, setShowReceipt] = useState(false);
  const [confirmPrint, setConfirmPrint] = useState(false);
  // The database assigns the transaction id on save; there is none to show
  // before then. Printing a receipt with a made-up id would put a number on
  // paper that no record matches, so both the receipt id and the print action
  // wait for this to be set by a successful save.
  const [savedId, setSavedId] = useState<string | null>(null);

  // Number of refilled waters in the cart — only these drive the delivery tier.
  const refillCount = useMemo(
    () => cart.reduce((acc, item) => (item.countsForDelivery ? acc + item.qty : acc), 0),
    [cart]
  );

  // Delivery is tiered and configured in Products and Services, never qty x rate.
  const deliveryFee = useMemo(
    () => (deliveryEnabled ? calcDeliveryFee(refillCount, deliveryTiers) : 0),
    [deliveryEnabled, refillCount, deliveryTiers]
  );

  // A tiered fee cannot be checked in your head (4 refills is 155, not 4 x 35),
  // so the POS shows which tiers it charged.
  const deliveryBreakdown = useMemo(
    () => describeDeliveryFee(refillCount, deliveryTiers),
    [refillCount, deliveryTiers]
  );

  const filteredCusts = customers.filter(c =>
    matchesQuery(custSearch, c.id, c.firstName, c.lastName, `${c.firstName} ${c.lastName}`, c.phone, c.email, c.address)
  );

  const categories = ['All', ...Array.from(new Set(waterProducts.map(p => p.category)))];
  const displayed = activeCategory === 'All' ? waterProducts : waterProducts.filter(p => p.category === activeCategory);

  const addToCart = (product: any) => {
    setCart(prev => {
      const ex = prev.find(c => c.productId === product.id);
      if (ex) return prev.map(c => c.productId === product.id ? {...c, qty: c.qty + 1, subtotal: (c.qty+1)*c.price} : c);
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1, category: product.category, subtotal: product.price, countsForDelivery: Boolean(product.countsForDelivery) }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart(p => p.filter(c => c.productId !== productId));
    else setCart(p => p.map(c => c.productId === productId ? {...c, qty, subtotal: qty*c.price} : c));
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const total        = cartSubtotal + deliveryFee;
  const received     = paymentMethod === 'unpaid' ? 0 : (parseFloat(amountReceived) || 0);
  const change       = paymentMethod === 'unpaid' ? 0 : Math.max(0, received - total);
  const balance      = paymentMethod === 'unpaid' ? total : Math.max(0, total - received);

  const custName = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : (isNewCust && newCust.name ? newCust.name : null);

  const handleSave = () => {
    if (cart.length === 0) { toast.error('Add at least one item to the cart.'); return; }
    if (deliveryEnabled && !deliveryAddress && !selectedCustomer?.address) { toast.error('Enter delivery address.'); return; }
    if (!paymentMethod) { toast.error('Select payment method or Mark as Debt.'); return; }
    if (paymentMethod === 'gcash' && received > 0 && !gcashRef) { toast.error('Enter GCash reference.'); return; }
    if (paymentMethod !== 'unpaid' && received <= 0) { toast.error('Enter received amount.'); return; }
    setShowReceipt(true);
  };

  /** Persists the sale, its line items, stock deduction and ledger entry. */
  const persistSale = async () => {
    setSaving(true);
    try {
      let customerId: string | null = selectedCustomer?.id ?? null;
      if (!customerId && isNewCust && newCust.name) {
        const [firstName, ...rest] = newCust.name.trim().split(' ');
        const created = await customerService.findOrCreate({
          firstName,
          lastName: rest.join(' '),
          email: '',
          phone: newCust.phone,
          address: newCust.address,
        });
        customerId = created?.id ?? null;
      }

      const sale = await waterService.createSale({
        customerId,
        customerName: custName ?? 'Walk-in',
        phone: selectedCustomer?.phone ?? newCust.phone ?? '',
        address: selectedCustomer?.address ?? newCust.address ?? '',
        items: cart.map(c => ({ productId: c.productId, qty: c.qty, price: c.price, subtotal: c.subtotal })),
        subtotal: cartSubtotal,
        deliveryFee,
        discount: 0,
        total,
        amtPaid: paymentMethod === 'unpaid' ? 0 : received,
        change,
        paymentMethod: paymentMethod === 'unpaid' ? '' : paymentMethod,
        paymentStatus: paymentMethod === 'unpaid' ? 'unpaid' : received >= total ? 'paid' : 'partial',
        gcashRef,
        delivery: deliveryEnabled,
        deliveryAddress: deliveryEnabled ? (deliveryAddress || selectedCustomer?.address || '') : '',
        notes,
        processedBy: userName,
      });

      if (paymentMethod !== 'unpaid' && received > 0) {
        await paymentService.create({
          waterTransactionId: sale.id,
          customerId,
          customerName: sale.customerName,
          type: 'water',
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

      await activityService.log(employee?.id ?? null, 'Water Refilling', `Created water sale ${sale.id} (${fmt.peso(total)})`);
      await refreshProducts(); // stock levels changed

      setSavedId(sale.id);
      toast.success(`Transaction ${sale.id} completed!`);
      if (change > 0) toast.info(`Change due: ${fmt.peso(change)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the transaction.');
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
          {/* Receipt Header */}
          <div className="bg-slate-900 px-6 py-6 text-white text-center rounded-t-2xl">
            <div className="w-12 h-12 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-3">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div className="text-xl font-bold tracking-tight">ALMS Water Refilling</div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Alkaline • Purified • Mineral</div>
            <div className="mt-4 font-mono text-sm bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 inline-block shadow-inner">{savedId ?? 'Not yet saved'}</div>
          </div>
          
          <div className="px-6 py-5 grid grid-cols-2 gap-4 text-sm border-b border-dashed border-slate-200">
            <div><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Customer</p><p className="font-semibold text-slate-800">{custName || 'Walk-in Customer'}</p></div>
            <div className="text-right"><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Date & Time</p><p className="font-medium text-slate-800">{new Date().toLocaleString('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p></div>
            <div><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Cashier</p><p className="text-slate-800">{userName}</p></div>
            <div className="text-right"><p className="text-xs font-semibold text-slate-400 uppercase mb-0.5">Order Type</p><Badge variant={deliveryEnabled?'blue':'gray'}>{deliveryEnabled?'Delivery':'Walk-in / Pickup'}</Badge></div>
          </div>
          
          {deliveryEnabled && (
            <div className="px-6 py-4 bg-slate-50 border-b border-dashed border-slate-200 text-sm">
              <div className="flex items-center gap-2 mb-1.5 text-blue-700">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Delivery Address</span>
              </div>
              <p className="text-slate-700 font-medium pl-6">{deliveryAddress || selectedCustomer?.address}</p>
            </div>
          )}
          
          <div className="px-6 py-5 border-b border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-4 tracking-wider">Items</p>
            <div className="space-y-3">
              {cart.map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div><span className="font-medium text-slate-800">{c.name}</span><span className="text-slate-500 ml-2 text-xs">× {c.qty}</span></div>
                  <span className="font-mono font-medium text-slate-900">{fmt.peso(c.subtotal)}</span>
                </div>
              ))}
              {deliveryEnabled && deliveryFee > 0 && (
                <div className="flex justify-between text-sm pt-3 mt-3 border-t border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5"><Truck className="w-4 h-4" /> Delivery Fee</span>
                  <span className="font-mono font-medium text-slate-900">{fmt.peso(deliveryFee)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="px-6 py-4 bg-slate-50">
            <div className="flex justify-between font-bold text-slate-900 text-lg mb-4">
              <span>TOTAL</span><span className="font-mono">{fmt.peso(total)}</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Payment Method</span><span className="font-bold uppercase text-slate-800">{paymentMethod}</span></div>
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
            ? <Button variant="primary" className="flex-1 justify-center" onClick={() => onNavigate('water')}>Done</Button>
            : <Button variant="primary" className="flex-1 justify-center" loading={saving} onClick={persistSale}>Confirm &amp; Finish</Button>}
        </div>

        <Confirm
          open={confirmPrint}
          onClose={() => setConfirmPrint(false)}
          onConfirm={() => {
            printReceipt({
              businessName: 'ALMS Water Refilling',
              tagline: 'Alkaline • Purified • Mineral',
              txnId: savedId ?? '',
              dateTime: new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
              cashier: userName,
              customer: custName || 'Walk-in Customer',
              items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price, subtotal: c.subtotal })),
              deliveryFee: deliveryEnabled && deliveryFee > 0 ? deliveryFee : undefined,
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
          message={`Generate a 58mm receipt PDF for transaction ${savedId ?? ''}.`}
          confirmLabel="Print Receipt"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-[calc(100vh-110px)] max-h-190">
      <div className="flex items-center gap-4 shrink-0">
        <Button variant="outline" size="sm" onClick={() => onNavigate('water')} icon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Point of Sale</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">New Sale · {new Date().toLocaleDateString('en-PH')}</p>
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
                  <Button size="xs" variant={isNewCust ? 'primary' : 'outline'} onClick={() => { setIsNewCust(true); setSelectedCustomer(null); }}>Walk-in / New</Button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="py-4">
              {!isNewCust ? (
                <div className="space-y-3">
                  <SearchBar value={custSearch} onChange={setCustSearch} placeholder="Search customer by name, phone, email or address…" />
                  {custSearch && !selectedCustomer && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                      {filteredCusts.length === 0 ? (
                        <div className="p-3 text-sm text-center text-slate-500">No customers found</div>
                      ) : filteredCusts.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustSearch(''); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                          <p className="text-sm font-semibold text-slate-900">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{c.phone} · {c.address}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCustomer && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{selectedCustomer.phone}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{selectedCustomer.address}</p>
                      </div>
                      <Button size="xs" variant="ghost" onClick={() => setSelectedCustomer(null)}>Change</Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input placeholder="Customer Name (optional for walk-in)" value={newCust.name} onChange={e => setNewCust(p=>({...p,name:e.target.value}))} className="col-span-2" />
                  <Input placeholder="Phone Number" value={newCust.phone} onChange={e => setNewCust(p=>({...p,phone:e.target.value}))} />
                  <Input placeholder="Address" value={newCust.address} onChange={e => setNewCust(p=>({...p,address:e.target.value}))} />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Delivery Toggle */}
          <Card>
            <CardBody className="p-0">
              {/*
                A real switch, not a div that happens to be clickable: the whole
                row is one button with role="switch", so it is reachable by
                keyboard and announced correctly. Its height does not depend on
                the state, so flipping it does not nudge the rest of the column.
              */}
              <button
                type="button"
                role="switch"
                aria-checked={deliveryEnabled}
                onClick={() => setDeliveryEnabled(p => !p)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-4 text-left rounded-t-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 ${deliveryEnabled ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${deliveryEnabled ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                    <Truck className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-bold text-sm truncate ${deliveryEnabled ? 'text-blue-900' : 'text-slate-800'}`}>
                      Enable Delivery
                    </span>
                    <span className={`block text-xs truncate ${deliveryEnabled ? 'text-blue-600' : 'text-slate-500'}`}>
                      {deliveryEnabled ? 'Charged from the delivery price list' : 'Deliver to the customer address'}
                    </span>
                  </span>
                </span>

                <span className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${deliveryEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${deliveryEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </span>
              </button>

              {deliveryEnabled && (
                <div className="px-4 pt-3 pb-4 border-t border-blue-100 space-y-3">
                  <Textarea
                    label="Delivery Address *"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder={selectedCustomer?.address || 'Enter full address…'}
                    rows={2}
                  />

                  {refillCount === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                      Add refills to the cart to calculate the delivery fee.
                      Caps and empty containers are not charged delivery.
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-sm font-semibold text-blue-800">
                          Delivery Fee
                          <span className="font-normal text-blue-600"> · {refillCount} refill{refillCount === 1 ? '' : 's'}</span>
                        </span>
                        <span className="num font-bold text-blue-900">{fmt.peso(deliveryFee)}</span>
                      </div>
                      {deliveryBreakdown.steps.length > 1 && (
                        <p className="mt-1.5 text-xs text-blue-700/80">
                          {deliveryBreakdown.steps.map(step => `${step.quantity} x ${fmt.peso(step.price)}`).join('  +  ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="px-4 pt-3 pb-4 border-t border-slate-100">
                <Textarea
                  label="Order Notes (Optional)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Delivery timing, container condition, etc."
                  rows={2}
                />
              </div>
            </CardBody>
          </Card>

          {/* Products Grid */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Products</h3>
                <div className="flex gap-2">
                  {categories.map(cat => (
                    <Button key={cat} size="xs" variant={activeCategory === cat ? 'primary' : 'outline'} onClick={() => setActiveCategory(cat)}>
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardBody className="py-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {displayed.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-10 text-center text-slate-400">
                    <ImageOff className="w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">No products in this category yet.</p>
                  </div>
                ) : displayed.map(product => {
                  const inCart = cart.find(c => c.productId === product.id);
                  return (
                    <div key={product.id} onClick={() => addToCart(product)}
                      className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${inCart ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'}`}>
                      {inCart && (
                        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">{inCart.qty}</div>
                      )}
                      <div className="w-12 h-12 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden mb-3">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{product.icon}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-tight mb-1 pr-6">{product.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-500">{fmt.peso(product.price)}</p>
                        <Badge variant="gray" className="text-[10px]">{product.category}</Badge>
                      </div>

                      {inCart && (
                        <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                          <button onClick={() => updateQty(product.id, inCart.qty - 1)} className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200">−</button>
                          <span className="font-mono font-bold text-sm text-blue-900">{inCart.qty}</span>
                          <button onClick={() => updateQty(product.id, inCart.qty + 1)} className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200">+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT PANEL — Cart & Payment */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
          {/* Cart Header */}
          <div className="bg-slate-900 px-6 py-4 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                <span className="font-bold tracking-wide">Current Order</span>
              </div>
              <Badge variant="blue" className="bg-slate-800 text-blue-400 border-none">{cart.reduce((a,c)=>a+c.qty,0)} Items</Badge>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <ShoppingCart className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-sm font-semibold text-slate-400">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">Select products from the left to begin.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map((c, i) => (
                  <div key={i} className="p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{c.name}</p>
                      <button onClick={() => setCart(p => p.filter(x => x.productId !== c.productId))} className="text-slate-400 hover:text-red-500">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">{c.qty} × {fmt.peso(c.price)}</div>
                      <span className="font-mono font-bold text-slate-900">{fmt.peso(c.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Section */}
          <div className="shrink-0 border-t border-slate-200 bg-white">
            <div className="px-6 py-4">
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span className="font-mono font-medium">{fmt.peso(cartSubtotal)}</span>
                </div>
                {deliveryEnabled && (
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Delivery Fee</span><span className="font-mono">{fmt.peso(deliveryFee)}</span>
                  </div>
                )}
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
                  <button onClick={() => setPaymentMethod('unpaid')} className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all ${paymentMethod==='unpaid' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <AlertCircle className="w-4 h-4" /> Debt
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
                  <div className="flex justify-between items-center text-sm font-bold text-red-700 bg-red-50 px-4 py-2.5 rounded-xl border border-red-200 mb-2">
                    <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Debt Balance</span><span className="font-mono text-base">{fmt.peso(total)}</span>
                  </div>
                )}

                <Button variant="primary" size="lg" className="w-full justify-center py-3.5!" onClick={handleSave}>
                  Complete Transaction
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
