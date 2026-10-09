-- =============================================================================
-- MIGRATION 005 — Daily Revenue, split by Laundry vs Water.
--
-- Safe to re-run: the function is dropped and recreated, and no table or row
-- is touched.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- WHY
--   Business Analytics' "Daily Revenue (This Week)" chart reads `laundry` and
--   `water` fields that `bi_daily_revenue` (migration 003) never returned —
--   it only ever returned cash_sales / gcash_sales / total, split by payment
--   method, not by business line. The chart's two <Area> series had nothing
--   to plot and rendered empty.
--
--   This adds `laundry` and `water` columns to the same function. The
--   existing `cash_sales` / `gcash_sales` / `total` columns are kept exactly
--   as they were — the Dashboard's "Weekly Revenue" bar chart reads those
--   and must keep working unchanged.
-- =============================================================================
drop function if exists public.bi_daily_revenue(integer);

-- One row per day for the last N days, oldest first.
create function public.bi_daily_revenue(p_days integer)
returns table (
  day         date,
  laundry     numeric,
  water       numeric,
  cash_sales  numeric,
  gcash_sales numeric,
  total       numeric
)
language sql
stable
as $$
  with days as (
    select (current_date - offs)::date as d
    from generate_series(p_days - 1, 0, -1) as offs
  )
  select
    days.d,
    coalesce((select sum(o.total) from public.laundry_orders o
               where o.date = days.d
                 and o.status <> 'cancelled'
                 and o.payment_status in ('paid', 'partial')), 0),
    coalesce((select sum(t.total) from public.water_transactions t
               where t.date = days.d
                 and t.payment_status in ('paid', 'partial')), 0),
    coalesce((
      select sum(v.total) from (
        select total, payment_method, payment_status, date from public.laundry_orders
         where status <> 'cancelled'
        union all
        select total, payment_method, payment_status, date from public.water_transactions
      ) v
      where v.date = days.d and v.payment_status in ('paid', 'partial') and v.payment_method = 'cash'
    ), 0),
    coalesce((
      select sum(v.total) from (
        select total, payment_method, payment_status, date from public.laundry_orders
         where status <> 'cancelled'
        union all
        select total, payment_method, payment_status, date from public.water_transactions
      ) v
      where v.date = days.d and v.payment_status in ('paid', 'partial') and v.payment_method = 'gcash'
    ), 0),
    coalesce((
      select sum(v.total) from (
        select total, payment_status, date from public.laundry_orders where status <> 'cancelled'
        union all
        select total, payment_status, date from public.water_transactions
      ) v
      where v.date = days.d and v.payment_status in ('paid', 'partial')
    ), 0)
  from days
  order by days.d
$$;

grant execute on function public.bi_daily_revenue(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Verification — should return 7 rows, each with laundry/water/cash/gcash/total.
-- -----------------------------------------------------------------------------
select * from public.bi_daily_revenue(7);
