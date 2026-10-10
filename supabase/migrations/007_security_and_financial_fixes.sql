-- =============================================================================
-- MIGRATION 007 — Security hardening and financial-integrity fixes.
--
-- Safe to re-run: every policy is dropped before it is recreated, every function
-- is CREATE OR REPLACE, the trigger is dropped first, and each CHECK constraint
-- is added only if it is not already present and as NOT VALID so existing rows
-- are never rejected. No table is dropped and no row is deleted or modified.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- WHAT THIS FIXES (ids from the QA audit)
--   C-02  A staff account could set its own employees.role to 'admin'.
--   C-03  Any authenticated account (even one with no employee record) had full
--         read/write on every operational table. Access now requires a linked,
--         active employee record.
--   H-01  "Cash/GCash collected" counted the change handed back to the customer.
--   H-02  Daily revenue used the server's UTC date, hiding early-morning sales.
--   H-04  "Outstanding" was summed from payment rows, so never-paid sales showed
--         zero and multi-payment sales double-counted.
--   H-08  Water-sale stock deduction was a read-then-write race (overselling).
--   H-11  The activity log accepted entries attributed to any employee id.
--   M-05  "Mark all read" upserts needed an UPDATE policy it never had.
--   M-15  No CHECK constraints guarded money/quantity columns.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Prerequisite — current_employee_id().
--
-- This helper is normally created in migration 006. If 006 has not been applied
-- to this database, 007's activity-log and notification policies below would
-- fail with "function current_employee_id() does not exist". Defining it here
-- (idempotent CREATE OR REPLACE, identical to 006) makes 007 safe to run on its
-- own. SECURITY DEFINER so the policies that call it do not recurse into RLS.
-- NOTE: migration 006 also creates the notification_reads TABLE; if 006 was
-- skipped, run it too so notification read/unread state persists.
-- -----------------------------------------------------------------------------
create or replace function public.current_employee_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees where auth_user_id = auth.uid() limit 1
$$;

grant execute on function public.current_employee_id() to authenticated;

-- -----------------------------------------------------------------------------
-- C-02 — lock down the sensitive columns on employees.
--
-- The self-update branch of the employees UPDATE policy (migration 001) exists
-- so a user can edit their own name/phone/photo. Nothing stopped that same
-- branch from also changing `role` or `status`, and is_admin() reads `role`, so
-- a staff account could promote itself. This trigger rejects any change to those
-- two columns unless the caller is an admin, independent of which policy allowed
-- the row through.
-- -----------------------------------------------------------------------------
create or replace function public.guard_employee_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and not public.is_admin() then
    raise exception 'Only an administrator may change an employee''s role or status.';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_employee_privileged_columns on public.employees;
create trigger trg_guard_employee_privileged_columns
  before update on public.employees
  for each row execute function public.guard_employee_privileged_columns();

-- -----------------------------------------------------------------------------
-- C-03 — operational tables require a linked employee record.
--
-- Migration 001 opened these with `using (true)` / `with check (true)` for any
-- authenticated role. Self-signup is public, so an account with no employee row
-- could still read and rewrite shop data through the API. current_employee_role()
-- returns NULL for an account that is not linked to an (active) employee, so
-- gating on it closes that gap while leaving real staff unaffected. Delete stays
-- admin-only, exactly as before.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'customers','laundry_services','laundry_addons','laundry_orders',
    'laundry_order_services','laundry_order_addons','water_products','water_transactions',
    'water_transaction_items','payments','inventory_items','suppliers',
    'purchase_orders','purchase_order_items','stock_movements'
  ] loop
    execute format('drop policy if exists alms_read   on public.%I', t);
    execute format('drop policy if exists alms_write  on public.%I', t);
    execute format('drop policy if exists alms_update on public.%I', t);
    execute format('create policy alms_read   on public.%I for select to authenticated using (public.current_employee_role() is not null)', t);
    execute format('create policy alms_write  on public.%I for insert to authenticated with check (public.current_employee_role() is not null)', t);
    execute format('create policy alms_update on public.%I for update to authenticated using (public.current_employee_role() is not null) with check (public.current_employee_role() is not null)', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- H-11 — the activity log may only be written under the caller's own identity.
--
-- The app logs with the signed-in employee's id (or NULL for a system action),
-- so allow exactly those two. This stops a staff account from forging entries
-- attributed to someone else. Read stays admin-only (migration 001).
-- -----------------------------------------------------------------------------
drop policy if exists alms_write on public.activity_logs;
create policy alms_write on public.activity_logs
  for insert to authenticated
  with check (employee_id is null or employee_id = public.current_employee_id());

-- -----------------------------------------------------------------------------
-- M-05 — "Mark all read" upserts, which need UPDATE as well as INSERT.
--
-- Guarded: the notification_reads table is created by migration 006. If 006 has
-- not been applied yet, skip this policy rather than failing the whole script;
-- apply 006 to enable notification read/unread persistence.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.notification_reads') is not null then
    drop policy if exists notification_reads_update on public.notification_reads;
    create policy notification_reads_update on public.notification_reads
      for update to authenticated
      using (employee_id = public.current_employee_id())
      with check (employee_id = public.current_employee_id());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- M-15 — CHECK constraints on money and quantity.
--
-- Added NOT VALID so any pre-existing rows (including demo data) are left alone;
-- the constraints apply to every new or updated row from here on. Guarded so a
-- re-run is a no-op.
-- -----------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('laundry_orders',        'chk_lo_total_nonneg',    'total >= 0'),
      ('laundry_orders',        'chk_lo_subtotal_nonneg', 'subtotal >= 0'),
      ('laundry_orders',        'chk_lo_paid_nonneg',     'amount_paid >= 0'),
      ('laundry_orders',        'chk_lo_discount_nonneg', 'discount >= 0'),
      ('water_transactions',    'chk_wt_total_nonneg',    'total >= 0'),
      ('water_transactions',    'chk_wt_subtotal_nonneg', 'subtotal >= 0'),
      ('water_transactions',    'chk_wt_paid_nonneg',     'amount_paid >= 0'),
      ('payments',              'chk_pay_amount_nonneg',  'amount >= 0'),
      ('payments',              'chk_pay_received_nonneg','amount_received >= 0'),
      ('laundry_order_services','chk_los_qty_pos',        'quantity > 0'),
      ('water_transaction_items','chk_wti_qty_pos',       'quantity > 0'),
      ('inventory_items',       'chk_inv_qty_nonneg',     'current_qty >= 0'),
      ('inventory_items',       'chk_inv_price_nonneg',   'unit_price >= 0')
    ) as v(tbl, name, expr)
  loop
    if not exists (
      select 1 from pg_constraint where conname = c.name
    ) then
      execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- H-08 — atomic water-stock deduction.
