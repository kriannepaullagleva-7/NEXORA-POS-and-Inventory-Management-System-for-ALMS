-- =============================================================================
-- MIGRATION 006 — Persisted read/unread state for the notification bell.
--
-- Safe to re-run: every create is guarded, and no existing row is touched.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- WHY
--   The notification bell (Layout.tsx) used to show three hardcoded sample
--   notifications plus the live low-stock list, with read/unread state kept
--   only in a useState — gone on refresh, and not shared between devices.
--
--   Notifications themselves are NOT stored as an event log here. They are
--   computed live, each time, from the records that are already real and
--   already correct (laundry orders ready for pickup, low/critical stock,
--   unpaid payments, pending purchase orders) — see notificationService.ts.
--   That means a notification never goes stale or dangles: once an order is
--   picked up, or a debt is settled, it simply stops being computed, with no
--   separate "notifications" row to clean up and no risk of linking to a
--   deleted record.
--
--   What *does* need to persist is which of those computed notifications a
--   given employee has already seen. Each one gets a stable, deterministic
--   key (e.g. "ready-LAU-1005", "debt-PAY-3509") and this table remembers,
--   per employee, which keys have been opened.
-- =============================================================================

create table if not exists public.notification_reads (
  employee_id text not null references public.employees(id) on delete cascade,
  notif_key   text not null,
  read_at     timestamptz not null default now(),
  primary key (employee_id, notif_key)
);

create index if not exists idx_notification_reads_employee on public.notification_reads(employee_id);

-- -----------------------------------------------------------------------------
-- Helper — the signed-in user's own employee id, mirroring current_employee_role()
-- from migration 001. SECURITY DEFINER so the policy below does not recurse.
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
-- Row Level Security — an employee may only see and write their own read
-- state. Unlike the operational tables in migration 001, this is not shared
-- shop data; it is per-user UI state, so it does not follow the all-staff
-- read/write pattern.
-- -----------------------------------------------------------------------------
alter table public.notification_reads enable row level security;

drop policy if exists notification_reads_select on public.notification_reads;
drop policy if exists notification_reads_insert on public.notification_reads;
drop policy if exists notification_reads_delete on public.notification_reads;

create policy notification_reads_select on public.notification_reads
  for select to authenticated
  using (employee_id = public.current_employee_id());

create policy notification_reads_insert on public.notification_reads
  for insert to authenticated
  with check (employee_id = public.current_employee_id());

-- "Mark all read" over a large notification set is implemented as upserts,
-- not updates, so no update policy is needed. Delete is included only for
-- completeness (e.g. a future "clear read history" action); nothing in the
-- app currently deletes rows here.
create policy notification_reads_delete on public.notification_reads
  for delete to authenticated
  using (employee_id = public.current_employee_id());

grant select, insert, delete on public.notification_reads to authenticated;

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------
select 'notification_reads policies (expect 3)' as item,
       count(*)::text as value
  from pg_policies
 where schemaname = 'public' and tablename = 'notification_reads';
