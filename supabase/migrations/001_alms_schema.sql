-- =============================================================================
-- ALMS POS & Inventory Management System — complete database schema
--
-- MIGRATION 001 — initial schema. RUN ONCE, on an empty project.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Do not edit or re-run this file once it has been applied. Every later change
-- is a new numbered migration beside it (002_, 003_, …) that adds to the
-- database without dropping anything. See supabase/README.md.
--
-- WHAT THIS DOES
--   Builds every ALMS table, type, policy and seed row from scratch, so the
--   database matches the application exactly. Re-running it rebuilds the
--   database and restores the seed data.
--
--   WARNING: this drops the existing ALMS tables. That is intended — run it
--   before you start entering real data.
--
-- DESIGN NOTES
--   * Enums are used for closed state machines (role, order status, payment
--     method/status, pricing type), whose values are fixed by the application.
--   * Categories and units are text, because an administrator can type or
--     extend them from the UI (Manage Products, Add Item, Add Supplier).
--     Enums there would make those screens fail on any newly added value.
--   * Primary keys are human-readable text (LAU-1006, WAT-TXN-2505) because the
--     POS screens, receipts and PDF exports display them. Line-item and log
--     tables use auto-incrementing bigints.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clean slate — drop in dependency order
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created_link_employee on auth.users;

drop table if exists public.delivery_pricing         cascade;
drop table if exists public.stock_movements          cascade;
drop table if exists public.purchase_order_items     cascade;
drop table if exists public.purchase_orders          cascade;
drop table if exists public.activity_logs            cascade;
drop table if exists public.expenses                 cascade;
drop table if exists public.payments                 cascade;
drop table if exists public.water_transaction_items  cascade;
drop table if exists public.water_transactions       cascade;
drop table if exists public.water_products           cascade;
drop table if exists public.laundry_order_addons     cascade;
drop table if exists public.laundry_order_services   cascade;
drop table if exists public.laundry_orders           cascade;
drop table if exists public.laundry_addons           cascade;
drop table if exists public.laundry_services         cascade;
drop table if exists public.inventory_items          cascade;
drop table if exists public.suppliers                cascade;
drop table if exists public.customers                cascade;
drop table if exists public.employees                cascade;

-- Enum types from the previous schema, plus the ones created below.
drop type if exists public.inventory_unit         cascade;
drop type if exists public.inventory_category     cascade;
drop type if exists public.laundry_unit           cascade;
drop type if exists public.laundry_category       cascade;
drop type if exists public.laundry_type           cascade;
drop type if exists public.water_category         cascade;
drop type if exists public.supplier_category      cascade;
drop type if exists public.supplier_status        cascade;
drop type if exists public.employee_status        cascade;
drop type if exists public.laundry_payment_status cascade;
drop type if exists public.water_payment_status   cascade;
drop type if exists public.expense_category       cascade;
drop type if exists public.employee_role          cascade;
drop type if exists public.account_status         cascade;
drop type if exists public.laundry_order_status   cascade;
drop type if exists public.payment_status         cascade;
drop type if exists public.payment_method         cascade;
drop type if exists public.laundry_pricing_type   cascade;
drop type if exists public.expense_method         cascade;
drop type if exists public.stock_movement_type    cascade;
drop type if exists public.purchase_order_status  cascade;

-- -----------------------------------------------------------------------------
-- 2. Types
-- -----------------------------------------------------------------------------
create type public.employee_role         as enum ('admin', 'staff');
create type public.account_status        as enum ('active', 'inactive');
create type public.laundry_order_status  as enum ('pending', 'in_progress', 'ready', 'released', 'cancelled');
create type public.payment_status        as enum ('paid', 'unpaid', 'partial');
create type public.payment_method        as enum ('cash', 'gcash', 'unpaid');
create type public.laundry_pricing_type  as enum ('per_load', 'per_kg', 'per_item', 'per_pair', 'per_unit');
create type public.expense_method        as enum ('cash', 'bank', 'gcash');
create type public.stock_movement_type   as enum ('stock_in', 'stock_out');
create type public.purchase_order_status as enum ('pending', 'received', 'cancelled');

-- -----------------------------------------------------------------------------
-- 3. Tables
-- -----------------------------------------------------------------------------

