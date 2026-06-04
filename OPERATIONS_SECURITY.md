# Urban Mistrii Website Security Baseline

## Current posture

- Public marketing site remains open and cacheable.
- Employee portal is feature-flagged and closed by default.
- Portal routes use `no-store` and `noindex` headers.
- Browser config is generated at build time from environment variables.
- Employee workflows are wired for company-domain email gating.

## Required before employee launch

1. Create Supabase project and add `SUPABASE_URL` plus `SUPABASE_ANON_KEY` in Vercel.
2. Set `PORTAL_ENABLED=true`.
3. Keep `PORTAL_ALLOWED_EMAIL_DOMAINS=urbanmistrii.com`.
4. Run `database/supabase-portal-schema.sql`.
5. Enable Supabase email auth and set redirect URL to `https://urbanmistrii.com/portal`.
6. Re-auth Google Apps Script with `clasp login` so legacy automations can be migrated safely.

## Next reliability upgrades

1. Add an edge/API layer for server-side workflow validation instead of direct browser-to-table writes.
2. Add audit trails for approval actions and salary updates.
3. Add backup exports for leave, payroll, onboarding, and offboarding records.
4. Add admin-only operational dashboards and release logs.
5. Add staged preview checks before production portal releases.
