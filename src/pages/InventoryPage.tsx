import React, { useState } from 'react';
import {
  PageHeader, Card, CardHeader, CardBody, Badge, Button,
  Table, Thead, Tbody, Th, Td, Tr, Modal, Input, Select, Textarea,
  SearchBar, useToast, KpiCard, StatRow
} from '../components/ui';
import { fmt } from '../utils/formatters';
import { inventoryItems, inventoryProducts, suppliers, purchaseOrders, stockMovements } from '../data/inventory';
import { 
  Package, Boxes, TrendingDown, ArrowDownRight, ArrowUpRight, 
  ShoppingCart, FileText, Plus, Store, Download, FilePlus, Eye,
  Search, AlertCircle, Edit, Trash2, CheckCircle2, Banknote, Smartphone, MapPin
} from 'lucide-react';

import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; }

export default function InventoryPage({ subPage }: Props) {
  if (subPage === 'inventory-products') return <ProductsPage />;
  if (subPage === 'inventory-stock') return <StockMovementsPage />;
  if (subPage === 'inventory-suppliers') return <SuppliersPage />;
  if (subPage === 'inventory-purchase') return <PurchaseOrdersPage />;
  return <InventoryItemsPage />;
}

function ProductsPage() {
  const [products] = useState(inventoryProducts);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', unit: '', unitPrice: '' });
  const toast = useToast();

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
        <div className="max-h-[500px] overflow-y-auto relative">
          <Table>
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
              {filtered.map(p => (
                <Tr key={p.id}>
                  <Td className="font-mono text-[10px] text-slate-500">{p.id}</Td>
                  <Td className="font-semibold text-slate-900">{p.name}</Td>
                  <Td><Badge variant="gray">{p.category}</Badge></Td>
                  <Td align="right" className="font-mono font-medium">{fmt.peso(p.unitPrice)}</Td>
                  <Td className="text-xs text-slate-500 truncate max-w-[200px]">{p.description}</Td>
                  <Td align="center">
                    <Button size="xs" variant="ghost" icon={<Edit className="w-4 h-4 text-slate-400"/>} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Product" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" onClick={() => { toast.success('Product added.'); setShowAdd(false); }}>Save Product</Button></>}>
        <div className="space-y-4">
          <Input label="Product Name *" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Ariel Detergent" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category *" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
              options={[{value:'',label:'Select...'},{value:'Laundry',label:'Laundry'},{value:'Water',label:'Water'},{value:'Accessories',label:'Accessories'},{value:'Office',label:'Office'},{value:'Packaging',label:'Packaging'}]} />
            <Input label="Unit Price (₱) *" type="number" value={form.unitPrice} onChange={e => setForm(p=>({...p,unitPrice:e.target.value}))} placeholder="0.00" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InventoryItemsPage() {
  const [items, setItems] = useState(inventoryItems);
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
  const [siDate, setSiDate] = useState(new Date().toISOString().slice(0, 10));
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

  const handleStockIn = () => {
    if (!siSupplier) { toast.error('Supplier is required for stock-in.'); return; }
    if (!siQty || isNaN(parseFloat(siQty)) || parseFloat(siQty) <= 0) { toast.error('Enter a valid quantity.'); return; }
    if (!siUnitCost || isNaN(parseFloat(siUnitCost))) { toast.error('Enter unit cost.'); return; }
    const qty = parseFloat(siQty);
    setItems(p => p.map(i => {
      if (i.id !== showStockIn.id) return i;
      const newQty = i.currentQty + qty;
      const status = newQty <= 0 ? 'critical' : newQty <= i.reorderLevel ? 'low' : 'normal';
      return { ...i, currentQty: newQty, status };
    }));
    toast.success(`Stock-in recorded: +${qty} ${showStockIn.unit} for ${showStockIn.name}.`);
    setShowStockIn(null); setSiSupplier(''); setSiPORef(''); setSiQty(''); setSiUnitCost(''); setSiRef(''); setSiNotes('');
  };

  const handleStockOut = () => {
    if (!soReason) { toast.error('Select a reason for stock-out.'); return; }
    if (!soQty || isNaN(parseFloat(soQty)) || parseFloat(soQty) <= 0) { toast.error('Enter a valid quantity.'); return; }
    const qty = parseFloat(soQty);
    if (qty > showStockOut.currentQty) { toast.error('Cannot remove more than current stock.'); return; }
    setItems(p => p.map(i => {
      if (i.id !== showStockOut.id) return i;
      const newQty = Math.max(0, i.currentQty - qty);
      const status = newQty <= 0 ? 'critical' : newQty <= i.reorderLevel ? 'low' : 'normal';
      return { ...i, currentQty: newQty, status };
    }));
    toast.success(`Stock-out recorded: −${qty} ${showStockOut.unit} for ${showStockOut.name} (${soReason}).`);
    setShowStockOut(null); setSoReason(''); setSoQty(''); setSoRef(''); setSoNotes('');
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
        <div className="max-h-[400px] overflow-y-auto relative">
          <Table>
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
            {filtered.length === 0 ? (
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
        </div>
      </Card>

      {/* Add Item Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" onClick={() => { toast.success('Item added successfully.'); setShowAdd(false); }}>Save Item</Button></>}>
        <div className="space-y-4">
          <Input label="Item Name" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Ariel Detergent Powder" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
              options={[{value:'',label:'Select...'},{value:'Laundry Supplies',label:'Laundry Supplies'},{value:'Water Supplies',label:'Water Supplies'},{value:'Accessories',label:'Accessories'},{value:'Office Supplies',label:'Office Supplies'},{value:'Packaging',label:'Packaging'}]} />
            <Input label="Unit of Measurement" value={form.unit} onChange={e => setForm(p=>({...p,unit:e.target.value}))} placeholder="e.g. kg, bottle, pcs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Initial Quantity" type="number" value={form.currentQty} onChange={e => setForm(p=>({...p,currentQty:e.target.value}))} placeholder="0" />
            <Input label="Reorder Level" type="number" value={form.reorderLevel} onChange={e => setForm(p=>({...p,reorderLevel:e.target.value}))} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost per Unit (₱)" type="number" value={form.costPerUnit} onChange={e => setForm(p=>({...p,costPerUnit:e.target.value}))} placeholder="0.00" />
            <Select label="Preferred Supplier" value={form.supplier} onChange={e => setForm(p=>({...p,supplier:e.target.value}))}
              options={[{value:'',label:'Select supplier...'}, ...suppliers.map(s=>({value:s.name,label:s.name}))]} />
          </div>
        </div>
      </Modal>

      {/* Stock-In Modal */}
      {showStockIn && (
        <Modal open={!!showStockIn} onClose={() => setShowStockIn(null)} title="Record Stock In" size="md"
          footer={<><Button variant="ghost" onClick={() => setShowStockIn(null)}>Cancel</Button><Button variant="primary" onClick={handleStockIn}>Confirm Stock In</Button></>}>
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
            <div className="grid grid-cols-2 gap-4">
              <Input label="PO Reference (Optional)" placeholder="e.g. PO-0021" value={siPORef} onChange={e => setSiPORef(e.target.value)} />
              <Input label="Delivery Ref / DR #" placeholder="e.g. DR-1234" value={siRef} onChange={e => setSiRef(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={`Quantity Added (${showStockIn.unit}) *`} type="number" value={siQty} onChange={e => setSiQty(e.target.value)} placeholder="0" />
              <Input label="Unit Cost (₱) *" type="number" value={siUnitCost} onChange={e => setSiUnitCost(e.target.value)} placeholder={showStockIn.costPerUnit.toString()} />
            </div>
            {siQty && siUnitCost && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-600">Total Delivery Cost</span>
                <span className="font-mono font-bold text-slate-900 text-lg">{fmt.peso((parseFloat(siQty)||0) * (parseFloat(siUnitCost)||0))}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date Received" type="date" value={siDate} onChange={e => setSiDate(e.target.value)} className="col-span-2" />
            </div>
            <Textarea label="Notes (Optional)" value={siNotes} onChange={e => setSiNotes(e.target.value)} placeholder="Condition, discrepancies, etc." rows={2} />
          </div>
        </Modal>
      )}

      {/* Stock-Out Modal */}
      {showStockOut && (
        <Modal open={!!showStockOut} onClose={() => setShowStockOut(null)} title="Record Stock Out" size="md"
          footer={<><Button variant="ghost" onClick={() => setShowStockOut(null)}>Cancel</Button><Button variant="danger" onClick={handleStockOut}>Confirm Stock Out</Button></>}>
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
            <div className="grid grid-cols-2 gap-4">
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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const filtered = stockMovements.filter(m =>
    (typeFilter === 'all' || m.type === typeFilter) &&
    (m.item.toLowerCase().includes(search.toLowerCase()) ||
    m.ref.toLowerCase().includes(search.toLowerCase()) ||
    m.processedBy.toLowerCase().includes(search.toLowerCase()))
  );
  
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movement Audit Trail" subtitle="Traceability log for all inventory changes"
        actions={<Button variant="outline" icon={<Download className="w-4 h-4" />}>Export CSV</Button>} />
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by item, reference, or user…" className="w-full sm:w-80" />
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
        <Table>
          <Thead>
            <Tr>
              <Th>Log ID</Th>
              <Th>Date & Time</Th>
              <Th>Item</Th>
              <Th>Type</Th>
              <Th align="right">Qty Change</Th>
              <Th align="right">Balance</Th>
              <Th>Source / Reason</Th>
              <Th>References</Th>
              <Th>Processed By</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(m => (
              <Tr key={m.id}>
                <Td className="font-mono text-[10px] text-slate-400">{m.id}</Td>
                <Td className="font-mono text-xs text-slate-600">{m.date}</Td>
                <Td>
                  <p className="font-medium text-slate-900 max-w-[200px] truncate">{m.item}</p>
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
                <Td>
                  {m.type === 'stock_in' ? (
                    <span className="text-sm font-medium text-blue-700">{m.supplierName}</span>
                  ) : (
                    <span className="text-sm font-medium text-amber-700">{m.reason}</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-col gap-0.5">
                    {m.poRef && <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 self-start">PO: {m.poRef}</span>}
                    {m.ref && <span className="text-[10px] font-mono text-slate-500">{m.ref}</span>}
                  </div>
                </Td>
                <Td className="text-xs font-medium text-slate-600">{m.processedBy}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}

function SuppliersPage() {
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();
  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers Directory" subtitle="Manage vendor and distributor contacts"
        actions={<Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Add Supplier</Button>} />
        
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {suppliers.map(sup => (
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
                  <span className="font-mono">{sup.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <div className="w-6 flex justify-center mt-0.5"><MapPin className="w-4 h-4 text-slate-400" /></div>
                  <span className="leading-tight">{sup.address}</span>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                <Button size="xs" variant="outline" className="flex-1 justify-center text-slate-600 border-slate-200" icon={<Edit className="w-3.5 h-3.5"/>}>Edit</Button>
                <Button size="xs" variant="primary" className="flex-1 justify-center" icon={<FilePlus className="w-3.5 h-3.5"/>}>New PO</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Supplier" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" onClick={() => { toast.success('Supplier added.'); setShowAdd(false); }}>Save Supplier</Button></>}>
        <div className="space-y-4">
          <Input label="Company Name *" placeholder="e.g. ABC Supplies" />
          <Input label="Contact Person *" placeholder="e.g. Juan dela Cruz" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email Address" type="email" placeholder="contact@supplier.com" />
            <Input label="Phone Number *" placeholder="02XXXXXXXX" />
          </div>
          <Input label="Physical Address" placeholder="Street, City, Province" />
          <Select label="Supply Category *" value="" onChange={() => {}} options={[{value:'',label:'Select...'},{value:'Laundry Supplies',label:'Laundry Supplies'},{value:'Water Supplies',label:'Water Supplies'},{value:'Mixed',label:'Mixed'},{value:'Office Supplies',label:'Office Supplies'}]} />
        </div>
      </Modal>
    </div>
  );
}

function PurchaseOrdersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" subtitle="Create and track supply procurements"
        actions={<Button onClick={() => setShowCreate(true)} icon={<FilePlus className="w-4 h-4" />}>Create PO</Button>} />
        
      <Card>
        <Table>
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
            {purchaseOrders.map((po: any) => (
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
                  <Button size="xs" variant="ghost" icon={<Eye className="w-4 h-4 text-slate-400"/>} title="View Purchase Order" />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Purchase Order" size="lg"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" onClick={() => { toast.success('Purchase order created successfully.'); setShowCreate(false); }}>Issue PO</Button></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Select label="Supplier *" value="" onChange={() => {}} options={[{value:'',label:'Select supplier...'}, ...suppliers.map(s=>({value:s.id,label:s.name}))]} />
            <Input label="Expected Delivery Date *" type="date" />
          </div>
          
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-bold text-slate-700">Order Items</label>
              <Button size="xs" variant="outline" icon={<Plus className="w-3.5 h-3.5"/>}>Add Item</Button>
            </div>
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No items added yet</p>
              <p className="text-xs text-slate-400 mt-1">Click the Add Item button to build your purchase order.</p>
            </div>
          </div>
          
          <Textarea label="Special Instructions / Notes" placeholder="Delivery time requests, terms, etc." rows={2} />
          
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4">
            <h4 className="font-semibold text-slate-800 text-sm mb-2">Finance Integration</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Record this PO as an expense in Finance automatically</span>
              <Select options={[{value:'unpaid',label:'Mark as Unpaid'},{value:'paid',label:'Mark as Paid / Record Expense'}]} value="unpaid" onChange={()=>{}} className="w-48" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