-- Staff accounts. auth_user_id links a row to its Supabase Auth login.
create table public.employees (
  id            text primary key,
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  name          text not null,
  role          public.employee_role  not null default 'staff',
  email         text not null unique,
  phone         text,
  status        public.account_status not null default 'active',
  joined        date,
  last_login    timestamptz,
  avatar_url    text                                  -- profile photo (data URL)
);

create table public.customers (
  id          text primary key,
  first_name  text not null,
  last_name   text not null,
  email       text,
  phone       text,
  address     text
);

create table public.suppliers (
  id              text primary key,
  name            text not null,
  contact_person  text,
  phone           text,
  email           text,
  address         text,
  category        text,
  status          public.account_status not null default 'active'
);

create table public.inventory_items (
  id             text primary key,
  name           text    not null,
  category       text    not null,
  unit           text    not null default 'pcs',
  unit_price     numeric not null default 0,
  cost_per_unit  numeric not null default 0,
  current_qty    numeric not null default 0,
  reorder_level  numeric not null default 0,
  supplier_id    text references public.suppliers(id) on delete set null,
  description    text
);

create table public.laundry_services (
  id           text primary key,
  name         text    not null,
  category     text    not null,
  type         public.laundry_pricing_type not null default 'per_load',
  price        numeric not null default 0,
  unit         text    not null default 'load',
  max_kg       numeric,                               -- weight ceiling per load, null = no limit
  description  text,
  is_active    boolean not null default true
);

create table public.laundry_addons (
  id     text primary key,
  name   text    not null,
  price  numeric not null default 0
);

create table public.laundry_orders (
  id              text primary key,
  customer_id     text references public.customers(id) on delete set null,
  customer_name   text not null,
  phone           text,
  address         text,
  date            date not null default current_date,
  status          public.laundry_order_status not null default 'pending',
  subtotal        numeric not null default 0,
  discount        numeric not null default 0,
  total           numeric not null default 0,
  amount_paid     numeric not null default 0,
  change_amount   numeric not null default 0,
  payment_status  public.payment_status not null default 'unpaid',
  payment_method  public.payment_method not null default 'unpaid',
  gcash_reference text,
  processed_by    text,
  notes           text
);

create table public.laundry_order_services (
  id                 bigint generated by default as identity primary key,
  laundry_order_id   text not null references public.laundry_orders(id) on delete cascade,
  laundry_service_id text references public.laundry_services(id) on delete set null,
  quantity           numeric not null default 1,
  unit_price         numeric not null default 0,
  subtotal           numeric not null default 0
);

create table public.laundry_order_addons (
  id                bigint generated by default as identity primary key,
  laundry_order_id  text not null references public.laundry_orders(id) on delete cascade,
  laundry_addon_id  text references public.laundry_addons(id) on delete set null,
  quantity          numeric not null default 1,
  unit_price        numeric not null default 0,
  subtotal          numeric not null default 0
);

create table public.water_products (
  id           text primary key,
  name         text    not null,
  category     text    not null,
  price        numeric not null default 0,
  unit         text    not null default 'pc',
  icon         text,                                  -- emoji fallback for POS tiles
  image_url    text,                                  -- uploaded photo (data URL)
  description  text,
  stock        numeric,                               -- null when stock is not tracked
  is_active    boolean not null default true,
  track_stock  boolean not null default false,
  -- Refilled water counts toward the delivery fee tier; caps and bottles do not.
  counts_for_delivery boolean not null default false
);

create table public.water_transactions (
  id               text primary key,
  customer_id      text references public.customers(id) on delete set null,
  customer_name    text not null,
  phone            text,
  address          text,
  date             date not null default current_date,
  subtotal         numeric not null default 0,
  delivery_fee     numeric not null default 0,
  discount         numeric not null default 0,
  total            numeric not null default 0,
  amount_paid      numeric not null default 0,
  change_amount    numeric not null default 0,
  payment_method   public.payment_method not null default 'unpaid',
  payment_status   public.payment_status not null default 'unpaid',
  gcash_reference  text,
  delivery         boolean not null default false,
  delivery_address text,
  processed_by     text,
  notes            text
);

create table public.water_transaction_items (
  id               bigint generated by default as identity primary key,
  transaction_id   text not null references public.water_transactions(id) on delete cascade,
  water_product_id text references public.water_products(id) on delete set null,
  quantity         numeric not null default 1,
  unit_price       numeric not null default 0,
  subtotal         numeric not null default 0
);

