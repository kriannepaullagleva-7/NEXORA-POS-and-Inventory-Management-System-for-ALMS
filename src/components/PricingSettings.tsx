import { useState } from 'react';
import {
  Card, CardHeader, CardBody, Button, Input, Table, Thead, Tbody, Th, Td, Tr,
  useToast, Confirm, RowActions, EditAction, DeleteAction,
} from './ui';
import { Plus, Truck, Tag } from 'lucide-react';
import { fmt } from '../utils/formatters';
import { useAsync } from '../hooks/useAsync';
import { pricingService, calcDeliveryFee, type DeliveryTier } from '../services/pricingService';
import { laundryService } from '../services/laundryService';
import type { LaundryAddon } from '../types/models';

/**
 * Delivery is charged in tiers, not per gallon. Each row is the total charge
 * for exactly that many refilled waters, so 4 refills is ₱155 (100 + 35) and
 * never 4 × ₱35. Quantities beyond the largest tier repeat it and add the
 * remainder, which the preview below makes visible.
 */
export function DeliveryPricingPanel() {
  const toast = useToast();
  const { data: tiers, loading, reload } = useAsync<DeliveryTier[]>(() => pricingService.listDeliveryTiers(), []);
  const [editing, setEditing] = useState<DeliveryTier | null>(null);
  const [form, setForm] = useState({ quantity: '', price: '' });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryTier | null>(null);

  const startAdd = () => { setForm({ quantity: '', price: '' }); setEditing(null); setAdding(true); };
  const startEdit = (tier: DeliveryTier) => {
    setForm({ quantity: String(tier.quantity), price: String(tier.price) });
    setAdding(false);
    setEditing(tier);
  };
  const cancel = () => { setAdding(false); setEditing(null); };

  const save = async () => {
    const quantity = parseInt(form.quantity, 10);
    const price = parseFloat(form.price);
    if (!Number.isFinite(quantity) || quantity < 1) { toast.error('Quantity must be 1 or more.'); return; }
    if (!Number.isFinite(price) || price < 0) { toast.error('Enter a valid price.'); return; }

    setSaving(true);
    try {
      await pricingService.saveDeliveryTier(quantity, price);
      toast.success(`Delivery price for ${quantity} refill${quantity > 1 ? 's' : ''} saved.`);
      cancel();
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the delivery price.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await pricingService.removeDeliveryTier(deleteTarget.id);
      toast.success('Delivery tier removed.');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the tier.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 tracking-tight">Delivery Pricing</h3>
            </div>
            <Button size="sm" onClick={startAdd} icon={<Plus className="w-4 h-4" />}>Add Tier</Button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total delivery charge for that many refilled waters. Pickup / refill at store is charged per
            product instead, from the product price.
          </p>
        </CardHeader>

        <Table>
          <Thead>
            <Tr>
              <Th align="center">Refilled Waters</Th>
              <Th align="right">Delivery Charge</Th>
              <Th align="center">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={3} align="center"><span className="text-slate-500 py-6 block">Loading pricing…</span></Td></Tr>
            ) : tiers.length === 0 ? (
              <Tr><Td colSpan={3} align="center"><span className="text-slate-500 py-6 block">No delivery tiers configured.</span></Td></Tr>
            ) : tiers.map(tier => (
              <Tr key={tier.id}>
                <Td align="center" className="num font-semibold text-slate-900">{tier.quantity}</Td>
                <Td align="right" className="num font-bold text-slate-900">{fmt.peso(tier.price)}</Td>
                <Td align="center">
                  <RowActions>
                    <EditAction onClick={() => startEdit(tier)} title="Edit tier" />
                    <DeleteAction onClick={() => setDeleteTarget(tier)} title="Remove tier" />
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {(adding || editing) && (
          <CardBody className="border-t border-slate-100 bg-slate-50">
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Refilled Waters"
                type="number"
                min={1}
                className="w-40"
                value={form.quantity}
                disabled={Boolean(editing)}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
              />
              <Input
                label="Delivery Charge (₱)"
                type="number"
                min={0}
                className="w-44"
                value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              />
              <div className="flex gap-2 pb-0.5">
                <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
                <Button variant="primary" size="sm" loading={saving} onClick={save}>Save</Button>
              </div>
            </div>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 tracking-tight text-sm">What customers are charged</h3>
          <p className="text-xs text-slate-500 mt-1">Calculated from the tiers above, including quantities with no tier of their own.</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(qty => (
              <div key={qty} className="rounded-lg border border-slate-200 px-3 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{qty} refill{qty > 1 ? 's' : ''}</p>
                <p className="num text-sm font-bold text-slate-900 mt-0.5">{fmt.peso(calcDeliveryFee(qty, tiers))}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Remove delivery tier?"
        message={`The charge for ${deleteTarget?.quantity ?? ''} refilled water(s) will fall back to the next lower tier plus the remainder.`}
        confirmLabel="Remove Tier"
        danger
      />
    </div>
  );
}

/** Laundry add-ons (detergent, softener, bleach…) sold alongside a service. */
export function AddonsPanel() {
  const toast = useToast();
  const { data: addons, loading, reload } = useAsync<LaundryAddon[]>(() => laundryService.listAddons(), []);
  const [editing, setEditing] = useState<LaundryAddon | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LaundryAddon | null>(null);

  const startAdd = () => { setForm({ name: '', price: '' }); setEditing(null); setAdding(true); };
  const startEdit = (addon: LaundryAddon) => {
    setForm({ name: addon.name, price: String(addon.price) });
    setAdding(false);
    setEditing(addon);
  };
  const cancel = () => { setAdding(false); setEditing(null); };

  const save = async () => {
    const price = parseFloat(form.price);
    if (!form.name.trim()) { toast.error('Add-on name is required.'); return; }
    if (!Number.isFinite(price) || price < 0) { toast.error('Enter a valid price.'); return; }

    setSaving(true);
    try {
      if (editing) {
        await laundryService.updateAddon(editing.id, { name: form.name.trim(), price });
        toast.success('Add-on updated.');
      } else {
        await laundryService.createAddon(form.name.trim(), price);
        toast.success('Add-on created.');
      }
      cancel();
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the add-on.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await laundryService.removeAddon(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the add-on.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-slate-900 tracking-tight">Laundry Add-ons</h3>
          </div>
          <Button size="sm" onClick={startAdd} icon={<Plus className="w-4 h-4" />}>Add Add-on</Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">Charged on top of a service in the laundry POS.</p>
      </CardHeader>

      <Table>
        <Thead>
          <Tr>
            <Th>Add-on ID</Th>
            <Th>Name</Th>
            <Th align="right">Price</Th>
            <Th align="center">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {loading ? (
            <Tr><Td colSpan={4} align="center"><span className="text-slate-500 py-6 block">Loading add-ons…</span></Td></Tr>
          ) : addons.length === 0 ? (
            <Tr><Td colSpan={4} align="center"><span className="text-slate-500 py-6 block">No add-ons configured.</span></Td></Tr>
          ) : addons.map(addon => (
            <Tr key={addon.id}>
              <Td className="num text-xs font-semibold text-blue-600">{addon.id}</Td>
              <Td className="font-medium text-slate-800">{addon.name}</Td>
              <Td align="right" className="num font-bold text-slate-900">{fmt.peso(addon.price)}</Td>
              <Td align="center">
                <RowActions>
                  <EditAction onClick={() => startEdit(addon)} title="Edit add-on" />
                  <DeleteAction onClick={() => setDeleteTarget(addon)} title="Remove add-on" />
                </RowActions>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {(adding || editing) && (
        <CardBody className="border-t border-slate-100 bg-slate-50">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Add-on Name" className="w-64" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <Input label="Price (₱)" type="number" min={0} className="w-40" value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            <div className="flex gap-2 pb-0.5">
              <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={save}>Save</Button>
            </div>
          </div>
        </CardBody>
      )}

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title={`Remove ${deleteTarget?.name ?? ''}?`}
        message="Past orders keep the add-on and the price they were sold at. It will no longer be offered in the POS."
        confirmLabel="Remove Add-on"
        danger
      />
    </Card>
  );
}
