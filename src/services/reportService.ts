import { supabase } from '../lib/supabase';
import { localDate } from './helpers';

export interface DailyRevenuePoint {
  day: string;
  date: string;
  laundry: number;
  water: number;
  cashSales: number;
  gcashSales: number;
  total: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  laundry: number;
  water: number;
  cashSales: number;
  gcashSales: number;
  expenses: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const n = (value: unknown) => Number(value) || 0;

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PeriodSummary {
  label: string;
  from: string;
  to: string;
  laundryRevenue: number;
  waterRevenue: number;
  totalRevenue: number;
  laundryCount: number;
  waterCount: number;
  totalTransactions: number;
  cash: number;
  gcash: number;
  expenses: number;
  netRevenue: number;
  averageTicket: number;
  outstanding: number;
}

export interface TopSeller {
  name: string;
  qty: number;
  revenue: number;
}

/** Local-timezone date key — see localDate() for why not toISOString(). */
const iso = localDate;

/** Inclusive calendar range for a Business Intelligence filter. */
export function periodRange(period: Period): { from: string; to: string; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'daily':
      return { from: iso(today), to: iso(today), label: 'Today' };
    case 'weekly': {
      // Week starts Monday.
      const day = (today.getDay() + 6) % 7;
      const start = new Date(today);
      start.setDate(today.getDate() - day);
      return { from: iso(start), to: iso(today), label: 'This Week' };
    }
    case 'yearly':
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today), label: 'This Year' };
    case 'monthly':
    default:
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today), label: 'This Month' };
  }
}

export const emptySummary = (label = '', from = '', to = ''): PeriodSummary => ({
  label, from, to,
  laundryRevenue: 0, waterRevenue: 0, totalRevenue: 0,
  laundryCount: 0, waterCount: 0, totalTransactions: 0,
  cash: 0, gcash: 0, expenses: 0, netRevenue: 0, averageTicket: 0, outstanding: 0,
});

interface SummaryRow {
  laundry_revenue: number | string;
  water_revenue: number | string;
  laundry_count: number | string;
  water_count: number | string;
  cash: number | string;
  gcash: number | string;
  expenses: number | string;
  outstanding: number | string;
}

interface TopSellerRow {
  kind: 'service' | 'product';
  name: string;
  qty: number | string;
  revenue: number | string;
}

/**
 * Every report below is aggregated by Postgres, through the bi_* functions in
 * the migration, rather than by summing rows in the browser.
 *
 * That is a correctness requirement, not a performance tweak: PostgREST caps a
 * response at 1000 rows by default, so "fetch the year and add it up" quietly
 * stops counting once the shop passes its thousandth sale and every revenue
 * figure starts reading low, with nothing on screen to say so.
 *
 * Row Level Security still applies inside the functions, so a staff account
 * sees 0 for expenses exactly as it would from a direct select.
 */