create table public.payments (
  id                   text primary key,
  laundry_order_id     text references public.laundry_orders(id) on delete set null,
  water_transaction_id text references public.water_transactions(id) on delete set null,
  customer_id          text references public.customers(id) on delete set null,
  customer_name        text,
  type                 text,                          -- 'laundry' | 'water' | 'debt'
  description          text,
  amount               numeric not null default 0,
  amount_received      numeric not null default 0,
  change_amount        numeric not null default 0,
  balance              numeric not null default 0,
  method               public.payment_method not null default 'unpaid',
  status               public.payment_status not null default 'unpaid',
  payment_date         date not null default current_date,
  gcash_reference      text,
  processed_by         text
);

create table public.expenses (
  id           text primary key,
  date         date    not null default current_date,
  category     text    not null,
  description  text    not null,
  amount       numeric not null default 0,
  method       public.expense_method not null default 'cash',
  supplier_id  text references public.suppliers(id) on delete set null,
  recorded_by  text,
  notes        text
);

create table public.purchase_orders (
  id                text primary key,
  supplier_id       text references public.suppliers(id) on delete set null,
  supplier_name     text not null,
  date              date not null default current_date,
  expected_delivery date,
  received_date     date,
  status            public.purchase_order_status not null default 'pending',
  payment_status    public.payment_status        not null default 'unpaid',
  total             numeric not null default 0,
  requested_by      text,
  notes             text
);

create table public.purchase_order_items (
  id                bigint generated by default as identity primary key,
  purchase_order_id text not null references public.purchase_orders(id) on delete cascade,
  inventory_item_id text references public.inventory_items(id) on delete set null,
  name              text    not null,
  quantity          numeric not null default 0,
  unit              text    not null default 'pcs',
  unit_cost         numeric not null default 0,
  subtotal          numeric not null default 0
);

create table public.stock_movements (
  id                bigint generated by default as identity primary key,
  inventory_item_id text not null references public.inventory_items(id) on delete cascade,
  item_name         text not null,
  type              public.stock_movement_type not null,
  quantity          numeric not null,
  unit              text    not null default 'pcs',
  prev_stock        numeric not null default 0,
  new_stock         numeric not null default 0,
  supplier_id       text references public.suppliers(id) on delete set null,
  supplier_name     text,
  po_ref            text,
  reference         text,
  reason            text,
  processed_by      text,
  datetime          timestamptz not null default now()
);

-- Delivery is charged in tiers, not per gallon: 4 gallons is 100 + 35 = 155,
-- not 4 x 35. Each row is the total charge for exactly that many refills.
-- Quantities above the largest tier repeat it, then add the remainder tier
-- (7 = 200 + 35, 8 = 200 + 70, ...).
create table public.delivery_pricing (
  id        bigint generated by default as identity primary key,
  quantity  integer not null unique check (quantity > 0),
  price     numeric not null check (price >= 0),
  is_active boolean not null default true
);

create table public.activity_logs (
  id          bigint generated by default as identity primary key,
  employee_id text references public.employees(id) on delete set null,
  action      text not null,
  module      text not null,
  ip_address  text,
  datetime    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. Indexes for the lists the app sorts and filters on
-- -----------------------------------------------------------------------------
create index idx_employees_auth_user      on public.employees(auth_user_id);
create index idx_laundry_orders_date      on public.laundry_orders(date desc);
create index idx_laundry_orders_status    on public.laundry_orders(status);
create index idx_laundry_svc_order        on public.laundry_order_services(laundry_order_id);
create index idx_laundry_addon_order      on public.laundry_order_addons(laundry_order_id);
create index idx_water_tx_date            on public.water_transactions(date desc);
create index idx_water_items_tx           on public.water_transaction_items(transaction_id);
create index idx_payments_date            on public.payments(payment_date desc);
create index idx_expenses_date            on public.expenses(date desc);
create index idx_stock_movements_item     on public.stock_movements(inventory_item_id);
create index idx_stock_movements_datetime on public.stock_movements(datetime desc);
create index idx_po_items_po              on public.purchase_order_items(purchase_order_id);
create index idx_activity_logs_datetime   on public.activity_logs(datetime desc);

-- -----------------------------------------------------------------------------
-- 5. Role helpers — read the signed-in user's role from employees.
--    SECURITY DEFINER so the policies below do not recurse into RLS.
-- -----------------------------------------------------------------------------
create or replace function public.current_employee_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.employees where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_employee_role() = 'admin', false)
$$;

