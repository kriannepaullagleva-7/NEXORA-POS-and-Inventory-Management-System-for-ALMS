import { supabase } from '../lib/supabase';
import type { EmployeeRow, UserRole } from '../types/database';
import { describeError, nextId, unwrap, today } from './helpers';

export interface EmployeeInput {
  name: string;
  role: UserRole;
  email: string;
  phone?: string | null;
}

export const employeeService = {
  async list(): Promise<EmployeeRow[]> {
    return unwrap(await supabase.from('employees').select('*').order('id'));
  },

  async getByAuthUser(authUserId: string): Promise<EmployeeRow | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) throw new Error(describeError(error));
    return data;
  },

  async getByEmail(email: string): Promise<EmployeeRow | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .ilike('email', email)
      .maybeSingle();
    if (error) throw new Error(describeError(error));
    return data;
  },

  async create(input: EmployeeInput): Promise<EmployeeRow> {
    const id = await nextId('employees', 'EMP-', 3);
    return unwrap(
      await supabase
        .from('employees')
        .insert({
          id,
          name: input.name,
          role: input.role,
          email: input.email,
          phone: input.phone ?? null,
          status: 'active',
          joined: today(),
        })
        .select()
        .single()
    );
  },

  async update(id: string, patch: Partial<EmployeeRow>): Promise<EmployeeRow> {
    return unwrap(await supabase.from('employees').update(patch).eq('id', id).select().single());
  },

  async setStatus(id: string, status: 'active' | 'inactive'): Promise<EmployeeRow> {
    return this.update(id, { status });
  },

  /** Profile photo is stored as a resized data URL so no Storage bucket is required. */
  async setAvatar(id: string, avatarUrl: string | null): Promise<EmployeeRow> {
    return this.update(id, { avatar_url: avatarUrl });
  },

  async touchLastLogin(id: string): Promise<void> {
    await supabase
      .from('employees')
      .update({ last_login: new Date().toISOString() })
      .eq('id', id);
  },
};
