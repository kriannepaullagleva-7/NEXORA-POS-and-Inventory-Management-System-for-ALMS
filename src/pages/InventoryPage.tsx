import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { today } from '../services/helpers';
import {
  PageHeader, Card, CardHeader, CardBody, Badge, Button,
  Table, Thead, Tbody, Th, Td, Tr, Modal, ExportDialog, Confirm, Input, Select, Textarea,
  SearchBar, useToast, KpiCard, StatRow, RowActions, ViewAction, EditAction, DeleteAction
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { matchesQuery } from '../utils/search';
import type { StockMovement, Supplier } from '../types/models';
import { exportReportPdf } from '../utils/pdf';
import { useAsync } from '../hooks/useAsync';
import { inventoryService } from '../services/inventoryService';
import { activityService } from '../services/activityService';
import { useInventory } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  XCircle,
  FileText,
  Plus,
  Store,
  Download,
  FilePlus,
  AlertCircle,
  Edit,
  CheckCircle2,
  Banknote,
  Smartphone,
  MapPin,
  PackageCheck
} from 'lucide-react';

import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; userName?: string; }

export default function InventoryPage({ subPage, userName }: Props) {
  if (subPage === 'inventory-products') return <ProductsPage />;
  if (subPage === 'inventory-stock') return <StockMovementsPage />;
  if (subPage === 'inventory-suppliers') return <SuppliersPage />;
  if (subPage === 'inventory-purchase') return <PurchaseOrdersPage />;
  return <InventoryItemsPage userName={userName || 'Staff'} />;
}

