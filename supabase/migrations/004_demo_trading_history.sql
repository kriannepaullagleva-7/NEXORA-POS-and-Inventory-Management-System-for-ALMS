-- =============================================================================
-- MIGRATION 004 — OPTIONAL demo trading history.
--
-- Back-fills roughly nine months of sales so the Business Intelligence charts,
-- the monthly report and the "This Year" filter show a business that has been
-- trading, instead of a near-empty ledger under a full year of overheads.
--
-- RUN THIS ONLY ON A DEMO OR DEFENCE DATABASE. It inserts about 5,800 rows of
-- invented sales. Skip it entirely once you are recording the shop's real
-- takings — nothing in the application depends on it.
--
-- It deletes nothing and overwrites nothing: every insert is ON CONFLICT DO
-- NOTHING, so running it twice adds nothing the second time.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8b. Generated trading history
--
--     The hand-written rows above are the showcase: they cover today and this
--     week in detail. This block back-fills the preceding nine months so the
--     Business Intelligence charts, the month-by-month report and the
--     "This Year" filter show a business that has actually been trading,
--     rather than a near-empty ledger sitting under a full year of overheads.
--
--     Dates start one day back, so the generated rows never dilute the
--     hand-written Today / This Week figures.
--
--     Ids occupy the range BELOW the hand-written rows (WAT-TXN-0001..2000,
--     LAU-0001..0900, PAY-0001..2900), so the newest transaction still carries
--     the highest id — which is both what the history screens sort on and what
--     nextId() reads to allocate the next number.
--
--     Everything is derived from the row number rather than random, so
--     re-running this script reproduces exactly the same history.
-- -----------------------------------------------------------------------------

-- Water refilling: ~7 sales a day, 2-6 refills each, every third one delivered.
insert into public.water_transactions
  (id, customer_id, customer_name, phone, address, date, subtotal, delivery_fee,
   discount, total, amount_paid, change_amount, payment_method, payment_status,
   gcash_reference, delivery, delivery_address, processed_by, notes)
select
  'WAT-TXN-' || lpad(i::text, 4, '0'),
  c.id,
  coalesce(c.name, 'Walk-in'),
  c.phone,
  c.address,
  (current_date - 1 - (i % 265))::date,
  q.qty * 25,
  f.fee,
  0,
  q.qty * 25 + f.fee,
  q.qty * 25 + f.fee,
  0,
  (case when i % 2 = 0 then 'cash' else 'gcash' end)::public.payment_method,
  'paid'::public.payment_status,
  case when i % 2 = 0 then null else 'GCH-' || lpad((10000 + i)::text, 5, '0') end,
  f.fee > 0,
  case when f.fee > 0 then c.address else null end,
  case when i % 3 = 0 then 'Juan dela Cruz' else 'Ana Reyes' end,
  case when f.fee > 0 then q.qty || ' refills delivered' else 'Pickup / refill at store' end
from generate_series(1, 2000) as i
cross join lateral (select 2 + (i % 5) as qty) q
cross join lateral (
  select case when i % 3 = 0
              then coalesce((select dp.price from public.delivery_pricing dp
                             where dp.quantity = q.qty and dp.is_active), 0)
              else 0 end as fee
) f
left join lateral (
  select e.id, e.first_name || ' ' || e.last_name as name, e.phone, e.address
  from public.customers e order by e.id offset (i % 6) limit 1
) c on i % 4 <> 0
on conflict (id) do nothing;

insert into public.water_transaction_items
  (transaction_id, water_product_id, quantity, unit_price, subtotal)
select t.id, 'WAT-001', t.subtotal / 25, 25, t.subtotal
from public.water_transactions t
where substring(t.id from 9)::int <= 2000 and t.subtotal > 0
  and not exists (select 1 from public.water_transaction_items wi where wi.transaction_id = t.id);

-- Laundry: ~3 orders a day, all released and paid.
insert into public.laundry_orders
  (id, customer_id, customer_name, phone, address, date, status, subtotal,
   discount, total, amount_paid, change_amount, payment_status, payment_method,
   gcash_reference, processed_by, notes)
