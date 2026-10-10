import React, { useRef, useState } from 'react';
import {
  PageHeader, Card, CardHeader, Badge, Button,
  Table, Thead, Tbody, Th, Td, Tr, Modal, Confirm, Input, Select, Textarea,
  SearchBar, useToast, Empty, RowActions, ViewAction, EditAction, DeleteAction, Tabs,
} from './ui';
import { fmt } from '../utils/formatters';
import { matchesQuery } from '../utils/search';
import { DeliveryPricingPanel, AddonsPanel } from './PricingSettings';
import { useProducts } from '../context/DataContext';
import {
  type PosProduct, type PosModule, type PricingType,
  WATER_CATEGORIES, LAUNDRY_CATEGORIES,
} from '../data/products';
import { Plus, ImageOff, Package, Loader2 } from 'lucide-react';

const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  per_load: 'Per Load', per_kg: 'Per Kg', per_item: 'Per Item', per_pair: 'Per Pair', per_unit: 'Per Unit',
};

interface FormState {
  name: string; category: string; price: string; unit: string; type: PricingType;
  description: string; image: string; icon: string; active: boolean; trackStock: boolean; stock: string;
}

const emptyForm = (module: PosModule): FormState => ({
  name: '', category: '', price: '', unit: module === 'water' ? 'pc' : 'load',
  type: module === 'water' ? 'per_unit' : 'per_load',
  description: '', image: '', icon: module === 'water' ? '💧' : '🧺',
  active: true, trackStock: false, stock: '',
});

const toForm = (p: PosProduct): FormState => ({
  name: p.name, category: p.category, price: String(p.price), unit: p.unit, type: p.type,
  description: p.description, image: p.image || '', icon: p.icon || '',
  active: p.active, trackStock: p.trackStock, stock: p.stock !== undefined ? String(p.stock) : '',
});

interface Props { module: PosModule; }

