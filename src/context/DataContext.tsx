import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { productService } from '../services/productService';
import type { PosProduct, PosModule } from '../data/products';
import { inventoryItems as inventoryItemsSeed, stockMovements as stockMovementsSeed } from '../data/inventory';
import type { InventoryItem, StockMovement } from '../data/inventory';

// ─── Products context ──────────────────────────────────────────────────────
// Everything here goes through `productService`. Swapping the in-memory
// adapter for Supabase later touches only src/services/productService.ts —
// this context, and every component that consumes it, stays unchanged.

interface ProductsContextType {
  products: PosProduct[];
  loading: boolean;
  error: string | null;
  byModule: (m: PosModule) => PosProduct[];
  createProduct: (input: Omit<PosProduct, 'id'>) => Promise<PosProduct>;
  updateProduct: (id: string, patch: Partial<PosProduct>) => Promise<PosProduct>;
  removeProduct: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export const ProductsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await productService.list();
      setProducts(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createProduct = useCallback(async (input: Omit<PosProduct, 'id'>) => {
    const created = await productService.create(input);
    setProducts(prev => [created, ...prev]);
    return created;
  }, []);

  const updateProduct = useCallback(async (id: string, patch: Partial<PosProduct>) => {
    const updated = await productService.update(id, patch);
    setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const removeProduct = useCallback(async (id: string) => {
    await productService.remove(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const byModule = useCallback((m: PosModule) => products.filter(p => p.module === m), [products]);

  const value = useMemo<ProductsContextType>(
    () => ({ products, loading, error, byModule, createProduct, updateProduct, removeProduct, refresh }),
    [products, loading, error, byModule, createProduct, updateProduct, removeProduct, refresh]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
};

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
};

// ─── Inventory context ─────────────────────────────────────────────────────
// Holds supply stock levels + the stock movement audit trail so stock-in/out
// recorded in one page (Inventory) is immediately visible in another
// (Stock Movements, the notification bell) without a page refresh.

interface StockInInput { supplierId: string; supplierName: string; poRef: string; ref: string; qty: number; unitCost: number; processedBy: string; reason?: string; }
interface StockOutInput { reason: string; qty: number; ref: string; processedBy: string; }

interface InventoryContextType {
  items: InventoryItem[];
  movements: StockMovement[];
  lowStockItems: InventoryItem[];
  stockIn: (itemId: string, input: StockInInput) => void;
  stockOut: (itemId: string, input: StockOutInput) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

let movementCounter = stockMovementsSeed.length;
const nextMovementId = () => `SM-${String(++movementCounter).padStart(4, '0')}`;

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<InventoryItem[]>(inventoryItemsSeed);
  const [movements, setMovements] = useState<StockMovement[]>(stockMovementsSeed);

  const stockIn = useCallback((itemId: string, input: StockInInput) => {
    setItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const newQty = item.currentQty + input.qty;
      const status: InventoryItem['status'] = newQty <= 0 ? 'critical' : newQty <= item.reorderLevel ? 'low' : 'normal';
      const id = nextMovementId();
      const movement: StockMovement = {
        id, date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        itemId, item: item.name, type: 'stock_in', qty: input.qty, unit: item.unit,
        prevStock: item.currentQty, newStock: newQty,
        supplierId: input.supplierId, supplierName: input.supplierName,
        poRef: input.poRef, ref: input.poRef || input.ref || `ADJ-${id}`,
        processedBy: input.processedBy, reason: input.reason || 'Purchase delivery',
      };
      setMovements(m => [movement, ...m]);
      return prev.map(i => (i.id === itemId ? { ...i, currentQty: newQty, status } : i));
    });
  }, []);

  const stockOut = useCallback((itemId: string, input: StockOutInput) => {
    setItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const newQty = Math.max(0, item.currentQty - input.qty);
      const status: InventoryItem['status'] = newQty <= 0 ? 'critical' : newQty <= item.reorderLevel ? 'low' : 'normal';
      const id = nextMovementId();
      const movement: StockMovement = {
        id, date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        itemId, item: item.name, type: 'stock_out', qty: input.qty, unit: item.unit,
        prevStock: item.currentQty, newStock: newQty,
        supplierId: '', supplierName: '', poRef: '',
        ref: input.ref || `ADJ-${id}`,
        processedBy: input.processedBy, reason: input.reason,
      };
      setMovements(m => [movement, ...m]);
      return prev.map(i => (i.id === itemId ? { ...i, currentQty: newQty, status } : i));
    });
  }, []);

  const lowStockItems = useMemo(() => items.filter(i => i.status !== 'normal'), [items]);

  const value = useMemo<InventoryContextType>(
    () => ({ items, movements, lowStockItems, stockIn, stockOut }),
    [items, movements, lowStockItems, stockIn, stockOut]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an InventoryProvider');
  return ctx;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProductsProvider>
    <InventoryProvider>{children}</InventoryProvider>
  </ProductsProvider>
);
