# Urban Mistrii HR Portal Migration

## Current Local Sources

| Area | Apps Script files | Website destination |
| --- | --- | --- |
| Leave | `Leave.gs` | Employee leave form, HR approval queue, payroll leave summary |
| Payroll | `Payroll.gs`, `Log.gs` | Monthly attendance inputs, expense claims, salary calculation report |
| Onboarding | `Onboarding.gs`, `Templates.gs` | Candidate-to-employee task checklist, document collection, welcome emails |
| Offboarding | `Offboarding.gs`, `Templates.gs` | Exit checklist, survey, experience letter request, asset recovery |
| Hiring | `oracle-v21/Core.gs`, `Email.gs`, `Portal.gs` | Candidate portal, status tracking, test submissions, recruiter dashboard |
| Messaging | `WhatsApp.gs`, `Calendar.gs`, `AI.gs` | Server-side notifications, interview invites, smart email/WhatsApp drafts |
| Reliability | `RetryQueue.gs`, `Analytics.gs` | Job queue, retry logs, weekly ops report |

## First Secure Build

1. Add authenticated staff portal routes.
2. Restrict login to approved company/staff emails.
3. Store workflow records in a private database.
4. Keep automations server-side only.
5. Move secrets to Vercel environment variables.
6. Add audit logs for HR actions and payroll changes.

## Current Implementation

- `portal.html`, `portal.css`, and `portal.js` now support email-link authentication when Supabase credentials are present.
- `portal-config.json` exposes only public auth configuration to the browser.
- `database/supabase-portal-schema.sql` creates the first private tables and row-level security policies.
- Without Supabase credentials, the portal remains in draft mode and stores test entries in browser local storage.

## Recommended Data Tables

| Table | Purpose |
| --- | --- |
| `profiles` | Staff identity, department, role, active status |
| `leave_requests` | Leave dates, type, reason, approval status, approver |
| `attendance_inputs` | Monthly days worked, leave days, expense claims |
| `onboarding_cases` | New hire details, joining date, task status |
| `offboarding_cases` | Exit details, asset checklist, letter/survey status |
| `candidate_cases` | Hiring pipeline records from the oracle scripts |
| `automation_logs` | Email, WhatsApp, calendar, payroll, and retry history |

## Security Rules

- Employees can only read and submit their own records.
- HR can read and update staff workflow records.
- Admin can read payroll reports and automation logs.
- Public website visitors cannot reach private data.
- No HR/salary data should be stored in frontend-only JavaScript.
- Every sensitive write should be timestamped with actor, action, and before/after status.

## Implementation Notes

- `portal.html` is a frontend shell only. It is intentionally not linked from public navigation.
- The current portal stores draft records in browser local storage for layout testing.
- Before using real staff data, replace local storage with a server-side API and database.
- Apps Script auth must be refreshed with `npx -y @google/clasp login` before live script push/pull.