function ProductsPage() {
  const { items: products, loading, error, refresh } = useInventory();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', unit: '', unitPrice: '' });
  const toast = useToast();

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Product name is required.'); return; }
    if (!form.category) { toast.error('Select a category.'); return; }
    const price = parseFloat(form.unitPrice);
    if (!form.unitPrice || isNaN(price) || price <= 0) { toast.error('Enter a valid unit price.'); return; }

    setSaving(true);
    try {
      await inventoryService.createItem({
        name: form.name.trim(),
        category: form.category,
        unit: form.unit.trim() || 'pcs',
        unitPrice: price,
        costPerUnit: price,
        currentQty: 0,
        reorderLevel: 0,
        supplier: '',
        description: '',
      });
      toast.success('Product added.');
      setShowAdd(false);
      setForm({ name: '', category: '', unit: '', unitPrice: '' });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the product.');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p =>
    (catFilter === 'all' || p.category === catFilter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Products Catalog" subtitle="Manage product details and pricing"
        actions={<Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Add Product</Button>} />
        
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search products…" className="w-full sm:w-80" />
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {categories.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${catFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} products</span>
          </div>
        </CardHeader>
        <Table maxHeight={500}>
            <Thead>
              <Tr>
                <Th>Product Code</Th>
                <Th>Product Name</Th>
                <Th>Category</Th>
                <Th align="right">Unit Price</Th>
                <Th>Description</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={6} align="center"><span className="text-slate-500 py-6 block">Loading products…</span></Td></Tr>
              ) : error ? (
                <Tr><Td colSpan={6} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
              ) : filtered.length === 0 ? (
                <Tr><Td colSpan={6} align="center"><span className="text-slate-500 py-6 block">No products found.</span></Td></Tr>
              ) : filtered.map(p => (
                <Tr key={p.id}>
                  <Td className="font-mono text-[10px] text-slate-500">{p.id}</Td>
                  <Td className="font-semibold text-slate-900">{p.name}</Td>
                  <Td><Badge variant="gray">{p.category}</Badge></Td>
                  <Td align="right" className="font-mono font-medium">{fmt.peso(p.unitPrice)}</Td>
                  <Td className="text-xs text-slate-500 truncate max-w-50">{p.description}</Td>
                  <Td align="center">
                    <Button size="xs" variant="ghost" icon={<Edit className="w-4 h-4 text-slate-400"/>} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
        </Table>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Product" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleAdd}>Save Product</Button></>}>
        <div className="space-y-4">
          <Input label="Product Name *" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Ariel Detergent" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Category *" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
              options={[{value:'',label:'Select...'},{value:'Laundry',label:'Laundry'},{value:'Water',label:'Water'},{value:'Accessories',label:'Accessories'},{value:'Office',label:'Office'},{value:'Packaging',label:'Packaging'}]} />
            <Input label="Unit Price (₱) *" type="number" value={form.unitPrice} onChange={e => setForm(p=>({...p,unitPrice:e.target.value}))} placeholder="0.00" />
          </div>
          <Input label="Unit of Measurement" value={form.unit} onChange={e => setForm(p=>({...p,unit:e.target.value}))} placeholder="e.g. kg, bottle, pcs" />
        </div>
      </Modal>
    </div>
  );
}

function InventoryItemsPage({ userName }: { userName: string }) {
  const { items, suppliers, stockIn, stockOut, loading, error } = useInventory();
  const { employee } = useAuth();
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showStockIn, setShowStockIn] = useState<any>(null);
  const [showStockOut, setShowStockOut] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  
  const [form, setForm] = useState({ name: '', category: '', unit: '', currentQty: '', reorderLevel: '', costPerUnit: '', supplier: '' });

  // Stock-In form
  const [siSupplier, setSiSupplier] = useState('');
  const [siPORef, setSiPORef] = useState('');
  const [siQty, setSiQty] = useState('');
  const [siUnitCost, setSiUnitCost] = useState('');
  const [siRef, setSiRef] = useState('');
  const [siDate, setSiDate] = useState(today());
  const [siNotes, setSiNotes] = useState('');

  // Stock-Out form
  const STOCK_OUT_REASONS = ['Laundry Usage', 'Water Refilling Usage', 'Damaged', 'Expired', 'Internal Use', 'Other'];
  const [soReason, setSoReason] = useState('');
  const [soQty, setSoQty] = useState('');
  const [soRef, setSoRef] = useState('');
  const [soNotes, setSoNotes] = useState('');
  const toast = useToast();

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))];
  const filtered = items.filter(i =>
    (catFilter === 'all' || i.category === catFilter) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()))
  );

  const lowCount = items.filter(i => i.status !== 'normal').length;
  const totalValue = items.reduce((s, i) => s + i.currentQty * i.costPerUnit, 0);

  const handleStockIn = async () => {
    if (!siSupplier) { toast.error('Supplier is required for stock-in.'); return; }
    if (!siQty || isNaN(parseFloat(siQty)) || parseFloat(siQty) <= 0) { toast.error('Enter a valid quantity.'); return; }
    if (!siUnitCost || isNaN(parseFloat(siUnitCost))) { toast.error('Enter unit cost.'); return; }
    const qty = parseFloat(siQty);
    const supplier = suppliers.find(s => s.id === siSupplier);

    setBusy(true);
    try {
      await stockIn(showStockIn.id, {
        supplierId: siSupplier, supplierName: supplier?.name || siSupplier,
        poRef: siPORef, ref: siRef, qty, unitCost: parseFloat(siUnitCost),
        processedBy: userName, reason: siNotes || undefined,
      });
      await activityService.log(employee?.id ?? null, 'Inventory', `Stock-in +${qty} ${showStockIn.unit} for ${showStockIn.name}`);
      toast.success(`Stock-in recorded: +${qty} ${showStockIn.unit} for ${showStockIn.name}.`);
      setShowStockIn(null); setSiSupplier(''); setSiPORef(''); setSiQty(''); setSiUnitCost(''); setSiRef(''); setSiNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the stock-in.');
    } finally {
      setBusy(false);
    }
  };

  const handleStockOut = async () => {
    if (!soReason) { toast.error('Select a reason for stock-out.'); return; }
    if (!soQty || isNaN(parseFloat(soQty)) || parseFloat(soQty) <= 0) { toast.error('Enter a valid quantity.'); return; }
    const qty = parseFloat(soQty);
    if (qty > showStockOut.currentQty) { toast.error('Cannot remove more than current stock.'); return; }

    setBusy(true);
    try {
      await stockOut(showStockOut.id, { reason: soReason, qty, ref: soRef, processedBy: userName });
      await activityService.log(employee?.id ?? null, 'Inventory', `Stock-out −${qty} ${showStockOut.unit} for ${showStockOut.name} (${soReason})`);
      toast.success(`Stock-out recorded: −${qty} ${showStockOut.unit} for ${showStockOut.name} (${soReason}).`);
      setShowStockOut(null); setSoReason(''); setSoQty(''); setSoRef(''); setSoNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the stock-out.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Management" subtitle="Manage supply stocks, value, and reorder levels"
        actions={
          <Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Add Item</Button>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Items" value={items.length} icon={<Boxes className="w-5 h-5 text-blue-500" />} />
        <KpiCard title="Low / Critical Stock" value={lowCount} icon={<AlertCircle className="w-5 h-5 text-red-500" />} />
        <KpiCard title="Healthy Stock" value={items.filter(i=>i.status==='normal').length} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} />
        <KpiCard title="Inventory Value" value={fmt.peso(totalValue)} icon={<Banknote className="w-5 h-5 text-slate-500" />} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search items by name or ID…" className="w-full sm:w-80" />
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {categories.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${catFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} items</span>
          </div>
        </CardHeader>
        <Table maxHeight={400}>
            <Thead>
              <Tr>
              <Th>Item Details</Th>
              <Th>Category</Th>
              <Th>Current Stock</Th>
              <Th>Reorder Lvl</Th>
              <Th align="right">Unit Cost</Th>
              <Th>Supplier</Th>
              <Th>Status</Th>
              <Th align="center">Quick Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={8} align="center"><span className="text-slate-500 py-6 block">Loading stock…</span></Td></Tr>
            ) : error ? (
              <Tr><Td colSpan={8} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
            ) : filtered.length === 0 ? (
              <Tr><Td colSpan={8} align="center"><span className="text-slate-500 py-6 block">No items match your filter</span></Td></Tr>
            ) : filtered.map(item => (
              <Tr key={item.id} onClick={() => setViewItem(item)}>
                <Td>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">{item.id}</p>
                </Td>
                <Td><Badge variant="gray">{item.category}</Badge></Td>
                <Td>
                  <span className={`font-mono font-bold text-base ${item.status === 'critical' ? 'text-red-600' : item.status === 'low' ? 'text-amber-600' : 'text-slate-900'}`}>
                    {item.currentQty} <span className="text-xs font-medium text-slate-500">{item.unit}</span>
                  </span>
                </Td>
                <Td className="font-mono text-slate-500">{item.reorderLevel} <span className="text-[10px]">{item.unit}</span></Td>
                <Td align="right" className="font-mono font-medium text-slate-700">{fmt.peso(item.costPerUnit)}</Td>
                <Td className="text-slate-600 text-xs font-medium">{item.supplierName}</Td>
                <Td>
                  <Badge variant={item.status === 'critical' ? 'red' : item.status === 'low' ? 'yellow' : 'normal'}>
                    {item.status.toUpperCase()}
                  </Badge>
                </Td>
                  <Td align="center">
                    <div className="flex gap-1 justify-center" onClick={e => e.stopPropagation()}>
                      <Button size="xs" variant="ghost" className="text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setShowStockIn(item)} icon={<ArrowDownRight className="w-4 h-4"/>} title="Stock In" />
                      <Button size="xs" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setShowStockOut(item)} icon={<ArrowUpRight className="w-4 h-4"/>} title="Stock Out" />
                    </div>
                  </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      {/* Add Item Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" onClick={() => { toast.success('Item added successfully.'); setShowAdd(false); }}>Save Item</Button></>}>
        <div className="space-y-4">
          <Input label="Item Name" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Ariel Detergent Powder" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
              options={[{value:'',label:'Select...'},{value:'Laundry Supplies',label:'Laundry Supplies'},{value:'Water Supplies',label:'Water Supplies'},{value:'Accessories',label:'Accessories'},{value:'Office Supplies',label:'Office Supplies'},{value:'Packaging',label:'Packaging'}]} />
            <Input label="Unit of Measurement" value={form.unit} onChange={e => setForm(p=>({...p,unit:e.target.value}))} placeholder="e.g. kg, bottle, pcs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Initial Quantity" type="number" value={form.currentQty} onChange={e => setForm(p=>({...p,currentQty:e.target.value}))} placeholder="0" />
            <Input label="Reorder Level" type="number" value={form.reorderLevel} onChange={e => setForm(p=>({...p,reorderLevel:e.target.value}))} placeholder="0" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Cost per Unit (₱)" type="number" value={form.costPerUnit} onChange={e => setForm(p=>({...p,costPerUnit:e.target.value}))} placeholder="0.00" />
            <Select label="Preferred Supplier" value={form.supplier} onChange={e => setForm(p=>({...p,supplier:e.target.value}))}
              options={[{value:'',label:'Select supplier...'}, ...suppliers.map(s=>({value:s.name,label:s.name}))]} />
          </div>
        </div>
      </Modal>

      {/* Stock-In Modal */}
      {showStockIn && (
        <Modal open={!!showStockIn} onClose={() => setShowStockIn(null)} title="Record Stock In" size="md"
          footer={<><Button variant="ghost" onClick={() => setShowStockIn(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={handleStockIn}>Confirm Stock In</Button></>}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600"><ArrowUpRight className="w-5 h-5" /></div>
              <div>
                <p className="font-bold text-slate-900">{showStockIn.name}</p>
                <p className="text-xs text-slate-500 font-mono">Current: <span className="font-bold">{showStockIn.currentQty} {showStockIn.unit}</span></p>
              </div>
            </div>
            
            <Select label="Supplier *" value={siSupplier} onChange={e => setSiSupplier(e.target.value)}
              options={[{value:'',label:'Select supplier...'}, ...suppliers.map(s=>({value:s.id,label:s.name}))]} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="PO Reference (Optional)" placeholder="e.g. PO-0021" value={siPORef} onChange={e => setSiPORef(e.target.value)} />
              <Input label="Delivery Ref / DR #" placeholder="e.g. DR-1234" value={siRef} onChange={e => setSiRef(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={`Quantity Added (${showStockIn.unit}) *`} type="number" value={siQty} onChange={e => setSiQty(e.target.value)} placeholder="0" />
              <Input label="Unit Cost (₱) *" type="number" value={siUnitCost} onChange={e => setSiUnitCost(e.target.value)} placeholder={showStockIn.costPerUnit.toString()} />
            </div>
            {siQty && siUnitCost && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-600">Total Delivery Cost</span>
                <span className="font-mono font-bold text-slate-900 text-lg">{fmt.peso((parseFloat(siQty)||0) * (parseFloat(siUnitCost)||0))}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Date Received" type="date" value={siDate} onChange={e => setSiDate(e.target.value)} className="col-span-2" />
            </div>
            <Textarea label="Notes (Optional)" value={siNotes} onChange={e => setSiNotes(e.target.value)} placeholder="Condition, discrepancies, etc." rows={2} />
          </div>
        </Modal>
      )}

      {/* Stock-Out Modal */}
      {showStockOut && (
        <Modal open={!!showStockOut} onClose={() => setShowStockOut(null)} title="Record Stock Out" size="md"
          footer={<><Button variant="ghost" onClick={() => setShowStockOut(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={handleStockOut}>Confirm Stock Out</Button></>}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600"><ArrowDownRight className="w-5 h-5" /></div>
              <div>
                <p className="font-bold text-slate-900">{showStockOut.name}</p>
                <p className="text-xs text-slate-500 font-mono">Current: <span className="font-bold">{showStockOut.currentQty} {showStockOut.unit}</span></p>
              </div>
            </div>

            <Select label="Reason for Stock Out *" value={soReason} onChange={e => setSoReason(e.target.value)}
              options={[{value:'',label:'Select reason...'}, ...STOCK_OUT_REASONS.map(r=>({value:r,label:r}))]} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={`Quantity Removed (${showStockOut.unit}) *`} type="number" value={soQty} onChange={e => setSoQty(e.target.value)} placeholder="0" max={showStockOut.currentQty} />
              <Input label="Reference (Order # etc.)" placeholder="e.g. LAU-0049" value={soRef} onChange={e => setSoRef(e.target.value)} />
            </div>
            {soQty && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-600">Stock After Removal</span>
                <span className={`font-mono font-bold text-lg ${Math.max(0, showStockOut.currentQty - parseFloat(soQty)) <= showStockOut.reorderLevel ? 'text-red-600' : 'text-slate-900'}`}>
                  {Math.max(0, showStockOut.currentQty - (parseFloat(soQty)||0))} {showStockOut.unit}
                </span>
              </div>
            )}
            <Textarea label="Notes (Optional)" value={soNotes} onChange={e => setSoNotes(e.target.value)} placeholder="Additional context…" rows={2} />
          </div>
        </Modal>
      )}

      {/* View Item Modal */}
      {viewItem && (
        <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Item Details" size="sm"
          footer={<Button variant="outline" className="w-full justify-center" onClick={() => setViewItem(null)}>Close Details</Button>}>
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">{viewItem.name}</h3>
              <p className="font-mono text-xs text-slate-500 mt-1">{viewItem.id}</p>
              <Badge variant={viewItem.status === 'critical' ? 'red' : viewItem.status === 'low' ? 'yellow' : 'normal'} className="mt-2">
                {viewItem.status.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-3">
              <StatRow label="Category" value={viewItem.category} />
              <StatRow label="Current Stock" value={<span className="font-bold">{viewItem.currentQty} {viewItem.unit}</span>} mono />
              <StatRow label="Reorder Level" value={`${viewItem.reorderLevel} ${viewItem.unit}`} mono />
              <StatRow label="Cost per Unit" value={fmt.peso(viewItem.costPerUnit)} mono />
              <StatRow label="Total Value" value={<span className="font-bold">{fmt.peso(viewItem.currentQty * viewItem.costPerUnit)}</span>} mono />
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Preferred Supplier</p>
                <p className="text-sm font-medium text-slate-800">{viewItem.supplierName}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StockMovementsPage() {
  const { movements } = useInventory();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);
  const [viewMovement, setViewMovement] = useState<StockMovement | null>(null);
  const toast = useToast();

  const filtered = movements.filter(m =>
    (typeFilter === 'all' || m.type === typeFilter) &&
    matchesQuery(search, m.id, m.item, m.itemId, m.ref, m.poRef, m.processedBy, m.reason, m.supplierName, m.qty, m.unit, m.date)
  );

  const handleExport = () => {
    exportReportPdf({
      reportTitle: 'Stock Movement Audit Trail',
      filtersLabel: typeFilter === 'all' ? 'All records' : typeFilter === 'stock_in' ? 'Stock In only' : 'Stock Out only',
      columns: ['Log ID', 'Date & Time', 'Item', 'Type', 'Qty Change', 'Balance', 'Source / Reason', 'Reference', 'Processed By'],
      rows: filtered.map(m => [
        m.id, m.date, m.item, m.type === 'stock_in' ? 'IN' : 'OUT',
        `${m.type === 'stock_in' ? '+' : '-'}${m.qty} ${m.unit}`, `${m.prevStock} -> ${m.newStock}`,
        m.type === 'stock_in' ? m.supplierName : m.reason, m.poRef ? `PO: ${m.poRef} / ${m.ref}` : m.ref, m.processedBy,
      ]),
      fileName: 'Stock_Movement_Audit_Trail.pdf',
    });
    toast.success('Stock movement report exported.');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movement Audit Trail" subtitle="Traceability log for all inventory changes"
        actions={<Button variant="outline" onClick={() => setShowExport(true)} icon={<Download className="w-4 h-4" />}>Export PDF</Button>} />
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search item, reference, reason, supplier, user…" className="w-full sm:w-80" />
            <div className="flex gap-2">
              {[['all','All Records'], ['stock_in','Stock In'], ['stock_out','Stock Out']].map(([v, l]) => (
                <button key={v} onClick={() => setTypeFilter(v)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${typeFilter===v ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <Table maxHeight={500}>
          <Thead>
            <Tr>
              <Th>Log ID</Th>
              <Th>Date & Time</Th>
              <Th>Item</Th>
              <Th>Type</Th>
              <Th align="right">Qty Change</Th>
              <Th align="right">Balance</Th>
              <Th>Reason</Th>
              <Th>Reference</Th>
              <Th>Processed By</Th>
              <Th align="center">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(m => (
              <Tr key={m.id}>
                <Td className="num text-[10px] text-slate-400">{m.id}</Td>
                <Td className="num text-xs text-slate-600">{fmt.datetime(m.date)}</Td>
                <Td>
                  <p className="font-medium text-slate-900 max-w-50 truncate">{m.item}</p>
                </Td>
                <Td>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${m.type === 'stock_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {m.type === 'stock_in' ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                    {m.type === 'stock_in' ? 'IN' : 'OUT'}
                  </span>
                </Td>
                <Td align="right" className={`font-mono font-bold text-base ${m.type === 'stock_in' ? 'text-green-600' : 'text-red-600'}`}>
                  {m.type === 'stock_in' ? '+' : '−'}{m.qty} <span className="text-xs">{m.unit}</span>
                </Td>
                <Td align="right">
                  <span className="font-mono text-[10px] text-slate-400">{m.prevStock} → </span>
                  <span className="font-mono font-bold text-slate-800">{m.newStock}</span>
                </Td>
                <Td className="text-sm text-slate-700">{m.reason || '—'}</Td>
                <Td className="num text-xs text-slate-600">{m.ref || m.poRef || '—'}</Td>
                <Td className="text-xs font-medium text-slate-600">{m.processedBy}</Td>
                <Td align="center">
                  <RowActions>
                    <ViewAction onClick={() => setViewMovement(m)} />
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      {viewMovement && (
        <Modal open={!!viewMovement} onClose={() => setViewMovement(null)} title="Stock Movement Details" size="md"
          footer={<Button variant="ghost" onClick={() => setViewMovement(null)}>Close</Button>}>
          <div className="space-y-3">
            <StatRow label="Log ID" value={viewMovement.id} mono />
            <StatRow label="Date & Time" value={fmt.datetime(viewMovement.date)} mono />
            <StatRow label="Item" value={viewMovement.item} />
            <StatRow label="Item Code" value={viewMovement.itemId} mono />
            <StatRow label="Movement" value={viewMovement.type === 'stock_in' ? 'Stock In' : 'Stock Out'} />
            <StatRow label="Quantity" value={`${viewMovement.type === 'stock_in' ? '+' : '−'}${viewMovement.qty} ${viewMovement.unit}`} mono />
            <StatRow label="Stock Before" value={viewMovement.prevStock} mono />
            <StatRow label="Stock After" value={viewMovement.newStock} mono />
            <StatRow label="Reason" value={viewMovement.reason || '—'} />
            <StatRow label="Reference" value={viewMovement.ref || '—'} mono />
            <StatRow label="PO Reference" value={viewMovement.poRef || '—'} mono />
            <StatRow label="Supplier" value={viewMovement.supplierName || '—'} />
            <StatRow label="Processed By" value={viewMovement.processedBy || '—'} />
          </div>
        </Modal>
      )}

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={handleExport}
        title="Export Report?"
        reportTitle="Stock Movement Audit Trail"
        filters={typeFilter === 'all' ? 'All records' : typeFilter === 'stock_in' ? 'Stock In only' : 'Stock Out only'}
        rowCount={filtered.length}
      />
    </div>
  );
}

const emptySupplierForm = { name: '', contactPerson: '', phone: '', email: '', address: '', category: '' };

function SuppliersPage() {
  const { suppliers, loading, refresh } = useInventory();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptySupplierForm);
  const toast = useToast();

  const filtered = suppliers.filter(sup =>
    matchesQuery(search, sup.id, sup.name, sup.contactPerson, sup.phone, sup.email, sup.address, sup.category, sup.status)
  );

  const openEdit = (sup: Supplier) => {
    setForm({
      name: sup.name, contactPerson: sup.contactPerson, phone: sup.phone,
      email: sup.email, address: sup.address, category: sup.category,
    });
    setEditSupplier(sup);
  };

  const saveEdit = async () => {
    if (!editSupplier) return;
    if (!form.name.trim()) { toast.error('Supplier name is required.'); return; }
    setSaving(true);
    try {
      await inventoryService.updateSupplier(editSupplier.id, {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        category: form.category,
      });
      toast.success('Supplier updated successfully.');
      setEditSupplier(null);
      setForm(emptySupplierForm);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the supplier.');
    } finally {
      setSaving(false);
    }
  };

  const removeSupplier = async () => {
    if (!deleteSupplier) return;
    try {
      const outcome = await inventoryService.deleteSupplier(deleteSupplier.id);
      toast.success(
        outcome === 'deleted'
          ? `${deleteSupplier.name} deleted.`
          : `${deleteSupplier.name} is used by existing records, so it was deactivated instead.`
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the supplier.');
    } finally {
      setDeleteSupplier(null);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Supplier name is required.'); return; }
    setSaving(true);
    try {
      await inventoryService.createSupplier({
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        category: form.category,
      });
      toast.success('Supplier added successfully.');
      setShowAdd(false);
      setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', category: '' });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers Directory" subtitle="Manage vendor and distributor contacts"
        actions={<Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Add Supplier</Button>} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search name, contact, phone, email, category…" className="w-full sm:w-96" />
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} suppliers</span>
          </div>
        </CardHeader>
      </Card>

      {loading && <Card><CardBody className="py-10 text-center text-sm text-slate-500">Loading suppliers…</CardBody></Card>}
      {!loading && filtered.length === 0 && (
        <Card><CardBody className="py-10 text-center text-sm text-slate-500">
          {suppliers.length === 0 ? 'No suppliers yet. Add your first supplier to get started.' : 'No suppliers match your search.'}
        </CardBody></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(sup => (
          <Card key={sup.id} className="hover:shadow-md transition-shadow">
            <CardBody className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-base border border-slate-200">
                    {sup.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{sup.name}</h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sup.id}</p>
                  </div>
                </div>
                <Badge variant="blue" className="bg-blue-50 text-blue-700 border-none">{sup.category}</Badge>
              </div>
              
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-6 flex justify-center"><Store className="w-4 h-4 text-slate-400" /></div>
                  <span className="font-medium text-slate-900">{sup.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-6 flex justify-center"><Smartphone className="w-4 h-4 text-slate-400" /></div>
                  <span className="num">{sup.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <div className="w-6 flex justify-center mt-0.5"><MapPin className="w-4 h-4 text-slate-400" /></div>
                  <span className="leading-tight">{sup.address}</span>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Badge variant={sup.status === 'active' ? 'active' : 'inactive'}>{sup.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                <div className="flex items-center gap-1">
                  <Button
                    size="xs" variant="outline"
                    onClick={() => navigate(`/inventory/purchase?supplier=${encodeURIComponent(sup.id)}`)}
                    icon={<FilePlus className="w-3.5 h-3.5" />}
                    title={`Create purchase order for ${sup.name}`}
                  >
                    Create PO
                  </Button>
                  <RowActions>
                    <ViewAction onClick={() => setViewSupplier(sup)} title="View supplier" />
                    <EditAction onClick={() => openEdit(sup)} title="Edit supplier" />
                    <DeleteAction onClick={() => setDeleteSupplier(sup)} title="Delete supplier" />
                  </RowActions>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Supplier" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleAdd}>Save Supplier</Button></>}>
        <div className="space-y-4">
          <Input label="Company Name *" placeholder="e.g. ABC Supplies" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Contact Person" placeholder="e.g. Juan dela Cruz" value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email Address" type="email" placeholder="contact@supplier.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <Input label="Phone Number" placeholder="02XXXXXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <Input label="Physical Address" placeholder="Street, City, Province" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          <Select label="Supply Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            options={[{value:'',label:'Select...'},{value:'Laundry',label:'Laundry Supplies'},{value:'Water',label:'Water Supplies'},{value:'Mixed',label:'Mixed'},{value:'Office',label:'Office Supplies'}]} />
        </div>
      </Modal>

      <Modal open={!!editSupplier} onClose={() => setEditSupplier(null)} title={`Edit ${editSupplier?.name ?? 'Supplier'}`} size="md"
        footer={<><Button variant="ghost" onClick={() => setEditSupplier(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={saveEdit}>Save Changes</Button></>}>
        <div className="space-y-4">
          <Input label="Company Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Contact Person" value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <Input label="Phone Number" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <Input label="Physical Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          <Select label="Supply Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            options={[{value:'',label:'Select...'},{value:'Laundry',label:'Laundry Supplies'},{value:'Water',label:'Water Supplies'},{value:'Mixed',label:'Mixed'},{value:'Office',label:'Office Supplies'}]} />
        </div>
      </Modal>

      {viewSupplier && (
        <Modal open={!!viewSupplier} onClose={() => setViewSupplier(null)} title="Supplier Details" size="sm"
          footer={<Button variant="ghost" onClick={() => setViewSupplier(null)}>Close</Button>}>
          <div className="space-y-3">
            <StatRow label="Supplier ID" value={viewSupplier.id} mono />
            <StatRow label="Company Name" value={viewSupplier.name} />
            <StatRow label="Contact Person" value={viewSupplier.contactPerson || '—'} />
            <StatRow label="Phone" value={viewSupplier.phone || '—'} mono />
            <StatRow label="Email" value={viewSupplier.email || '—'} />
            <StatRow label="Address" value={viewSupplier.address || '—'} />
            <StatRow label="Category" value={viewSupplier.category || '—'} />
            <StatRow label="Status" value={<Badge variant={viewSupplier.status === 'active' ? 'active' : 'inactive'}>{viewSupplier.status === 'active' ? 'Active' : 'Inactive'}</Badge>} />
          </div>
        </Modal>
      )}

      <Confirm
        open={!!deleteSupplier}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={removeSupplier}
        title={`Delete ${deleteSupplier?.name ?? ''}?`}
        message="If stock items or expenses reference this supplier it will be deactivated instead of removed, so historical records stay intact."
        confirmLabel="Delete Supplier"
        danger
      />
    </div>
  );
}

interface PoLine { itemId: string; qty: string; unitCost: string; }

function PurchaseOrdersPage() {
  const { data: purchaseOrders, loading, error, reload } = useAsync(() => inventoryService.listPurchaseOrders(), []);
  const { suppliers, items, refresh: refreshInventory } = useInventory();
  const { employee } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [viewPO, setViewPO] = useState<any>(null);
  const [confirmPrintPO, setConfirmPrintPO] = useState(false);
  const [confirmReceivePO, setConfirmReceivePO] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [poForm, setPoForm] = useState({ supplierId: '', expectedDelivery: '', notes: '' });
  const [poLines, setPoLines] = useState<PoLine[]>([]);
  const toast = useToast();

  // Arrived from a supplier card's "Create PO" button — open the form
  // pre-associated with that supplier, then drop the query param so a
  // refresh or Back doesn't reopen it.
  useEffect(() => {
    const supplierId = searchParams.get('supplier');
    if (!supplierId || suppliers.length === 0) return;
    if (!suppliers.some(s => s.id === supplierId)) return;
    setPoForm(p => ({ ...p, supplierId }));
    setShowCreate(true);
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('supplier'); return next; }, { replace: true });
  }, [searchParams, suppliers, setSearchParams]);

  const addPoLine = () => setPoLines(prev => [...prev, { itemId: '', qty: '1', unitCost: '' }]);
  const removePoLine = (index: number) => setPoLines(prev => prev.filter((_, i) => i !== index));

  const updatePoLine = (index: number, field: keyof PoLine, value: string) => {
    setPoLines(prev =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, [field]: value };
        // Pre-fill the cost from the item's current cost when one is picked.
        if (field === 'itemId' && !line.unitCost) {
          const item = items.find(it => it.id === value);
          if (item) next.unitCost = String(item.costPerUnit || item.unitPrice || '');
        }
        return next;
      })
    );
  };

  const poTotal = poLines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitCost) || 0), 0);

  const handleCreatePO = async () => {
    if (!poForm.supplierId) { toast.error('Select a supplier.'); return; }
    const validLines = poLines.filter(l => l.itemId && parseFloat(l.qty) > 0);
    if (validLines.length === 0) { toast.error('Add at least one order item.'); return; }

    setCreating(true);
    try {
      const supplier = suppliers.find(s => s.id === poForm.supplierId);
      const po = await inventoryService.createPurchaseOrder({
        supplierId: poForm.supplierId,
        supplierName: supplier?.name ?? '',
        expectedDelivery: poForm.expectedDelivery,
        requestedBy: employee?.name ?? '',
        notes: poForm.notes,
        items: validLines.map(l => {
          const item = items.find(i => i.id === l.itemId);
          return {
            itemId: l.itemId,
            name: item?.name ?? l.itemId,
            qty: parseFloat(l.qty),
            unit: item?.unit ?? 'pcs',
            unitCost: parseFloat(l.unitCost) || 0,
          };
        }),
      });

      await activityService.log(employee?.id ?? null, 'Inventory', `Created purchase order ${po.id} for ${po.supplierName}`);
      toast.success(`Purchase order ${po.id} created.`);
      setShowCreate(false);
      setPoForm({ supplierId: '', expectedDelivery: '', notes: '' });
      setPoLines([]);
      await reload();
      await refreshInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the purchase order.');
    } finally {
      setCreating(false);
    }
  };

  const handleReceivePO = async () => {
    if (!viewPO) return;
    setReceiving(true);
    try {
      await inventoryService.receivePurchaseOrder(viewPO.id, employee?.name ?? 'Staff');
      toast.success(`${viewPO.id} received — stock updated.`);
      setViewPO(null);
      await reload();
      await refreshInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not receive the purchase order.');
    } finally {
      setReceiving(false);
    }
  };

  const printPO = (po: any) => {
    exportReportPdf({
      reportTitle: `Purchase Order ${po.id}`,
      period: `Issued ${fmt.date(po.date)} · Supplier: ${po.supplierName}`,
      columns: ['Item', 'Qty', 'Unit', 'Unit Cost', 'Subtotal'],
      rows: po.items.map((i: any) => [i.name, i.qty, i.unit, fmt.peso(i.unitCost), fmt.peso(i.subtotal)]),
      totalsRow: ['', '', '', 'Total', fmt.peso(po.total)],
      fileName: `${po.id}.pdf`,
    });
    toast.success(`Purchase order ${po.id} exported.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" subtitle="Create and track supply procurements"
        actions={<Button onClick={() => setShowCreate(true)} icon={<FilePlus className="w-4 h-4" />}>Create PO</Button>} />
        
      <Card>
        <Table maxHeight={500}>
          <Thead>
            <Tr>
              <Th>PO Number</Th>
              <Th>Date</Th>
              <Th>Supplier</Th>
              <Th>Items Count</Th>
              <Th align="right">Total Amount</Th>
              <Th>PO Status</Th>
              <Th>Payment Status</Th>
              <Th>Received Date</Th>
              <Th align="center">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">Loading purchase orders…</span></Td></Tr>
            ) : error ? (
              <Tr><Td colSpan={9} align="center"><span className="text-red-600 py-6 block">{error}</span></Td></Tr>
            ) : purchaseOrders.length === 0 ? (
              <Tr><Td colSpan={9} align="center"><span className="text-slate-500 py-6 block">No purchase orders yet.</span></Td></Tr>
            ) : purchaseOrders.map((po: any) => (
              <Tr key={po.id}>
                <Td className="font-mono text-xs font-bold text-blue-600">{po.id}</Td>
                <Td className="text-sm font-medium text-slate-600">{fmt.date(po.date)}</Td>
                <Td>
                  <p className="font-semibold text-slate-900">{po.supplierName}</p>
                </Td>
                <Td className="text-sm text-slate-500 font-medium">{po.items.length} items</Td>
                <Td align="right" className="font-mono font-bold text-slate-900">{fmt.peso(po.total)}</Td>
                <Td>
                  <Badge variant={po.status === 'received' ? 'blue' : 'gray'}>
                    {po.status === 'received' ? 'RECEIVED' : 'PENDING'}
                  </Badge>
                </Td>
                <Td>
                  <Badge variant={po.paymentStatus === 'paid' ? 'paid' : po.paymentStatus === 'partial' ? 'partial' : 'unpaid'}>
                    {po.paymentStatus === 'paid' ? 'Paid' : po.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                  </Badge>
                </Td>
                <Td className="text-sm text-slate-500 font-medium">{po.receivedDate ? fmt.date(po.receivedDate) : '—'}</Td>
                <Td align="center">
                  <RowActions>
                    <ViewAction onClick={() => setViewPO(po)} title="View Purchase Order" />
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      {viewPO && (
        <Modal open={!!viewPO} onClose={() => setViewPO(null)} title={`Purchase Order ${viewPO.id}`} size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setViewPO(null)}>Close</Button>
              <Button variant="outline" onClick={() => setConfirmPrintPO(true)} icon={<FileText className="w-4 h-4" />}>Export PDF</Button>
              {viewPO.status !== 'received' && (
                <Button variant="primary" loading={receiving} onClick={() => setConfirmReceivePO(true)} icon={<PackageCheck className="w-4 h-4" />}>Receive Stock</Button>
              )}
            </>
          }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Supplier</p><p className="font-medium text-slate-900">{viewPO.supplierName}</p></div>
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date Issued</p><p className="text-slate-800">{fmt.date(viewPO.date)}</p></div>
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p><Badge variant={viewPO.status === 'received' ? 'blue' : 'gray'}>{viewPO.status === 'received' ? 'RECEIVED' : 'PENDING'}</Badge></div>
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Payment</p><Badge variant={viewPO.paymentStatus === 'paid' ? 'paid' : viewPO.paymentStatus === 'partial' ? 'partial' : 'unpaid'}>{viewPO.paymentStatus}</Badge></div>
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase flex justify-between">
                <span>Item</span><span>Amount</span>
              </div>
              <div className="divide-y divide-slate-50">
                {viewPO.items.map((i: any, idx: number) => (
                  <div key={idx} className="px-4 py-2.5 text-sm flex justify-between">
                    <span>{i.qty} {i.unit} × {i.name}</span>
                    <span className="font-mono font-medium">{fmt.peso(i.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 text-sm flex justify-between border-t border-slate-200 font-bold bg-slate-50">
                <span>TOTAL</span><span className="font-mono">{fmt.peso(viewPO.total)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Confirm
        open={confirmPrintPO}
        onClose={() => setConfirmPrintPO(false)}
        onConfirm={() => viewPO && printPO(viewPO)}
        title="Export Purchase Order?"
        message={`Generate a PDF for purchase order ${viewPO?.id ?? ''}.`}
        confirmLabel="Export PDF"
      />

      <Confirm
        open={confirmReceivePO}
        onClose={() => setConfirmReceivePO(false)}
        onConfirm={handleReceivePO}
        title="Receive this delivery?"
        message={`Add every line item on ${viewPO?.id ?? ''} to inventory stock and mark the order received. This can only be done once.`}
        confirmLabel="Receive Stock"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Purchase Order" size="lg"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" loading={creating} onClick={handleCreatePO}>Issue PO</Button></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Select label="Supplier *" value={poForm.supplierId} onChange={e => setPoForm(p => ({ ...p, supplierId: e.target.value }))}
              options={[{value:'',label:'Select supplier...'}, ...suppliers.map(s=>({value:s.id,label:s.name}))]} />
            <Input label="Expected Delivery Date" type="date" value={poForm.expectedDelivery} onChange={e => setPoForm(p => ({ ...p, expectedDelivery: e.target.value }))} />
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-bold text-slate-700">Order Items</label>
              <Button size="xs" variant="outline" onClick={addPoLine} icon={<Plus className="w-3.5 h-3.5"/>}>Add Item</Button>
            </div>

            {poLines.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
                <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-600">No items added yet</p>
                <p className="text-xs text-slate-400 mt-1">Click the Add Item button to build your purchase order.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {poLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_110px_auto] gap-2 items-end border border-slate-200 rounded-xl p-3">
                    <Select label={idx === 0 ? 'Item' : undefined} value={line.itemId}
                      onChange={e => updatePoLine(idx, 'itemId', e.target.value)}
                      options={[{ value: '', label: 'Select item...' }, ...items.map(i => ({ value: i.id, label: i.name }))]} />
                    <Input label={idx === 0 ? 'Qty' : undefined} type="number" min={0} value={line.qty}
                      onChange={e => updatePoLine(idx, 'qty', e.target.value)} />
                    <Input label={idx === 0 ? 'Unit Cost' : undefined} type="number" min={0} value={line.unitCost}
                      onChange={e => updatePoLine(idx, 'unitCost', e.target.value)} />
                    <Button size="xs" variant="ghost" className="text-red-500 hover:bg-red-50 mb-1" onClick={() => removePoLine(idx)} icon={<XCircle className="w-4 h-4" />} />
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 pt-2 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Order Total</span>
                  <span className="font-mono font-bold text-slate-900">{fmt.peso(poTotal)}</span>
                </div>
              </div>
            )}
          </div>

          <Textarea label="Special Instructions / Notes" placeholder="Delivery time requests, terms, etc." rows={2}
            value={poForm.notes} onChange={e => setPoForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
