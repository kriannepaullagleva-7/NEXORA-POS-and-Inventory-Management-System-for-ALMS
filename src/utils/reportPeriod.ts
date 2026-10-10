import { localDate } from '../services/helpers';

/**
 * Report-filter periods shared by the Payment Ledger, Laundry Sales History,
 * and Water Refilling Sales History pages. Kept separate from
 * reportService's `Period` (daily/weekly/monthly/yearly), which drives the
 * Dashboard and Business Intelligence headline figures and database RPCs —
 * these are plain client-side date-range filters over an already-fetched,
 * already-complete list (see fetchAllRows in services/helpers.ts).
 */
export type ReportPeriod =
  | 'today' | 'yesterday'
  | 'week' | 'last_week'
  | 'month' | 'last_month'
  | 'year'
  | 'custom'
  | 'all';

export const REPORT_PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Date Range' },
  { value: 'all', label: 'All Records' },
];

export interface ReportRange {
  /** Inclusive `YYYY-MM-DD`, or null when the period is 'all' (no filtering). */
  from: string | null;
  /** Inclusive `YYYY-MM-DD`, or null when the period is 'all'. */
  to: string | null;
  label: string;
}

/**
 * Resolves a report period to an inclusive local-date range. Weeks start
 * Monday, matching reportService.periodRange(). `custom` requires both dates;
 * an incomplete custom range falls back to 'all' rather than silently
 * filtering on a half-set range.
 */
export function resolveReportRange(period: ReportPeriod, custom?: { from: string; to: string }): ReportRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = localDate;

  switch (period) {
    case 'today':
      return { from: iso(today), to: iso(today), label: 'Today' };

    case 'yesterday': {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return { from: iso(y), to: iso(y), label: 'Yesterday' };
    }

    case 'week': {
      const day = (today.getDay() + 6) % 7; // Monday = 0
      const start = new Date(today);
      start.setDate(today.getDate() - day);
      return { from: iso(start), to: iso(today), label: 'This Week' };
    }

    case 'last_week': {
      const day = (today.getDay() + 6) % 7;
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - day);
      const start = new Date(thisWeekStart);
      start.setDate(thisWeekStart.getDate() - 7);
      const end = new Date(thisWeekStart);
      end.setDate(thisWeekStart.getDate() - 1);
      return { from: iso(start), to: iso(end), label: 'Last Week' };
    }

    case 'month':
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today), label: 'This Month' };

    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: iso(start), to: iso(end), label: 'Last Month' };
    }

    case 'year':
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today), label: 'This Year' };

    case 'custom':
      if (custom?.from && custom?.to) {
        return { from: custom.from, to: custom.to, label: `${custom.from} to ${custom.to}` };
      }
      return { from: null, to: null, label: 'All Records' };

    case 'all':
    default:
      return { from: null, to: null, label: 'All Records' };
  }
}

/** True when `date` (a `YYYY-MM-DD` or date-prefixed string) falls inside the range. */
export function withinReportRange(date: string, range: ReportRange): boolean {
  if (!range.from || !range.to) return true;
  const d = date.slice(0, 10);
  return d >= range.from && d <= range.to;
}

/**
 * The equal-length window immediately before `[from, to]`, used to compute
 * period-over-period change. A 1-day range compares against yesterday; a
 * month-to-date range compares against the same number of days in the prior
 * month — like-for-like, so a partial current period isn't compared against a
 * full previous one.
 */
export function previousRangeOf(from: string, to: string): { from: string; to: string } {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  const lengthDays = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
  const prevTo = new Date(f);
  prevTo.setDate(f.getDate() - 1);
  const prevFrom = new Date(f);
  prevFrom.setDate(f.getDate() - lengthDays);
  return { from: localDate(prevFrom), to: localDate(prevTo) };
}
