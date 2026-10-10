# ALMS Project Guidance

## Project

ALMS is a React 19, TypeScript, and Vite application for laundry and water-refilling shop operations. It uses React Router, Tailwind CSS 4, Lucide icons, and Supabase for authentication and persistence.

## Commands

- `pnpm dev` starts the Vite development server.
- `pnpm build` runs the production build and TypeScript checks configured by Vite.
- `pnpm exec tsc --noEmit` runs a standalone TypeScript check.
- `pnpm format` formats files with oxfmt.

There is no lint or automated test script currently defined in `package.json`.

## Code Organization

- `src/pages/` contains routed screens; `src/components/` contains reusable UI and layout.
- `src/services/` owns Supabase queries and business operations. Keep database access out of page components.
- `src/context/` holds authentication and state shared across pages. Keep page-specific fetching local to its page where practical.
- `src/types/` contains domain and database types; `src/utils/` and `src/lib/` contain shared helpers and integrations.
- Route definitions and role restrictions are in `src/App.tsx`; preserve the existing React Router structure and `ProtectedRoute` usage.

Follow nearby TypeScript and styling conventions. Prefer the existing UI components and Lucide icons. Keep changes focused and avoid adding dependencies when existing project tools are sufficient.

## Supabase and Data Safety

- Configure local credentials with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. Never commit credentials or expose a service-role key in browser code.
- Make schema changes in a new, sequentially numbered SQL file under `supabase/migrations/`. Never edit a migration that may already have been applied.
- Do not rerun `001_alms_schema.sql` against a database with real data; it drops ALMS tables. Prefer additive, rerunnable changes, and do not delete or narrow existing data as part of a routine migration.
- Follow `supabase/README.md` for migration application and database-specific guidance. Keep row-level security in mind when changing queries or policies.

## Verification

After code changes, run `pnpm exec tsc --noEmit` and `pnpm build` when applicable. For database changes, also review the migration for safe reruns and consistency with the existing schema. Do not claim tests were run unless an actual test command exists and was executed.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.claude/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.claude/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.claude/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.claude/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.claude/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.claude/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->
