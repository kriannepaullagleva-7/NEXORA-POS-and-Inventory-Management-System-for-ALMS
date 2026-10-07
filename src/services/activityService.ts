import { supabase } from '../lib/supabase';
import type { ActivityLogRow, EmployeeRow } from '../types/database';
import type { ActivityLog } from '../types/models';
import { unwrap } from './helpers';

type LogWithEmployee = ActivityLogRow & { employees: Pick<EmployeeRow, 'name'> | null };

export const activityService = {
  async list(): Promise<ActivityLog[]> {
    const rows = unwrap(
      await supabase
        .from('activity_logs')
        .select('*, employees ( name )')
        .order('datetime', { ascending: false })
        .limit(500)
    ) as LogWithEmployee[];

    return rows.map(row => ({
      id: Number(row.id),
      datetime: row.datetime,
      employee: row.employees?.name ?? '—',
      action: row.action,
      module: row.module,
      ip: row.ip_address ?? '',
    }));
  },

  /**
   * Appends an audit entry. Deliberately fire-and-forget: a failed log must never
   * block the business action that triggered it.
   */
  
  async log(employeeId: string | null, module: string, action: string): Promise<void> {
    try {
      await supabase.from('activity_logs').insert({
        employee_id: employeeId,
        module,
        action,
        datetime: new Date().toISOString(),
      });
    } catch {
      /* ignore — auditing is best-effort */
    }
  },
};