export const reportService = {
  /** Every Business Intelligence figure for one filter window. */
  async summary(period: Period): Promise<PeriodSummary> {
    const { from, to, label } = periodRange(period);
    return this.summaryForRange(from, to, label);
  },

  /** Same figures as summary(), for an explicit inclusive date range. */
  async summaryForRange(from: string, to: string, label = ''): Promise<PeriodSummary> {
    const { data, error } = await supabase.rpc('bi_summary', { p_from: from, p_to: to });
    if (error) throw new Error(error.message);

    const row = (Array.isArray(data) ? data[0] : data) as SummaryRow | undefined;
    if (!row) return emptySummary(label, from, to);

    const laundryRevenue = n(row.laundry_revenue);
    const waterRevenue = n(row.water_revenue);
    const totalRevenue = laundryRevenue + waterRevenue;
    const laundryCount = n(row.laundry_count);
    const waterCount = n(row.water_count);
    const totalTransactions = laundryCount + waterCount;
    const expenses = n(row.expenses);

    return {
      label,
      from,
      to,
      laundryRevenue,
      waterRevenue,
      totalRevenue,
      laundryCount,
      waterCount,
      totalTransactions,
      cash: n(row.cash),
      gcash: n(row.gcash),
      expenses,
      netRevenue: totalRevenue - expenses,
      averageTicket: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      outstanding: n(row.outstanding),
    };
  },

  /** Best sellers inside one filter window, split by module. */
  async topSellersFor(period: Period): Promise<{ services: TopSeller[]; products: TopSeller[] }> {
    const { from, to } = periodRange(period);
    return this.topSellersBetween(from, to);
  },

  async topSellersBetween(from: string, to: string): Promise<{ services: TopSeller[]; products: TopSeller[] }> {
    const { data, error } = await supabase.rpc('bi_top_sellers', { p_from: from, p_to: to });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as TopSellerRow[];
    const pick = (kind: 'service' | 'product') =>
      rows
        .filter(r => r.kind === kind)
        .map(r => ({ name: r.name, qty: n(r.qty), revenue: n(r.revenue) }))
        .sort((a, b) => b.revenue - a.revenue);

    return { services: pick('service'), products: pick('product') };
  },

  /** Last N calendar days, oldest first — used by the dashboard chart. */
  async dailyRevenue(days = 7): Promise<DailyRevenuePoint[]> {
    const { data, error } = await supabase.rpc('bi_daily_revenue', { p_days: days });
    if (error) throw new Error(error.message);

    return ((data ?? []) as {
      day: string;
      laundry: number | string;
      water: number | string;
      cash_sales: number | string;
      gcash_sales: number | string;
      total: number | string;
    }[])
      .map(row => {
        const date = String(row.day).slice(0, 10);
        // Parse as local midnight so the weekday label matches the date.
        const [y, m, d] = date.split('-').map(Number);
        return {
          day: DAYS[new Date(y, (m ?? 1) - 1, d ?? 1).getDay()],
          date,
          laundry: n(row.laundry),
          water: n(row.water),
          cashSales: n(row.cash_sales),
          gcashSales: n(row.gcash_sales),
          total: n(row.total),
        };
      });
  },

  /** Month-by-month totals for the current year, up to the current month. */
  async monthlyRevenue(): Promise<MonthlyRevenuePoint[]> {
    const year = new Date().getFullYear();

    const { data, error } = await supabase.rpc('bi_monthly_revenue', { p_year: year });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as {
      month_number: number | string;
      laundry: number | string;
      water: number | string;
      cash_sales: number | string;
      gcash_sales: number | string;
      expenses: number | string;
    }[];

    const upToMonth = new Date().getMonth() + 1;

    return rows
      .filter(row => n(row.month_number) <= upToMonth)
      .sort((a, b) => n(a.month_number) - n(b.month_number))
      .map(row => ({
        month: MONTHS[n(row.month_number) - 1] ?? '',
        laundry: n(row.laundry),
        water: n(row.water),
        cashSales: n(row.cash_sales),
        gcashSales: n(row.gcash_sales),
        expenses: n(row.expenses),
      }));
  },

  /** Headline counters for the dashboard, scoped to today. */
  async todaySnapshot() {
    const today = iso(new Date());

    const [laundry, water, payments] = await Promise.all([
      supabase.from('laundry_orders').select('id, total, status, payment_status, payment_method, customer_name, date, processed_by').eq('date', today),
      supabase.from('water_transactions').select('id, total, payment_status, payment_method, customer_name, date, processed_by').eq('date', today),
      supabase.from('payments').select('amount, method, status').eq('payment_date', today),
    ]);

    const paymentRows = (payments.data ?? []) as { amount: number | string; method: string; status: string }[];

    return {
      laundryOrders: laundry.data ?? [],
      waterSales: water.data ?? [],
      cash: paymentRows.filter(p => p.method === 'cash').reduce((s, p) => s + n(p.amount), 0),
      gcash: paymentRows.filter(p => p.method === 'gcash').reduce((s, p) => s + n(p.amount), 0),
      paymentCount: paymentRows.length,
    };
  },

};