--
-- waterService previously read each product's stock, subtracted in JS and wrote
-- it back, so two tablets selling at once could both read the same level and one
-- deduction would be lost (overselling, hidden by the Math.max(0,...) clamp).
-- A single UPDATE takes a row lock, so concurrent calls serialise correctly.
-- SECURITY INVOKER: RLS still applies, matching the rest of the app.
-- -----------------------------------------------------------------------------
create or replace function public.sell_water_stock(p_product_id text, p_qty numeric)
returns void
language sql
as $$
  update public.water_products
     set stock = greatest(0, coalesce(stock, 0) - p_qty)
   where id = p_product_id and track_stock = true;
$$;

grant execute on function public.sell_water_stock(text, numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- H-01 / H-04 — corrected headline figures.
--
--   cash / gcash: collections are what the shop KEEPS, so net of change given
--                 (amount_received - change_amount), not the full tendered cash.
--   outstanding : unpaid balance on the SALES in the window
--                 (total - amount_paid where not fully paid), which counts
--                 never-paid sales and never double-counts partial payments.
--
-- Every other column is unchanged from migration 003.
-- -----------------------------------------------------------------------------
create or replace function public.bi_summary(p_from date, p_to date)
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
    coalesce((select sum(p.amount_received - p.change_amount) from public.payments p
               where p.payment_date between p_from and p_to and p.method = 'cash'), 0),
    coalesce((select sum(p.amount_received - p.change_amount) from public.payments p
               where p.payment_date between p_from and p_to and p.method = 'gcash'), 0),
    coalesce((select sum(e.amount) from public.expenses e
               where e.date between p_from and p_to), 0),
    coalesce((select sum(o.total - o.amount_paid) from public.laundry_orders o
               where o.date between p_from and p_to
                 and o.status <> 'cancelled'
                 and o.payment_status <> 'paid'), 0)
    + coalesce((select sum(t.total - t.amount_paid) from public.water_transactions t
               where t.date between p_from and p_to
                 and t.payment_status <> 'paid'), 0)
$$;

grant execute on function public.bi_summary(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- H-02 — daily revenue anchored to Philippine local date.
--
-- bi_daily_revenue built its day series from the server's current_date (UTC),
-- so between midnight and 08:00 PHT "today" was still yesterday and that
-- morning's sales (dated with the client's local date) fell outside the window.
-- Anchoring on the Asia/Manila date makes the server agree with how the app
-- writes dates. Columns are identical to migration 005.
-- -----------------------------------------------------------------------------
drop function if exists public.bi_daily_revenue(integer);

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
    select ((now() at time zone 'Asia/Manila')::date - offs)::date as d
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
-- Verification
-- -----------------------------------------------------------------------------
select 'employee guard trigger' as item,
       count(*)::text as value from pg_trigger where tgname = 'trg_guard_employee_privileged_columns'
union all select 'operational read policies requiring employee',
       count(*)::text from pg_policies
        where schemaname = 'public' and policyname = 'alms_read'
          and qual ilike '%current_employee_role%'
union all select 'money/qty check constraints added',
       count(*)::text from pg_constraint where conname like 'chk_%'
union all select 'sell_water_stock present',
       count(*)::text from pg_proc where proname = 'sell_water_stock';