export default function ProductCatalog({ module }: Props) {
  const { loading, error, byModule, createProduct, updateProduct, removeProduct } = useProducts();
  const toast = useToast();

  const [tab, setTab] = useState<'catalog' | 'extras'>('catalog');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<PosProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(module));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [viewProduct, setViewProduct] = useState<PosProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PosProduct | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = module === 'water' ? WATER_CATEGORIES : LAUNDRY_CATEGORIES;
  const moduleLabel = module === 'water' ? 'Water' : 'Laundry';
  const list = byModule(module);

  const filtered = list.filter(p =>
    (catFilter === 'all' || p.category === catFilter) &&
    matchesQuery(search, p.id, p.name, p.category, p.description, p.unit, p.price, PRICING_TYPE_LABELS[p.type], p.active ? 'active' : 'inactive')
  );

  const openAdd = () => {
    setForm(emptyForm(module));
    setErrors({});
    setEditing(null);
    setModalMode('add');
  };

  const openEdit = (p: PosProduct) => {
    setForm(toForm(p));
    setErrors({});
    setEditing(p);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditing(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(p => ({ ...p, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'Product name is required.';
    if (!form.category) next.category = 'Select a category.';
    if (!form.unit.trim()) next.unit = 'Unit is required.';
    const priceNum = parseFloat(form.price);
    if (!form.price || isNaN(priceNum) || priceNum <= 0) next.price = 'Enter a price greater than 0.';
    if (form.trackStock) {
      const stockNum = parseFloat(form.stock);
      if (form.stock === '' || isNaN(stockNum) || stockNum < 0) next.stock = 'Enter a valid stock quantity.';
    }
    const dup = list.find(p =>
      p.name.trim().toLowerCase() === form.name.trim().toLowerCase() && p.id !== editing?.id
    );
    if (dup) next.name = 'A product with this name already exists.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Omit<PosProduct, 'id'> = {
        module, name: form.name.trim(), category: form.category, price: parseFloat(form.price),
        unit: form.unit.trim(), type: form.type, description: form.description.trim(),
        image: form.image || undefined, icon: form.icon || undefined,
        active: form.active, trackStock: form.trackStock,
        stock: form.trackStock ? parseFloat(form.stock) : undefined,
      };
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success(`${form.name} updated.`);
      } else {
        await createProduct(payload);
        toast.success(`${form.name} added to the ${moduleLabel} catalog.`);
      }
      closeModal();
    } catch {
      toast.error('Something went wrong while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeProduct(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted.`);
    } catch {
      toast.error('Could not delete this product. Please try again.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products and Services"
        subtitle={
          module === 'water'
            ? 'Refill products, pickup pricing and delivery charges'
            : 'Laundry services, pricing and add-ons'
        }
        actions={
          tab === 'catalog'
            ? <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Add {module === 'water' ? 'Product' : 'Service'}</Button>
            : undefined
        }
      />

      <Tabs
        tabs={[
          { id: 'catalog', label: module === 'water' ? 'Products' : 'Services' },
          { id: 'extras', label: module === 'water' ? 'Delivery Pricing' : 'Add-ons' },
        ]}
        active={tab}
        onChange={id => setTab(id as 'catalog' | 'extras')}
      />

      {tab === 'extras' ? (
        module === 'water' ? <DeliveryPricingPanel /> : <AddonsPanel />
      ) : (
      <>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder={`Search ${moduleLabel.toLowerCase()} catalog…`} className="w-full sm:w-80" />
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button onClick={() => setCatFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${catFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                All Categories
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${catFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-500 ml-auto whitespace-nowrap">{filtered.length} items</span>
          </div>
        </CardHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading catalog…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-sm font-semibold text-red-600">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 sm:px-6 py-6">
            <Empty
              icon={<Package className="w-10 h-10" />}
              title={search || catFilter !== 'all' ? 'No matching items' : `No ${moduleLabel.toLowerCase()} items yet`}
              description={search || catFilter !== 'all' ? 'Try a different search term or category filter.' : `Add your first ${module === 'water' ? 'product' : 'service'} to make it available in the ${moduleLabel} POS.`}
              action={!search && catFilter === 'all' ? <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Add {module === 'water' ? 'Product' : 'Service'}</Button> : undefined}
            />
          </div>
        ) : (
          <Table maxHeight={520}>
            <Thead>
              <Tr>
                <Th>Item ID</Th>
                <Th>Item Name</Th>
                <Th>Category</Th>
                <Th align="right">Price</Th>
                <Th>Pricing Type</Th>
                <Th>Unit</Th>
                <Th align="center">Status</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map(p => (
                <Tr key={p.id}>
                  <Td className="num text-xs font-semibold text-blue-600">{p.id}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : p.icon ? (
                          <span className="text-lg">{p.icon}</span>
                        ) : (
                          <ImageOff className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <span className="font-semibold text-slate-900">{p.name}</span>
                    </div>
                  </Td>
                  <Td><Badge variant="gray">{p.category}</Badge></Td>
                  <Td align="right" className="num font-medium">{fmt.peso(p.price)}</Td>
                  <Td className="text-xs text-slate-500">{PRICING_TYPE_LABELS[p.type]}</Td>
                  <Td className="text-xs text-slate-500">{p.unit}</Td>
                  <Td align="center"><Badge variant={p.active ? 'active' : 'inactive'}>{p.active ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td align="center">
                    <RowActions>
                      <ViewAction onClick={() => setViewProduct(p)} />
                      <EditAction onClick={() => openEdit(p)} />
                      <DeleteAction onClick={() => setDeleteTarget(p)} />
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'edit' ? `Edit ${module === 'water' ? 'Product' : 'Service'}` : `Add ${module === 'water' ? 'Product' : 'Service'}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {modalMode === 'edit' ? 'Save Changes' : 'Add to Catalog'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.image ? (
                <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
              ) : form.icon ? (
                <span className="text-2xl">{form.icon}</span>
              ) : (
                <ImageOff className="w-6 h-6 text-slate-300" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Upload Image</Button>
              {form.image && (
                <button type="button" onClick={() => setForm(p => ({ ...p, image: '' }))} className="text-xs text-slate-400 hover:text-red-500 text-left">
                  Remove image
                </button>
              )}
            </div>
          </div>

          <Input label="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder={module === 'water' ? 'e.g. 20L Round/Slim Gallon (Refill)' : 'e.g. Clothes Wash (≤8kg)'} error={errors.name} />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Category *" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              options={[{ value: '', label: 'Select...' }, ...categories.map(c => ({ value: c, label: c }))]} error={errors.category} />
            <Input label="Price (₱) *" type="number" min={0} step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              placeholder="0.00" error={errors.price} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit *" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              placeholder={module === 'water' ? 'e.g. gallon, pc, bottle' : 'e.g. load, kg, item, pair'} error={errors.unit} />
            <Select label="Pricing Type *" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as PricingType }))}
              options={Object.entries(PRICING_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          </div>

          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Short description shown to staff in the POS" rows={2} />

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Available in POS
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.trackStock} onChange={e => setForm(p => ({ ...p, trackStock: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Track stock quantity
            </label>
          </div>

          {form.trackStock && (
            <Input label="Stock Quantity *" type="number" min={0} value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
              placeholder="0" error={errors.stock} />
          )}
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewProduct} onClose={() => setViewProduct(null)} title="Item Details" size="md"
        footer={<Button variant="ghost" onClick={() => setViewProduct(null)}>Close</Button>}>
        {viewProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {viewProduct.image ? (
                  <img src={viewProduct.image} alt={viewProduct.name} className="w-full h-full object-cover" />
                ) : viewProduct.icon ? (
                  <span className="text-2xl">{viewProduct.icon}</span>
                ) : (
                  <ImageOff className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{viewProduct.name}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{viewProduct.id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</p><Badge variant="gray">{viewProduct.category}</Badge></div>
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Price</p><p className="font-mono font-medium text-slate-900">{fmt.peso(viewProduct.price)} / {viewProduct.unit}</p></div>
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pricing Type</p><p className="text-slate-800">{PRICING_TYPE_LABELS[viewProduct.type]}</p></div>
              <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p><Badge variant={viewProduct.active ? 'active' : 'inactive'}>{viewProduct.active ? 'Active' : 'Inactive'}</Badge></div>
              {viewProduct.trackStock && (
                <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Stock on Hand</p><p className="text-slate-800">{viewProduct.stock ?? 0} {viewProduct.unit}</p></div>
              )}
            </div>
            {viewProduct.description && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-600">{viewProduct.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        message="This removes the item from the catalog and the POS immediately. This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
