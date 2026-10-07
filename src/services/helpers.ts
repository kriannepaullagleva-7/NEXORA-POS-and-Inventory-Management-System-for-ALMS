import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/** Turns a Supabase error into a message that is useful in a toast. */
export function describeError(error: PostgrestError | Error | null, fallback = 'Something went wrong.'): string {
  if (!error) return fallback;
  const message = 'message' in error ? error.message : fallback;
  if (/row-level security/i.test(message)) {
    return 'Permission denied. Your account is not allowed to perform this action.';
  }
  if (/JWT|not authenticated|auth/i.test(message) && /expired|missing|invalid/i.test(message)) {
    return 'Your session expired. Please sign in again.';
  }
  if (/Failed to fetch|NetworkError/i.test(message)) {
    return 'Cannot reach the server. Check your internet connection.';
  }
  return message || fallback;
}

/** Throws on error so callers can use try/catch uniformly. */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw new Error(describeError(result.error));
  return result.data as T;
}

/**
 * Next sequential human-readable id for tables that use text primary keys
 * (e.g. `LAU-0049`). Reads the highest existing id with the given prefix.
 */
export async function nextId(table: string, prefix: string, pad = 4): Promise<string> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .like('id', `${prefix}%`)
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw new Error(describeError(error));

  const last = data?.[0]?.id as string | undefined;
  const lastNum = last ? parseInt(last.slice(prefix.length).replace(/\D/g, ''), 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `${prefix}${String(next).padStart(pad, '0')}`;
}

/**
 * `YYYY-MM-DD` for date columns, in the machine's own timezone.
 *
 * Deliberately not `toISOString()`: that converts to UTC first, so in
 * Philippine time (UTC+8) every sale rung up between midnight and 8am would be
 * filed under the previous day and the "Today" reports would miss it.
 */
export function localDate(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's date for date columns. */
export const today = () => localDate();

/**
 * The POS screens use '' to mean "not paid yet", but the database enum only
 * accepts cash/gcash/unpaid. Normalise before writing.
 */
export const toPaymentMethod = (method: string | null | undefined): 'cash' | 'gcash' | 'unpaid' =>
  method === 'cash' || method === 'gcash' ? method : 'unpaid';

/** Maps a stock level to the status badge the UI expects. */
export function stockStatus(qty: number, reorderLevel: number): 'normal' | 'low' | 'critical' {
  if (qty <= 0) return 'critical';
  if (qty <= reorderLevel * 0.5) return 'critical';
  if (qty <= reorderLevel) return 'low';
  return 'normal';
}
