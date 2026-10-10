# ALMS database migrations

Every change to the database is a new numbered file in `migrations/`. Files are
applied in order and **never edited once they have been run**, so the folder is
also the history of how the database got to where it is.

## Applying them

Supabase Dashboard → **SQL Editor** → **New query** → paste one file → **Run**.
One file per query. Run them in ascending order and stop at the first error.

Each migration ends with a small `select` that prints what it changed, so you
can see it worked without going hunting.

## What is here

| File | What it does | Safe to re-run? |
|---|---|---|
| `001_alms_schema.sql` | Initial schema: types, 19 tables, indexes, role helpers, RLS, grants, reference data, the Auth link trigger | **No — it drops every ALMS table.** Fresh project only |
| `002_delivery_pricing_and_service_limits.sql` | Tiered `delivery_pricing`, `laundry_services.max_kg`, `water_products.counts_for_delivery`, and admin-only pricing policies | Yes |
| `003_bi_aggregate_functions.sql` | `bi_summary`, `bi_top_sellers`, `bi_monthly_revenue`, `bi_daily_revenue` | Yes |
| `004_demo_trading_history.sql` | **Optional.** ~5,800 rows of invented sales so the charts have history | Yes (adds nothing twice) |

### Which ones do I run?

- **New / empty Supabase project** → `001`, `002`, `003`, then `004` only if you
  want demo data for a presentation.
- **You already ran the old combined `001_alms_schema_rls_seed.sql`** → run `002`
  and `003`. They detect what is already there and only add what is missing.
  Nothing is dropped and no row is touched.
- **Recording the shop's real takings** → skip `004` entirely. Nothing in the
  application depends on it.

`003` is not optional: the Business Intelligence screens call those four
functions.

## Adding the next change

1. Create the next number with a name that says what it does, e.g.
   `005_add_customer_loyalty_points.sql`.
2. Check the live schema first so you do not add something twice. The guards to
   use:

   ```sql
   create table if not exists ...
   alter table ... add column if not exists ...
   create index if not exists ...
   drop function if exists ...;  create function ...
   insert into ... on conflict (...) do nothing
   ```

   Policies have no `if not exists`, so either guard them with a
   `pg_policies` lookup or `drop policy if exists` immediately before creating
   them — `002` does the latter.
3. **Do not** `drop table`, `truncate`, `delete from`, or `drop column` for a
   normal change. Widening is safe; narrowing loses data.
4. Update the affected service in `src/services/` and the UI if the change is
   visible.
5. Run `npx tsc --noEmit`, `npm run build`, and the database tests.
6. If something fails, fix it in a **new** migration rather than resetting the
   database.

## Why the reports are database functions

`003` exists because of a limit that is easy to miss: PostgREST returns at most
**1,000 rows** per request by default. The reports used to fetch transactions
and add them up in the browser, which silently stopped counting past the
thousandth sale — measured on the demo data, a year's revenue came back as
₱171,985 instead of ₱496,540.

The `bi_*` functions do the arithmetic in Postgres and return one row, so the
totals stay correct however long the shop trades. They are `SECURITY INVOKER`,
so Row Level Security still applies: a staff account gets 0 for expenses from
the function exactly as it would from a direct select.

## A note on `001`

`001` begins by dropping the ALMS tables. That is deliberate — it is the
initial build, meant for an empty project before any real data exists. Once
you have started entering the shop's actual records, never run it again.
Everything after that is a new numbered migration.
