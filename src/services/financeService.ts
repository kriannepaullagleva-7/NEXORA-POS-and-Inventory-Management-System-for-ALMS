import { supabase } from '../lib/supabase';
import type { ExpenseRow, SupplierRow } from '../types/database';
import type { Expense } from '../types/models';
import { nextId, unwrap } from './helpers';

type ExpenseWithSupplier = ExpenseRow & { suppliers: Pick<SupplierRow, 'name'> | null };

function toExpense(row: ExpenseWithSupplier): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: Number(row.amount) || 0,
    method: row.method,
    supplier: row.suppliers?.name ?? '',
    by: row.recorded_by ?? '',
    notes: row.notes ?? '',
  };
}

export interface CreateExpenseInput {
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string;
  supplierId?: string | null;
  recordedBy: string;
  notes?: string;
}

export const financeService = {
  async listExpenses(): Promise<Expense[]> {
    const rows = unwrap(
      await supabase.from('expenses').select('*, suppliers ( name )').order('date', { ascending: false })
    ) as ExpenseWithSupplier[];
    return rows.map(toExpense);
  },

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const id = await nextId('expenses', 'EXP-', 3);
    unwrap(
      await supabase
        .from('expenses')
        .insert({
          id,
          date: input.date,
          category: input.category,
          description: input.description,
          amount: input.amount,
          method: input.method,
          supplier_id: input.supplierId || null,
          recorded_by: input.recordedBy,
          notes: input.notes || null,
        })
        .select()
        .single()
    );
    const all = await this.listExpenses();
    return all.find(e => e.id === id)!;
  },
};
