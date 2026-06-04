# Urban Mistrii Site

Repository mirror for the Urban Mistrii website.

## Internal Apps

- `apps/payroll` builds the internal payroll app served at `/portal/payroll`.
- `packages/payroll-core` owns deterministic salary calculation logic.
- `database/supabase-payroll-schema.sql` creates payroll tables and RLS policies.
- `database/supabase-payroll-may-2026-import.sql` seeds the May 2026 employee roster and payroll run from the company sheet.

Run `npm install`, then `npm run build` to generate the static site and payroll app into `public/`.
