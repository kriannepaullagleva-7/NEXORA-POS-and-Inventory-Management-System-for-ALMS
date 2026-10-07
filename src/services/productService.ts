import { supabase } from '../lib/supabase';
import { BUNDLED_PRODUCT_IMAGES, type PosModule, type PosProduct, type PricingType } from '../data/products';
import type { LaundryServiceRow, WaterProductRow } from '../types/database';
import { describeError, nextId, unwrap } from './helpers';

/**
 * The POS catalog spans two tables: `water_products` and `laundry_services`.
 * This service presents both as one `PosProduct` collection so the catalog UI
 * and both POS screens share a single model.
 */
export interface ProductService {
  list(module?: PosModule): Promise<PosProduct[]>;
  create(input: Omit<PosProduct, 'id'>): Promise<PosProduct>;
  update(id: string, patch: Partial<PosProduct>): Promise<PosProduct>;
  remove(id: string): Promise<void>;
}

const waterToProduct = (row: WaterProductRow): PosProduct => ({
  id: row.id,
  module: 'water',
  name: row.name,
  category: row.category,
  price: Number(row.price) || 0,
  unit: row.unit || 'pc',
  type: 'per_unit',
  description: row.description ?? '',
  image: row.image_url ?? BUNDLED_PRODUCT_IMAGES[row.id],
  icon: row.icon ?? undefined,
  active: row.is_active ?? true,
  trackStock: row.track_stock ?? false,
  stock: row.stock === null ? undefined : Number(row.stock),
  countsForDelivery: row.counts_for_delivery ?? false,
});

const laundryToProduct = (row: LaundryServiceRow): PosProduct => ({
  id: row.id,
  module: 'laundry',
  name: row.name,
  category: row.category,
  price: Number(row.price) || 0,
  unit: row.unit,
  type: (row.type as PricingType) || 'per_load',
  description: row.description ?? '',
  icon: '🧺',
  active: row.is_active ?? true,
  trackStock: false,
  maxKg: row.max_kg ?? null,
});

export const productService: ProductService = {
  async list(module) {
    const products: PosProduct[] = [];

    if (module !== 'laundry') {
      const rows = unwrap(await supabase.from('water_products').select('*').order('id')) as WaterProductRow[];
      products.push(...rows.map(waterToProduct));
    }
    if (module !== 'water') {
      const rows = unwrap(await supabase.from('laundry_services').select('*').order('id')) as LaundryServiceRow[];
      products.push(...rows.map(laundryToProduct));
    }
    return products;
  },

  async create(input) {
    if (input.module === 'water') {
      const id = await nextId('water_products', 'WAT-', 3);
      const row = unwrap(
        await supabase
          .from('water_products')
          .insert({
            id,
            name: input.name,
            category: input.category,
            price: input.price,
            unit: input.unit,
            description: input.description || null,
            icon: input.icon || null,
            image_url: input.image ?? null,
            is_active: input.active,
            track_stock: input.trackStock,
            stock: input.trackStock ? (input.stock ?? 0) : null,
            counts_for_delivery: input.countsForDelivery ?? false,
          })
          .select()
          .single()
      ) as WaterProductRow;
      return waterToProduct(row);
    }

    const id = await nextId('laundry_services', 'SVC-', 3);
    const row = unwrap(
      await supabase
        .from('laundry_services')
        .insert({
          id,
          name: input.name,
          category: input.category,
          type: input.type,
          price: input.price,
          unit: input.unit,
          description: input.description || null,
          max_kg: input.maxKg ?? null,
          is_active: input.active,
        })
        .select()
        .single()
    ) as LaundryServiceRow;
    return laundryToProduct(row);
  },

  async update(id, patch) {
    const isWater = id.startsWith('WAT-');

    if (isWater) {
      const update: Record<string, unknown> = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.category !== undefined) update.category = patch.category;
      if (patch.price !== undefined) update.price = patch.price;
      if (patch.unit !== undefined) update.unit = patch.unit;
      if (patch.description !== undefined) update.description = patch.description || null;
      if (patch.icon !== undefined) update.icon = patch.icon || null;
      if (patch.image !== undefined) update.image_url = patch.image ?? null;
      if (patch.active !== undefined) update.is_active = patch.active;
      if (patch.trackStock !== undefined) update.track_stock = patch.trackStock;
      if (patch.stock !== undefined) update.stock = patch.stock ?? null;
      if (patch.countsForDelivery !== undefined) update.counts_for_delivery = patch.countsForDelivery;

      const row = unwrap(
        await supabase.from('water_products').update(update).eq('id', id).select().single()
      ) as WaterProductRow;
      return waterToProduct(row);
    }

    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.price !== undefined) update.price = patch.price;
    if (patch.unit !== undefined) update.unit = patch.unit;
    if (patch.type !== undefined) update.type = patch.type;
    if (patch.description !== undefined) update.description = patch.description || null;
    if (patch.maxKg !== undefined) update.max_kg = patch.maxKg ?? null;
    if (patch.active !== undefined) update.is_active = patch.active;

    const row = unwrap(
      await supabase.from('laundry_services').update(update).eq('id', id).select().single()
    ) as LaundryServiceRow;
    return laundryToProduct(row);
  },

  async remove(id) {
    const table = id.startsWith('WAT-') ? 'water_products' : 'laundry_services';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(describeError(error));
  },
};
