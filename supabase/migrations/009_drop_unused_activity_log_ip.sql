-- =============================================================================
-- MIGRATION 009 — Drop the unused activity_logs.ip_address column.
--
-- WHY
--   The column was read and shown in the Activity Logs table but never written:
--   activityService.log() inserts employee_id, module, action and datetime only.
--   So every entry the application has ever recorded has a NULL ip_address, and
--   the only rows with a value are the seeded demo ones (192.168.1.10, etc.).
--   In an audit trail that is worse than useless — it reads as though older
--   events were traced to a machine and newer ones were not.
--
--   It also cannot be populated correctly from this architecture. The browser
--   cannot know its own public address without calling a third-party lookup
--   service, and inet_client_addr() inside Postgres returns Supabase's
--   connection-pooler address, not the user's. Rather than leave a misleading
--   column or invent a value, the column is removed along with the UI that
--   displayed it.
--
-- Safe to re-run: guarded with IF EXISTS. No other column or row is touched.
--
-- IRREVERSIBLE: this drops the column and the seeded demo IP values with it.
-- Those values were invented, so nothing real is lost — but a restore would
-- need a backup. Take one first if you want the option.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- =============================================================================

alter table public.activity_logs drop column if exists ip_address;

-- -----------------------------------------------------------------------------
-- Verification — expect 0.
-- -----------------------------------------------------------------------------
select count(*)::text as "ip_address columns remaining"
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'activity_logs'
   and column_name  = 'ip_address';
