import { supabase } from '../lib/supabase';
import type { CustomerRow } from '../types/database';
import type { Customer } from '../types/models';
import { nextId, unwrap } from './helpers';

const toCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email ?? '',
  phone: row.phone ?? '',
  address: row.address ?? '',
});

export const customerService = {
  async list(): Promise<Customer[]> {
    const rows = unwrap(await supabase.from('customers').select('*').order('id')) as CustomerRow[];
    return rows.map(toCustomer);
  },

  async create(input: Omit<Customer, 'id'>): Promise<Customer> {
    const id = await nextId('customers', 'CUS-', 3);
    const row = unwrap(
      await supabase
        .from('customers')
        .insert({
          id,
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email || null,
          phone: input.phone || null,
          address: input.address || null,
        })
        .select()
        .single()
    ) as CustomerRow;
    return toCustomer(row);
  },

  /** Finds an existing customer by phone, otherwise creates one. Used by both POS flows. */
  async findOrCreate(input: Omit<Customer, 'id'>): Promise<Customer | null> {
    if (!input.firstName && !input.phone) return null;
    if (input.phone) {
      const { data } = await supabase.from('customers').select('*').eq('phone', input.phone).maybeSingle();
      if (data) return toCustomer(data as CustomerRow);
    }
    return this.create(input);
  },
};
