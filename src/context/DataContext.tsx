import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { productService } from '../services/productService';
import { inventoryService, type StockInInput, type StockOutInput } from '../services/inventoryService';
import { customerService } from '../services/customerService';
import type { PosModule, PosProduct } from '../data/products';
import type { Customer, InventoryItem, StockMovement, Supplier } from '../types/models';
import { useAuth } from './AuthContext';

// Shared, cross-page state only. Page-local data (orders, sales, payments,
// expenses, employees) is fetched by the pages themselves via `useAsync`,
// so one module's refresh never re-renders the rest of the app.

// ─── Products (POS catalog: water_products + laundry_services) ───────────────

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
  const { auth } = useAuth();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await productService.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth) void refresh();
    else {
      setProducts([]);
      setLoading(false);
    }
  }, [auth, refresh]);

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

// ─── Inventory (stock levels + audit trail, shared with the navbar bell) ─────

interface InventoryContextType {
  items: InventoryItem[];
  movements: StockMovement[];
  suppliers: Supplier[];
  lowStockItems: InventoryItem[];
  loading: boolean;
  error: string | null;
  stockIn: (itemId: string, input: StockInInput) => Promise<void>;
  stockOut: (itemId: string, input: StockOutInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextItems, nextMovements, nextSuppliers] = await Promise.all([
        inventoryService.listItems(),
        inventoryService.listMovements(),
        inventoryService.listSuppliers(),
      ]);
      setItems(nextItems);
      setMovements(nextMovements);
      setSuppliers(nextSuppliers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth) void refresh();
    else {
      setItems([]);
      setMovements([]);
      setSuppliers([]);
      setLoading(false);
    }
  }, [auth, refresh]);

  const stockIn = useCallback(
    async (itemId: string, input: StockInInput) => {
      await inventoryService.stockIn(itemId, input);
      await refresh();
    },
    [refresh]
  );

  const stockOut = useCallback(
    async (itemId: string, input: StockOutInput) => {
      await inventoryService.stockOut(itemId, input);
      await refresh();
    },
    [refresh]
  );

  const lowStockItems = useMemo(() => items.filter(i => i.status !== 'normal'), [items]);

  const value = useMemo<InventoryContextType>(
    () => ({ items, movements, suppliers, lowStockItems, loading, error, stockIn, stockOut, refresh }),
    [items, movements, suppliers, lowStockItems, loading, error, stockIn, stockOut, refresh]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an InventoryProvider');
  return ctx;
};

// ─── Customers (shared by both POS screens) ──────────────────────────────────

interface CustomersContextType {
  customers: Customer[];
  loading: boolean;
  refresh: () => Promise<void>;
  addCustomer: (input: Omit<Customer, 'id'>) => Promise<Customer>;
}

const CustomersContext = createContext<CustomersContextType | undefined>(undefined);

export const CustomersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await customerService.list());
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth) void refresh();
    else {
      setCustomers([]);
      setLoading(false);
    }
  }, [auth, refresh]);

  const addCustomer = useCallback(async (input: Omit<Customer, 'id'>) => {
    const created = await customerService.create(input);
    setCustomers(prev => [...prev, created]);
    return created;
  }, []);

  const value = useMemo<CustomersContextType>(
    () => ({ customers, loading, refresh, addCustomer }),
    [customers, loading, refresh, addCustomer]
  );

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
};

export const useCustomers = () => {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error('useCustomers must be used within a CustomersProvider');
  return ctx;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProductsProvider>
    <InventoryProvider>
      <CustomersProvider>{children}</CustomersProvider>
    </InventoryProvider>
  </ProductsProvider>
);