select
  'LAU-' || lpad(i::text, 4, '0'),
  c.id, c.name, c.phone, c.address,
  (current_date - 1 - ((i * 11) % 265))::date,
  'released'::public.laundry_order_status,
  sv.price * q.qty, 0, sv.price * q.qty, sv.price * q.qty, 0,
  'paid'::public.payment_status,
  (case when i % 2 = 0 then 'cash' else 'gcash' end)::public.payment_method,
  case when i % 2 = 0 then null else 'GCH-' || lpad((20000 + i)::text, 5, '0') end,
  case when i % 2 = 0 then 'Ana Reyes' else 'Juan dela Cruz' end,
  null
from generate_series(1, 900) as i
cross join lateral (select 1 + (i % 4) as qty) q
cross join lateral (
  select s.id, s.price from public.laundry_services s
  where s.is_active order by s.id offset (i % 3) limit 1
) sv
cross join lateral (
  select e.id, e.first_name || ' ' || e.last_name as name, e.phone, e.address
  from public.customers e order by e.id offset (i % 6) limit 1
) c
on conflict (id) do nothing;

insert into public.laundry_order_services
  (laundry_order_id, laundry_service_id, quantity, unit_price, subtotal)
select o.id, sv.id, q.qty, sv.price, sv.price * q.qty
from public.laundry_orders o
cross join lateral (select substring(o.id from 5)::int as i) n
cross join lateral (select 1 + (n.i % 4) as qty) q
cross join lateral (
  select s.id, s.price from public.laundry_services s
  where s.is_active order by s.id offset (n.i % 3) limit 1
) sv
where substring(o.id from 5)::int <= 900
  and not exists (select 1 from public.laundry_order_services ls where ls.laundry_order_id = o.id);

-- One settled payment per generated transaction, so the ledger and the
-- cash / GCash split reconcile with the sales above.
insert into public.payments
  (id, laundry_order_id, water_transaction_id, customer_id, customer_name, type,
   description, amount, amount_received, change_amount, balance, method, status,
   payment_date, gcash_reference, processed_by)
select
  'PAY-' || lpad(row_number() over (order by src.date, src.sort_id)::text, 4, '0'),
  src.laundry_order_id, src.water_transaction_id, src.customer_id,
  src.customer_name, src.type, null,
  src.total, src.total, 0, 0,
  src.payment_method, 'paid'::public.payment_status,
  src.date, src.gcash_reference, src.processed_by
from (
  select id as sort_id, id as water_transaction_id, null::text as laundry_order_id,
         customer_id, customer_name, 'water' as type, total, payment_method,
         gcash_reference, processed_by, date
  from public.water_transactions
  where substring(id from 9)::int <= 2000
  union all
  select id, null::text, id, customer_id, customer_name, 'laundry', total,
         payment_method, gcash_reference, processed_by, date
  from public.laundry_orders
  where substring(id from 5)::int <= 900
) src
on conflict (id) do nothing;

-- Recurring overheads for every COMPLETED month of this year, so the Finance
-- "Revenue vs Expenses" chart has an expense column to draw and the monthly
-- report reconciles. The current month is excluded on purpose: its rent and
-- salaries have not been recorded yet.
insert into public.expenses (id, date, category, description, amount, method, supplier_id, recorded_by)
select
  'EXP-' || lpad((4 + row_number() over (order by m.month_start, c.sort))::text, 3, '0'),
  m.month_start,
  c.category,
  c.description || ' — ' || to_char(m.month_start, 'FMMonth YYYY'),
  c.amount,
  c.method::public.expense_method,
  null,
  'Aedzel Louis M. Sarmiento'
from (
  select generate_series(
           date_trunc('year', current_date)::date,
           (date_trunc('month', current_date) - interval '1 month')::date,
           interval '1 month'
         )::date as month_start
) m
cross join (values
  (1, 'Rent',      'Monthly shop rent',        10000, 'bank'),
  (2, 'Salaries',  'Staff salaries',           20000, 'cash'),
  (3, 'Utilities', 'Electric bill',             6400, 'bank'),
  (4, 'Utilities', 'Water district bill',       1800, 'cash')
) as c(sort, category, description, amount, method)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------
select 'water transactions' as item, count(*)::text as value from public.water_transactions
union all select 'laundry orders', count(*)::text from public.laundry_orders
union all select 'payments',       count(*)::text from public.payments
union all select 'expenses',       count(*)::text from public.expenses;
