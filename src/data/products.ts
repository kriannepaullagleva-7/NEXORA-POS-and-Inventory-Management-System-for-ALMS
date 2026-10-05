import gallonImg from '../assets/gallon.png';
import gallonCapImg from '../assets/gallon-cap.png';
import bigCapImg from '../assets/big-cap.png';
import { laundryServices } from './laundry';

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
  /** Asset URL today, Supabase Storage URL later. Falls back to `icon` when absent. */
  image?: string;
  /** Emoji fallback retained so tiles never render blank. */
  icon?: string;
  active: boolean;
  trackStock: boolean;
  stock?: number;
}

/** Water categories that count toward the per-gallon delivery fee tiers. */
export const DELIVERY_FEE_CATEGORIES = ['Refill', 'Container'];

export const WATER_CATEGORIES = ['Refill', 'Container', 'Cap', 'Bottled'];
export const LAUNDRY_CATEGORIES = ['Clothes', 'Special Items', 'Footwear'];

const waterSeed: PosProduct[] = [
  {
    id: 'WAT-001', module: 'water', name: '20L Round/Slim Gallon (Refill)', category: 'Refill',
    price: 25, unit: 'gallon', type: 'per_unit', image: gallonImg, icon: '🛢️',
    description: 'Purified water refill for the customer’s own 20L round or slim gallon.',
    active: true, trackStock: false,
  },
  {
    id: 'WAT-007', module: 'water', name: '20L Round/Slim Gallon (Empty)', category: 'Container',
    price: 250, unit: 'pc', type: 'per_unit', image: gallonImg, icon: '🫙',
    description: 'Brand-new empty 20L food-grade container. Sold without water.',
    active: true, trackStock: true, stock: 45,
  },
  {
    id: 'WAT-004', module: 'water', name: 'Gallon Cap (Replacement)', category: 'Cap',
    price: 5, unit: 'pc', type: 'per_unit', image: gallonCapImg, icon: '🔵',
    description: 'Standard replacement cap for slim and round gallons.',
    active: true, trackStock: true, stock: 500,
  },
  {
    id: 'WAT-008', module: 'water', name: 'Big Gallon Cap (Replacement)', category: 'Cap',
    price: 10, unit: 'pc', type: 'per_unit', image: bigCapImg, icon: '🔷',
    description: 'Large-diameter replacement cap for wide-mouth gallons.',
    active: true, trackStock: true, stock: 200,
  },
  {
    id: 'WAT-002', module: 'water', name: '10L Gallon (Refill)', category: 'Refill',
    price: 15, unit: 'gallon', type: 'per_unit', icon: '💧',
    description: 'Purified water refill for 10L containers.',
    active: true, trackStock: false,
  },
  {
    id: 'WAT-003', module: 'water', name: '4L Gallon (Refill)', category: 'Refill',
    price: 10, unit: 'gallon', type: 'per_unit', icon: '💧',
    description: 'Purified water refill for 4L containers.',
    active: true, trackStock: false,
  },
  {
    id: 'WAT-005', module: 'water', name: '500mL Bottled Water', category: 'Bottled',
    price: 20, unit: 'bottle', type: 'per_unit', icon: '🍶',
    description: 'Sealed 500mL purified bottled water.',
    active: true, trackStock: true, stock: 120,
  },
  {
    id: 'WAT-006', module: 'water', name: 'Mineral Water 1L', category: 'Bottled',
    price: 35, unit: 'bottle', type: 'per_unit', icon: '🍶',
    description: 'Sealed 1L mineral water bottle.',
    active: true, trackStock: true, stock: 75,
  },
];

/** Derived from `laundryServices` so the service catalog stays single-source. */
const laundrySeed: PosProduct[] = laundryServices.map(svc => ({
  id: svc.id,
  module: 'laundry' as const,
  name: svc.name,
  category: svc.category,
  price: svc.price,
  unit: svc.unit,
  type: svc.type as PricingType,
  description: `${svc.name} — charged ${svc.type.replace('per_', 'per ')}.`,
  icon: '🧺',
  active: true,
  trackStock: false,
}));

export const posProductSeed: PosProduct[] = [...waterSeed, ...laundrySeed];
