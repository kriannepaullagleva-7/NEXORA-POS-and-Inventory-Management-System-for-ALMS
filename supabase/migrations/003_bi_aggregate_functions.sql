-- =============================================================================
-- MIGRATION 003 — Business Intelligence aggregate functions.
--
-- Safe to re-run: each function is dropped and recreated, and no table or row
-- is touched.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7b. Business Intelligence aggregates
--
--     These run the sums inside Postgres instead of shipping rows to the
--     browser. That is not an optimisation, it is a correctness requirement:
--     PostgREST caps a response at 1000 rows by default, so a client-side
--     "sum every transaction this year" silently stops counting once the shop
--     passes its thousandth sale, and every revenue figure starts reading low
--     with nothing on screen to say so.
--
--     They are SECURITY INVOKER (the default) on purpose, so Row Level
--     Security still applies: a staff account gets 0 for expenses here just as
--     it would from a direct select.
-- -----------------------------------------------------------------------------
drop function if exists public.bi_summary(date, date);
drop function if exists public.bi_top_sellers(date, date);
drop function if exists public.bi_monthly_revenue(integer);
drop function if exists public.bi_daily_revenue(integer);

-- Every headline figure for one filter window.
create function public.bi_summary(p_from date, p_to date)
returns table (
  laundry_revenue numeric,
  water_revenue   numeric,
  laundry_count   bigint,
  water_count     bigint,
  cash            numeric,
  gcash           numeric,
  expenses        numeric,
  outstanding     numeric
)
language sql
stable
as $$
  select
    coalesce((select sum(o.total) from public.laundry_orders o
               where o.date between p_from and p_to
                 and o.status <> 'cancelled'
                 and o.payment_status in ('paid', 'partial')), 0),
    coalesce((select sum(t.total) from public.water_transactions t
               where t.date between p_from and p_to
                 and t.payment_status in ('paid', 'partial')), 0),
    (select count(*) from public.laundry_orders o
      where o.date between p_from and p_to and o.status <> 'cancelled'),
    (select count(*) from public.water_transactions t
      where t.date between p_from and p_to),
    coalesce((select sum(p.amount_received) from public.payments p
               where p.payment_date between p_from and p_to and p.method = 'cash'), 0),
    coalesce((select sum(p.amount_received) from public.payments p
               where p.payment_date between p_from and p_to and p.method = 'gcash'), 0),
    coalesce((select sum(e.amount) from public.expenses e
               where e.date between p_from and p_to), 0),
    coalesce((select sum(p.balance) from public.payments p
               where p.payment_date between p_from and p_to), 0)
$$;

-- Best-selling services and products inside one window.
create function public.bi_top_sellers(p_from date, p_to date)
returns table (
  kind    text,
  name    text,
  qty     numeric,
  revenue numeric
)
language sql
stable
as $$
  select 'service'::text, s.name, sum(ls.quantity), sum(ls.subtotal)
    from public.laundry_order_services ls
    join public.laundry_services s on s.id = ls.laundry_service_id
    join public.laundry_orders o   on o.id = ls.laundry_order_id
   where o.date between p_from and p_to
     and o.status <> 'cancelled'
   group by s.name
  union all
  select 'product'::text, w.name, sum(ti.quantity), sum(ti.subtotal)
    from public.water_transaction_items ti
    join public.water_products w     on w.id = ti.water_product_id
    join public.water_transactions t on t.id = ti.transaction_id
   where t.date between p_from and p_to
   group by w.name
   order by 4 desc
$$;

-- Month-by-month totals for one calendar year.
create function public.bi_monthly_revenue(p_year integer)
returns table (
  month_number integer,
  laundry      numeric,
  water        numeric,
  cash_sales   numeric,
  gcash_sales  numeric,
  expenses     numeric
)
language sql
stable
as $$
  with months as (select generate_series(1, 12) as m),
  sales as (
    select date, total, payment_method, payment_status
      from public.laundry_orders where status <> 'cancelled'
    union all
    select date, total, payment_method, payment_status
      from public.water_transactions
  )
  select
    months.m,
    coalesce((select sum(o.total) from public.laundry_orders o
               where extract(year from o.date) = p_year
                 and extract(month from o.date) = months.m
                 and o.status <> 'cancelled'
                 and o.payment_status in ('paid', 'partial')), 0),
    coalesce((select sum(t.total) from public.water_transactions t
               where extract(year from t.date) = p_year
                 and extract(month from t.date) = months.m
                 and t.payment_status in ('paid', 'partial')), 0),
    coalesce((select sum(v.total) from sales v
               where extract(year from v.date) = p_year
                 and extract(month from v.date) = months.m
                 and v.payment_status in ('paid', 'partial')
                 and v.payment_method = 'cash'), 0),
    coalesce((select sum(v.total) from sales v
               where extract(year from v.date) = p_year
                 and extract(month from v.date) = months.m
                 and v.payment_status in ('paid', 'partial')
                 and v.payment_method = 'gcash'), 0),
    coalesce((select sum(e.amount) from public.expenses e
               where extract(year from e.date) = p_year
                 and extract(month from e.date) = months.m), 0)
  from months
  order by months.m
$$;

-- One row per day for the last N days, oldest first.
create function public.bi_daily_revenue(p_days integer)
returns table (
  day         date,
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
  ),
  sales as (
    select date, total, payment_method from public.laundry_orders
     where status <> 'cancelled' and payment_status in ('paid', 'partial')
    union all
    select date, total, payment_method from public.water_transactions
     where payment_status in ('paid', 'partial')
  )
  select
    days.d,
    coalesce((select sum(s.total) from sales s where s.date = days.d and s.payment_method = 'cash'), 0),
    coalesce((select sum(s.total) from sales s where s.date = days.d and s.payment_method = 'gcash'), 0),
    coalesce((select sum(s.total) from sales s where s.date = days.d), 0)
  from days
  order by days.d
$$;

grant execute on function public.bi_summary(date, date)      to authenticated;
grant execute on function public.bi_top_sellers(date, date)  to authenticated;
grant execute on function public.bi_monthly_revenue(integer) to authenticated;
grant execute on function public.bi_daily_revenue(integer)   to authenticated;

-- -----------------------------------------------------------------------------
-- Verification — each call below should return rows.
-- -----------------------------------------------------------------------------
select 'bi_summary'         as fn, count(*)::text as rows from public.bi_summary(date_trunc('year', current_date)::date, current_date)
union all select 'bi_top_sellers',     count(*)::text from public.bi_top_sellers(date_trunc('year', current_date)::date, current_date)
union all select 'bi_monthly_revenue', count(*)::text from public.bi_monthly_revenue(extract(year from current_date)::integer)
union all select 'bi_daily_revenue',   count(*)::text from public.bi_daily_revenue(7);