grant execute on function public.current_employee_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
--    Staff → Laundry, Water Refilling, Payments, Inventory (+ read reference data)
--    Admin → everything, including Users, Finance and Activity Logs
-- -----------------------------------------------------------------------------

-- 6a. Operational tables: any signed-in employee may read and write;
--     only an admin may delete.
do $$
declare t text;
begin
  foreach t in array array[
    'customers','laundry_services','laundry_addons','laundry_orders',
    'laundry_order_services','laundry_order_addons','water_products','water_transactions',
    'water_transaction_items','payments','inventory_items','suppliers',
    'purchase_orders','purchase_order_items','stock_movements','delivery_pricing'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy alms_read   on public.%I for select to authenticated using (true)', t);
    execute format('create policy alms_write  on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy alms_update on public.%I for update to authenticated using (true) with check (true)', t);
    execute format('create policy alms_delete on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- 6b. Employees: everyone signed in can read the directory (needed to resolve
--     their own profile and show "processed by" names). Only an admin may create
--     or remove accounts; a user may update their own row (name, phone, photo).
alter table public.employees enable row level security;

create policy alms_read on public.employees
  for select to authenticated using (true);

create policy alms_write on public.employees
  for insert to authenticated with check (public.is_admin());

create policy alms_update on public.employees
  for update to authenticated
  using (public.is_admin() or auth_user_id = auth.uid())
  with check (public.is_admin() or auth_user_id = auth.uid());

create policy alms_delete on public.employees
  for delete to authenticated using (public.is_admin());

-- 6c. Finance: admin only.
alter table public.expenses enable row level security;

create policy alms_read   on public.expenses for select to authenticated using (public.is_admin());
create policy alms_write  on public.expenses for insert to authenticated with check (public.is_admin());
create policy alms_update on public.expenses for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy alms_delete on public.expenses for delete to authenticated using (public.is_admin());

-- 6d. Activity log: anyone signed in may append; only admins may read the trail.
alter table public.activity_logs enable row level security;

create policy alms_write on public.activity_logs for insert to authenticated with check (true);
create policy alms_read  on public.activity_logs for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Grants (RLS still decides who sees which rows)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Seed data — reference records plus a little history so the dashboard,
--    reports and analytics are not empty on first run.
-- -----------------------------------------------------------------------------
insert into public.suppliers (id, name, contact_person, phone, email, address, category, status) values
  ('SUP-001','Procter & Gamble Dist.','Aldo Ramos','028001234','sales@pgdist.ph','Tondo, Manila','Laundry','active'),
  ('SUP-002','AquaPure Supplies Co.','Gina Cruz','028005678','orders@aquapure.ph','Buhangin, Davao','Water','active'),
  ('SUP-003','Clorox PH Distributor','Ben Santos','028009012','clorox@phsupply.com','GMall, Davao','Laundry','active'),
  ('SUP-004','General Supplies PH','Rica Lopez','028003456','info@generalsupplies.ph','Bankerohan, Davao','Mixed','active'),
  ('SUP-005','Office Depot PH','Tina Reyes','028007890','b2b@officedepot.ph','SM Mall of Asia, Pasay','Mixed','active');

insert into public.inventory_items (id, name, category, unit, unit_price, cost_per_unit, current_qty, reorder_level, supplier_id, description) values
  ('INV-001','Ariel Detergent Powder (1kg)','Laundry','kg',120,120,15,10,'SUP-001','Heavy-duty detergent powder for commercial laundry use'),
  ('INV-002','Downy Fabric Softener (900mL)','Laundry','bottle',165,165,8,10,'SUP-001','Concentrated fabric softener, floral scent'),
  ('INV-003','Clorox Bleach (3.785L)','Laundry','jug',280,280,4,5,'SUP-003','Industrial-grade whitening bleach'),
  ('INV-004','Mr. Clean Stain Remover','Laundry','bottle',95,95,12,8,'SUP-001','Concentrated stain remover for stubborn stains'),
  ('INV-005','20L Purified Water Gallon (empty)','Water','pcs',250,250,45,30,'SUP-002','Empty food-grade 20-liter gallon containers'),
  ('INV-006','Gallon Cap (Universal)','Water','pcs',2.50,2.50,200,100,'SUP-002','Standard universal gallon caps'),
  ('INV-007','Tamper-Proof Seal Wrap','Water','pieces',180,180,3,5,'SUP-002','Heat-shrink tamper-evident seal for gallon safety'),
  ('INV-008','Laundry Mesh Bag (Large)','Accessories','pcs',85,85,20,10,'SUP-004','Heavy-duty zipped mesh laundry bags'),
  ('INV-009','Receipt Rolls (57mm)','Office','rolls',35,35,6,4,'SUP-005','Thermal paper receipt rolls for POS printer'),
  ('INV-010','Packaging Bag (Large)','Packaging','pcs',3,3,150,100,'SUP-004','Clear plastic packaging bags for laundry');

insert into public.laundry_services (id, name, category, type, price, unit, max_kg, description, is_active) values
  ('SVC-001','Clothes Wash (≤8kg)','Clothes','per_load',50,'load',8,'Drop-off / self-service wash, up to 8kg per load',true),
  ('SVC-002','Clothes Dry (≤8kg)','Clothes','per_load',60,'load',8,'Drop-off / self-service dry, up to 8kg per load',true),
  ('SVC-003','Beddings/Towels Wash+Dry (≤4kg)','Special Items','per_load',160,'load',4,'Drop-off only. Wash and dry for beddings and towels, up to 4kg per load',true);

insert into public.laundry_addons (id, name, price) values
  ('ADD-001','Detergent (sachet)',15),
  ('ADD-002','Fabric Softener',15),
  ('ADD-003','Bleach',20),
  ('ADD-004','Stain Remover',25),
  ('ADD-005','Extra Rinse',10);

-- Pickup / refill-at-store price is simply the product price (20L = 25 each).
-- counts_for_delivery marks the refills that drive the delivery tier.
insert into public.water_products (id, name, category, price, unit, icon, stock, description, is_active, track_stock, counts_for_delivery) values
  ('WAT-001','20L Round/Slim Gallon (Refill)','Refill',25,'gallon','🛢️',null,'Purified water refill for the customer''s own 20L round or slim gallon.',true,false,true),
  ('WAT-002','10L Gallon (Refill)','Refill',15,'gallon','💧',null,'Purified water refill for 10L containers.',true,false,true),
  ('WAT-003','4L Gallon (Refill)','Refill',10,'gallon','💧',null,'Purified water refill for 4L containers.',true,false,true),
  ('WAT-004','Gallon Cap (Replacement)','Cap',5,'pc','🔵',500,'Standard replacement cap for slim and round gallons.',true,true,false),
  ('WAT-005','500mL Bottled Water','Bottled',20,'bottle','🍶',120,'Sealed 500mL purified bottled water.',true,true,false),
  ('WAT-006','Mineral Water 1L','Bottled',35,'bottle','🍶',75,'Sealed 1L mineral water bottle.',true,true,false),
  ('WAT-007','20L Round/Slim Gallon (Empty)','Container',250,'pc','🫙',45,'Brand-new empty 20L food-grade container. Sold without water.',true,true,false),
  ('WAT-008','Big Gallon Cap (Replacement)','Cap',10,'pc','🔷',200,'Large-diameter replacement cap for wide-mouth gallons.',true,true,false);

-- Delivery fee tiers (total charge for that many refilled waters).
insert into public.delivery_pricing (quantity, price, is_active) values
  (1, 35, true),
  (2, 70, true),
  (3, 100, true),
  (4, 155, true),
  (5, 170, true),
  (6, 200, true);

insert into public.customers (id, first_name, last_name, email, phone, address) values
  ('CUS-001','Rosario','Buenaventura','rosario.b@gmail.com','0917-111-2233','12 Mint St, Countryville Exec. Homes, Cabantian, Davao City'),
  ('CUS-002','Emmanuel','Fernandez','emman.f@yahoo.com','0928-111-2233','34 Sampaguita Ave, Milan, Buhangin, Davao City'),
  ('CUS-003','Ligaya','Villanueva','ligaya.v@gmail.com','0939-111-2233','78 Rosal St, Deca Homes, Cabantian, Davao City'),
  ('CUS-004','Renato','Castillo','renato.c@gmail.com','0945-111-2233','5 Kalayaan Blvd, Communal, Buhangin, Davao City'),
  ('CUS-005','Marites','Ocampo','marites.o@outlook.com','0917-122-3344','21 Ilang Rd, Tibungco, Davao City'),
  ('CUS-006','Danilo','Soriano','danilo.s@gmail.com','0928-122-3344','9 Dacudao Ave, Agdao, Davao City');

-- Employees. auth_user_id stays NULL until the matching Supabase Auth login is
-- created; section 9 links them by e-mail.
insert into public.employees (id, name, role, email, phone, status, joined) values
  ('EMP-001','Aedzel Louis M. Sarmiento','admin','almswaterrefillingstation@gmail.com','0932-854-5660','active','2023-01-10'),
  ('EMP-002','Maria Santos','staff','maria.santos@alms.ph','0928-123-4567','active','2024-03-15'),
  ('EMP-003','Ana Reyes','staff','ana.reyes@alms.ph','0939-234-5678','active','2024-07-01'),
  ('EMP-004','Juan dela Cruz','staff','juan.delacruz@alms.ph','0945-345-6789','active','2025-02-20');

-- Dates are relative to the day this script runs, so the Business Intelligence
-- filters (Today / This Week / This Month / This Year) all have data to show.
insert into public.expenses (id, date, category, description, amount, method, supplier_id, recorded_by) values
  ('EXP-001', current_date - 1,             'Inventory/Supplies','Detergent restock delivery',           3655,'cash','SUP-001','Maria Santos'),
  ('EXP-002', current_date - 2,             'Utilities',         'Water bill — current period',          2200,'cash',null,   'Maria Santos'),
  ('EXP-003', current_date - 9,             'Utilities',         'Electric bill — current period',       8400,'bank',null,   'Maria Santos'),
  ('EXP-004', date_trunc('year', current_date)::date + 30, 'Inventory/Supplies','Gallon container restock', 5500,'bank','SUP-002','Maria Santos');
-- Rent, salaries and the utility bills are recurring, so they are generated
-- per month in section 8b rather than listed one by one here. This month's
-- overheads are deliberately absent: they have not been recorded yet, which is
-- also why the current month shows a thinner expense column than the rest.

insert into public.purchase_orders (id, supplier_id, supplier_name, date, expected_delivery, received_date, status, payment_status, total, requested_by, notes) values
  ('PO-0021','SUP-001','Procter & Gamble Dist.', current_date - 12, current_date - 10, current_date - 10,'received','paid',3655,'Maria Santos','Monthly reorder'),
  ('PO-0020','SUP-002','AquaPure Supplies Co.',   current_date - 40, current_date - 38, current_date - 38,'received','paid',5500,'Maria Santos',null);

insert into public.purchase_order_items (purchase_order_id, inventory_item_id, name, quantity, unit, unit_cost, subtotal) values
  ('PO-0021','INV-001','Ariel Detergent Powder (1kg)',10,'kg',120,1200),
  ('PO-0021','INV-002','Downy Fabric Softener (900mL)',12,'bottle',165,1980),
  ('PO-0021','INV-004','Mr. Clean Stain Remover',5,'bottle',95,475),
  ('PO-0020','INV-005','20L Purified Water Gallon (empty)',20,'pcs',250,5000),
  ('PO-0020','INV-006','Gallon Cap (Universal)',200,'pcs',2.50,500);

-- Unpaid orders store payment_method 'unpaid'; the UI renders that as a dash.
insert into public.laundry_orders (id, customer_id, customer_name, phone, date, status, subtotal, discount, total, amount_paid, change_amount, payment_status, payment_method, gcash_reference, processed_by, notes) values
  ('LAU-1006','CUS-001','Rosario Buenaventura','09171112233', current_date,      'in_progress',480,0,480,0,0,    'unpaid','unpaid',null,      'Juan dela Cruz','Handle with care — delicate fabrics'),
  ('LAU-1005','CUS-002','Emmanuel Fernandez','09281112233',   current_date,      'ready',      270,0,270,300,30,  'paid','cash',null,         'Juan dela Cruz',null),
  ('LAU-1004','CUS-003','Ligaya Villanueva','09391112233',    current_date - 2,  'released',   160,0,160,160,0,   'paid','gcash','GCH-99115', 'Ana Reyes',null),
  ('LAU-1003','CUS-004','Renato Castillo','09451112233',      current_date - 5,  'pending',    320,20,300,0,0,    'unpaid','unpaid',null,     'Juan dela Cruz','Customer will pay on pickup'),
  ('LAU-1002','CUS-005','Marites Ocampo','09171223344',       current_date - 18, 'released',   250,0,250,250,0,   'paid','cash',null,         'Ana Reyes',null),
  ('LAU-1001','CUS-006','Danilo Soriano','09281223344',       current_date - 70, 'released',   250,0,250,250,0,   'paid','gcash','GCH-99110', 'Ana Reyes',null);

insert into public.laundry_order_services (laundry_order_id, laundry_service_id, quantity, unit_price, subtotal) values
  ('LAU-1006','SVC-003',3,160,480),
  ('LAU-1005','SVC-001',3,50,150),
  ('LAU-1005','SVC-002',2,60,120),
  ('LAU-1004','SVC-003',1,160,160),
  ('LAU-1003','SVC-003',2,160,320),
  ('LAU-1002','SVC-001',5,50,250),
  ('LAU-1001','SVC-001',5,50,250);

insert into public.laundry_order_addons (laundry_order_id, laundry_addon_id, quantity, unit_price, subtotal) values
  ('LAU-1006','ADD-002',1,15,15),
  ('LAU-1005','ADD-001',1,15,15),
  ('LAU-1003','ADD-004',1,25,25);

insert into public.water_transactions (id, customer_id, customer_name, phone, address, date, subtotal, delivery_fee, discount, total, amount_paid, change_amount, payment_method, payment_status, gcash_reference, delivery, delivery_address, processed_by, notes) values
  ('WAT-TXN-2505',null,'Walk-in',null,null, current_date, 75,0,0,75,100,25,'cash','paid',null,false,null,'Juan dela Cruz','Pickup / refill at store'),
  ('WAT-TXN-2504','CUS-004','Renato Castillo','09451112233','5 Kalayaan Blvd, Communal, Buhangin, Davao City', current_date, 100,155,0,255,255,0,'gcash','paid','GCH-99120',true,'5 Kalayaan Blvd, Communal, Buhangin, Davao City','Juan dela Cruz','4 refills delivered — tiered fee 155'),
  ('WAT-TXN-2503','CUS-001','Rosario Buenaventura','09171112233','12 Mint St, Cabantian, Davao City', current_date - 3, 50,70,0,120,120,0,'cash','paid',null,true,'12 Mint St, Cabantian, Davao City','Ana Reyes','2 refills delivered'),
  ('WAT-TXN-2502',null,'Walk-in',null,null, current_date - 20, 125,0,0,125,125,0,'cash','paid',null,false,null,'Ana Reyes','Pickup / refill at store'),
  ('WAT-TXN-2501','CUS-006','Danilo Soriano','09281223344','9 Dacudao Ave, Agdao, Davao City', current_date - 90, 75,100,0,175,200,25,'cash','paid',null,true,'9 Dacudao Ave, Agdao, Davao City','Juan dela Cruz','3 refills delivered');

insert into public.water_transaction_items (transaction_id, water_product_id, quantity, unit_price, subtotal) values
  ('WAT-TXN-2505','WAT-001',3,25,75),
  ('WAT-TXN-2504','WAT-001',4,25,100),
  ('WAT-TXN-2503','WAT-001',2,25,50),
  ('WAT-TXN-2502','WAT-001',5,25,125),
  ('WAT-TXN-2501','WAT-001',3,25,75);

insert into public.payments (id, laundry_order_id, water_transaction_id, customer_id, customer_name, type, description, amount, amount_received, change_amount, balance, method, status, payment_date, gcash_reference, processed_by) values
  ('PAY-3509',null,null,null,'Michael Tan','debt','Unpaid water delivery for this week',350,0,0,350,'unpaid','unpaid', current_date,      null,       'Juan dela Cruz'),
  ('PAY-3508',null,null,null,'Sarah Santos','debt','Laundry balance (Beddings)',150,0,0,150,'unpaid','unpaid',          current_date - 1,  null,       'Juan dela Cruz'),
  ('PAY-3507',null,'WAT-TXN-2505',null,'Walk-in','water',null,75,100,25,0,'cash','paid',                               current_date,      null,       'Juan dela Cruz'),
  ('PAY-3506',null,'WAT-TXN-2504','CUS-004','Renato Castillo','water',null,255,255,0,0,'gcash','paid',                 current_date,      'GCH-99120','Juan dela Cruz'),
  ('PAY-3505','LAU-1005',null,'CUS-002','Emmanuel Fernandez','laundry',null,270,300,30,0,'cash','paid',                current_date,      null,       'Juan dela Cruz'),
  ('PAY-3504','LAU-1004',null,'CUS-003','Ligaya Villanueva','laundry',null,160,160,0,0,'gcash','paid',                 current_date - 2,  'GCH-99115','Ana Reyes'),
  ('PAY-3503',null,'WAT-TXN-2503','CUS-001','Rosario Buenaventura','water',null,120,120,0,0,'cash','paid',             current_date - 3,  null,       'Ana Reyes'),
  ('PAY-3502','LAU-1002',null,'CUS-005','Marites Ocampo','laundry',null,250,250,0,0,'cash','paid',                     current_date - 18, null,       'Ana Reyes'),
  ('PAY-3501','LAU-1001',null,'CUS-006','Danilo Soriano','laundry',null,250,250,0,0,'gcash','paid',                    current_date - 70, 'GCH-99110','Ana Reyes');

insert into public.stock_movements (inventory_item_id, item_name, type, quantity, unit, prev_stock, new_stock, supplier_id, supplier_name, po_ref, reference, reason, processed_by, datetime) values
  ('INV-001','Ariel Detergent Powder (1kg)','stock_in',10,'kg',5,15,'SUP-001','Procter & Gamble Dist.','PO-0021','PO-0021','Purchase delivery','Maria Santos',now() - interval '10 days'),
  ('INV-005','20L Purified Water Gallon (empty)','stock_in',20,'pcs',25,45,'SUP-002','AquaPure Supplies Co.','PO-0020','PO-0020','Purchase delivery','Maria Santos',now() - interval '38 days'),
  ('INV-002','Downy Fabric Softener (900mL)','stock_out',2,'bottle',10,8,null,null,null,'LAU-1005','Laundry Usage','Juan dela Cruz',now() - interval '2 hours');

insert into public.activity_logs (employee_id, module, action, ip_address, datetime) values
  ('EMP-004','Laundry','Created laundry order LAU-1006 for Rosario Buenaventura','192.168.1.10', now() - interval '1 hour'),
  ('EMP-004','Payment','Recorded payment PAY-3507 (Cash) for WAT-TXN-2505','192.168.1.10', now() - interval '2 hours'),
  ('EMP-004','Water Refilling','Created water sale WAT-TXN-2504 for Renato Castillo','192.168.1.10', now() - interval '3 hours'),
  ('EMP-003','Inventory','Stock-in +10 kg for Ariel Detergent Powder (1kg)','192.168.1.12', now() - interval '10 days');

-- -----------------------------------------------------------------------------
-- 9. Link employees to their Supabase Auth logins
--
--    Create the accounts in Dashboard → Authentication → Users → Add user
--    (tick "Auto Confirm User"), using the same e-mail as the employee row:
--      almswaterrefillingstation@gmail.com   → admin
--      maria.santos@alms.ph                  → staff
--
--    The trigger links any account created from now on; the UPDATE below
--    catches accounts that already exist.
-- -----------------------------------------------------------------------------
create or replace function public.link_employee_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employees
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null;
  return new;
end $$;

create trigger on_auth_user_created_link_employee
  after insert on auth.users
  for each row execute function public.link_employee_to_auth_user();

update public.employees e
set    auth_user_id = u.id
from   auth.users u
where  lower(u.email) = lower(e.email)
and    e.auth_user_id is distinct from u.id;

-- -----------------------------------------------------------------------------
-- 10. Verification — every row count below should be non-zero.
-- -----------------------------------------------------------------------------
select 'employees' as table_name, count(*) as row_count from public.employees
union all select 'customers',               count(*) from public.customers
union all select 'suppliers',               count(*) from public.suppliers
union all select 'inventory_items',         count(*) from public.inventory_items
union all select 'laundry_services',        count(*) from public.laundry_services
union all select 'laundry_addons',          count(*) from public.laundry_addons
union all select 'water_products',          count(*) from public.water_products
union all select 'laundry_orders',          count(*) from public.laundry_orders
union all select 'laundry_order_services',  count(*) from public.laundry_order_services
union all select 'laundry_order_addons',    count(*) from public.laundry_order_addons
union all select 'water_transactions',      count(*) from public.water_transactions
union all select 'water_transaction_items', count(*) from public.water_transaction_items
union all select 'payments',                count(*) from public.payments
union all select 'expenses',                count(*) from public.expenses
union all select 'purchase_orders',         count(*) from public.purchase_orders
union all select 'purchase_order_items',    count(*) from public.purchase_order_items
union all select 'stock_movements',         count(*) from public.stock_movements
union all select 'activity_logs',           count(*) from public.activity_logs
union all select 'delivery_pricing',        count(*) from public.delivery_pricing
order by 1;
