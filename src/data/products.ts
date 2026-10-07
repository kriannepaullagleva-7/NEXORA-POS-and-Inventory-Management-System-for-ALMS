import gallonImg from '../assets/gallon.png';
import gallonCapImg from '../assets/gallon-cap.png';
import bigCapImg from '../assets/big-cap.png';

export type PosModule = 'water' | 'laundry';

export type PricingType = 'per_load' | 'per_kg' | 'per_item' | 'per_pair' | 'per_unit';

export interface PosProduct {
  id: string;
  module: PosModule;
  name: string;
  category: string;
  price: number;
  unit: string;
  type: PricingType;
  description: string;
  /** Uploaded image (data URL) from the catalog, otherwise a bundled asset. */
  image?: string;
  /** Emoji fallback so tiles never render blank. */
  icon?: string;
  active: boolean;
  trackStock: boolean;
  stock?: number;
  /** Water only: refills drive the tiered delivery fee. */
  countsForDelivery?: boolean;
  /** Laundry only: weight ceiling per load. */
  maxKg?: number | null;
}

/** Water categories that count toward the per-gallon delivery fee tiers. */
export const DELIVERY_FEE_CATEGORIES = ['Refill', 'Container'];

export const WATER_CATEGORIES = ['Refill', 'Container', 'Cap', 'Bottled'];
export const LAUNDRY_CATEGORIES = ['Clothes', 'Special Items', 'Footwear'];

/**
 * Bundled artwork for the seeded water products. The database stores an
 * `image_url` for anything uploaded through Manage Products; these are the
 * fallbacks for the stock catalog so the POS tiles keep their photos.
 */
export const BUNDLED_PRODUCT_IMAGES: Record<string, string> = {
  'WAT-001': gallonImg,
  'WAT-004': gallonCapImg,
  'WAT-007': gallonImg,
  'WAT-008': bigCapImg,
};
