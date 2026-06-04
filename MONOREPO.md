# Urban Mistrii Monorepo Notes

The public website remains at the repository root. Internal product code lives in workspace folders so Vercel can build each app without changing the public site URLs.

## Workspaces

| Path | Purpose |
| --- | --- |
| `apps/payroll` | React payroll app, deployed under `/portal/payroll` |
| `apps/studio-tools` | React architecture workspace app, deployed under `/portal/studio` |
| `packages/payroll-core` | Shared salary calculation engine |
| `database/supabase-payroll-schema.sql` | Supabase payroll tables, trigger, and RLS policies |

## Build Flow

1. `npm run build:site` copies the static site into `public/` and writes `public/portal-config.json`.
2. `npm --workspace @urbanmistrii/payroll-app run build` writes the payroll app into `public/portal/payroll/`.
3. `npm --workspace @urbanmistrii/studio-tools run build` writes the architecture tools app into `public/portal/studio/`.
4. Vercel serves the generated `public/` output.

## Payroll Placement

The existing portal remains available at `/portal`. The full payroll app sits one level deeper at `/portal/payroll`, inherits the existing noindex/no-store Vercel headers, and reads the same runtime `portal-config.json` for Supabase public auth settings.

The architecture tools app sits at `/portal/studio` and gives employees project planning, kanban, Gantt export, drawing issue tracking, and site log tools from the same portal surface.
