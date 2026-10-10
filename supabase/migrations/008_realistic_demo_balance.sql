-- =============================================================================
-- MIGRATION 008 — Realistic, balanced demo financials (presentation only).
--
-- Migration 004 back-filled a year of sales but left two gaps that made the
-- current-month figures look unreal:
--   * the CURRENT month had no expenses, so Net Profit Margin showed 100%;
--   * every sale was fully paid, so Outstanding was always 0 and no debt or
--     "ready for pickup" notifications ever appeared.
--
-- This adds, for the live current month only:
--   * operating expenses that are normally paid at the start of the month
--     (rent + utilities). Salaries are deliberately left out — mid-month they
--     have not been paid yet — which keeps the month profitable and realistic
--     (healthy margin, not a loss and not a fake 100%).
--   * a small, believable set of open laundry orders: some awaiting payment on
--     pickup (unpaid) and some with a deposit (partial), so Outstanding, the
--     payment ledger and the notification bell all show lifelike activity.
--
-- DEMO / PRESENTATION DATA. Additive and safe to re-run (every insert is
-- ON CONFLICT DO NOTHING). It deletes and overwrites nothing. Ids continue the
-- showcase ranges (LAU-1006 / PAY-3509 were the highest), so the running
-- sequence stays clean. Remove this block before recording the shop's real
-- takings; nothing in the application depends on it.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- =============================================================================

-- Anchor everything to the Philippine local month, matching how the app and the
-- bi_* functions (migration 007) reckon dates.
-- -----------------------------------------------------------------------------
-- 1. Current-month operating expenses (rent + utilities; salaries come later).
-- -----------------------------------------------------------------------------
insert into public.expenses (id, date, category, description, amount, method, supplier_id, recorded_by)
values
  ('EXP-CUR-RENT',  (date_trunc('month', (now() at time zone 'Asia/Manila')::date))::date,
     'Rent',      'Monthly shop rent — ' || to_char((now() at time zone 'Asia/Manila')::date, 'FMMonth YYYY'),
     10000, 'bank', null, 'Aedzel Louis M. Sarmiento'),
  ('EXP-CUR-ELEC',  (date_trunc('month', (now() at time zone 'Asia/Manila')::date) + interval '4 day')::date,
     'Utilities', 'Electric bill — '      || to_char((now() at time zone 'Asia/Manila')::date, 'FMMonth YYYY'),
      6400, 'bank', null, 'Aedzel Louis M. Sarmiento'),
  ('EXP-CUR-WATER', (date_trunc('month', (now() at time zone 'Asia/Manila')::date) + interval '6 day')::date,
     'Utilities', 'Water district bill — ' || to_char((now() at time zone 'Asia/Manila')::date, 'FMMonth YYYY'),
      1800, 'cash', null, 'Aedzel Louis M. Sarmiento')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Open laundry orders — realistic receivables.
--    Three awaiting payment on pickup (unpaid), two with a deposit (partial).
--    All dated within the last week, using real seeded customers and services.
-- -----------------------------------------------------------------------------
insert into public.laundry_orders
  (id, customer_id, customer_name, phone, address, date, status, subtotal, discount,
   total, amount_paid, change_amount, payment_status, payment_method, gcash_reference,
   processed_by, notes)
values
  ('LAU-1007','CUS-001','Rosario Buenaventura','0917-111-2233','12 Mint St, Countryville Exec. Homes, Cabantian, Davao City',
     ((now() at time zone 'Asia/Manila')::date - 1), 'ready',       160, 0, 160,   0, 0, 'unpaid',  'unpaid', null, 'Ana Reyes',        'Pay on pickup'),
  ('LAU-1008','CUS-003','Ligaya Villanueva','0939-111-2233','78 Rosal St, Deca Homes, Cabantian, Davao City',
     ((now() at time zone 'Asia/Manila')::date - 1), 'ready',       100, 0, 100,   0, 0, 'unpaid',  'unpaid', null, 'Juan dela Cruz',   'Pay on pickup'),
  ('LAU-1009','CUS-005','Marites Ocampo','0917-122-3344','21 Ilang Rd, Tibungco, Davao City',
     ((now() at time zone 'Asia/Manila')::date - 2), 'in_progress', 120, 0, 120,   0, 0, 'unpaid',  'unpaid', null, 'Ana Reyes',        'In wash'),
  ('LAU-1010','CUS-002','Emmanuel Fernandez','0928-111-2233','34 Sampaguita Ave, Milan, Buhangin, Davao City',
     ((now() at time zone 'Asia/Manila')::date - 3), 'ready',       150, 0, 150,  50, 0, 'partial', 'cash',   null, 'Juan dela Cruz',   '50 deposit, 100 balance'),
  ('LAU-1011','CUS-004','Renato Castillo','0945-111-2233','5 Kalayaan Blvd, Communal, Buhangin, Davao City',
     ((now() at time zone 'Asia/Manila')::date - 4), 'released',    160, 0, 160, 100, 0, 'partial', 'gcash',  'GCH-30011', 'Ana Reyes', 'Picked up, 60 balance')
on conflict (id) do nothing;

insert into public.laundry_order_services
  (laundry_order_id, laundry_service_id, quantity, unit_price, subtotal)
values
  ('LAU-1007','SVC-003', 1, 160, 160),
  ('LAU-1008','SVC-001', 2,  50, 100),
  ('LAU-1009','SVC-002', 2,  60, 120),
  ('LAU-1010','SVC-001', 3,  50, 150),
  ('LAU-1011','SVC-003', 1, 160, 160)
on conflict do nothing;

-- Deposits for the two partial orders, so the payment ledger shows the amount
-- received and the remaining balance (not a silent full payment).
insert into public.payments
  (id, laundry_order_id, water_transaction_id, customer_id, customer_name, type,
   description, amount, amount_received, change_amount, balance, method, status,
   payment_date, gcash_reference, processed_by)
values
  ('PAY-3510','LAU-1010', null, 'CUS-002','Emmanuel Fernandez','laundry','Deposit',
     150,  50, 0, 100, 'cash',  'partial', ((now() at time zone 'Asia/Manila')::date - 3), null,        'Juan dela Cruz'),
  ('PAY-3511','LAU-1011', null, 'CUS-004','Renato Castillo','laundry','Partial payment',
     160, 100, 0,  60, 'gcash', 'partial', ((now() at time zone 'Asia/Manila')::date - 4), 'GCH-30011', 'Ana Reyes')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Verification — current-month headline figures should now read as a healthy,
-- balanced month (revenue > expenses, a non-zero margin, some outstanding).
-- -----------------------------------------------------------------------------
select * from public.bi_summary(
  date_trunc('month', (now() at time zone 'Asia/Manila')::date)::date,
  (now() at time zone 'Asia/Manila')::date
);
