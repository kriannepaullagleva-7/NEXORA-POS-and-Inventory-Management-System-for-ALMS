import { posProductSeed, type PosProduct, type PosModule } from '../data/products';

export interface ProductService {
  list(module?: PosModule): Promise<PosProduct[]>;
  create(input: Omit<PosProduct, 'id'>): Promise<PosProduct>;
  update(id: string, patch: Partial<PosProduct>): Promise<PosProduct>;
  remove(id: string): Promise<void>;
}

/**
 * In-memory adapter seeded from src/data/products.ts. Swapping this for a Supabase
 * implementation later only means replacing `createInMemoryProductService()` below —
 * no POS page, component, or context consumer needs to change, since everything
 * goes through the `ProductService` interface.
 */
function createInMemoryProductService(seed: PosProduct[]): ProductService {
  let rows: PosProduct[] = [...seed];

  const prefixFor = (m: PosModule) => (m === 'water' ? 'WAT' : 'SVC');

  const nextId = (m: PosModule) => {
    const prefix = prefixFor(m);
    const maxSuffix = rows
      .filter(r => r.id.startsWith(prefix + '-'))
      .map(r => parseInt(r.id.slice(prefix.length + 1), 10))
      .filter(n => !isNaN(n))
      .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}-${String(maxSuffix + 1).padStart(3, '0')}`;
  };

  // Simulated network latency keeps loading states honest without adding a dependency.
  const delay = () => new Promise(r => setTimeout(r, 180));

  return {
    async list(module) {
      await delay();
      return module ? rows.filter(r => r.module === module) : [...rows];
    },
    async create(input) {
      await delay();
      const product: PosProduct = { ...input, id: nextId(input.module) };
      rows = [product, ...rows];
      return product;
    },
    async update(id, patch) {
      await delay();
      const idx = rows.findIndex(r => r.id === id);
      if (idx === -1) throw new Error(`Product ${id} not found`);
      const updated = { ...rows[idx], ...patch, id };
      rows = [...rows.slice(0, idx), updated, ...rows.slice(idx + 1)];
      return updated;
    },
    async remove(id) {
      await delay();
      rows = rows.filter(r => r.id !== id);
    },
  };
}

export const productService: ProductService = createInMemoryProductService(posProductSeed);
