# Urban Mistrii Recruitment Platform

## New Environment Variables

Add these in your Vercel project dashboard:

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin read/write access to Supabase (recruitment, admin, holidays) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Optional | Primary resume+data backup to Google Drive + Sheets |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Optional | Service account email for Google APIs |
| `GOOGLE_SHEET_ID` | Optional | Google Sheet ID for candidate backup |
| `GOOGLE_DRIVE_FOLDER_ID` | Optional | Google Drive folder ID for resume backup |
| `RESEND_API_KEY` | Optional | Transactional email via Resend |

## Setup Steps

### 1. Run SQL Migrations (in order)

Open Supabase SQL Editor and run:

1. `database/supabase-recruitment-schema.sql` — candidates table, email templates, RLS, storage
2. `database/supabase-recruitment-v2.sql` — holidays, day_overrides, company_settings, relaxed RLS for any email domain

### 2. Enable Storage

In Supabase Storage: create a `resumes` bucket (public) — the schema already sets this up.

### 3. Google Integration (Optional)

1. Create a Google Cloud Project
2. Enable Sheets API + Drive API
3. Create a service account, download JSON key
4. Share your target Google Sheet with the service account email (Editor)
5. Share your target Drive folder with the service account email (Writer)
6. Set env vars: `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID`, `GOOGLE_DRIVE_FOLDER_ID`

### 4. Supabase Auth

Enable Email/Password and Google OAuth providers in Supabase Auth settings.
For Google OAuth, configure the Client ID and Secret in Supabase (not the app itself).

### 5. Deploy

Push to trigger Vercel build, or run `npm run build` locally.

## Architecture

### Candidate Flow (Reliability-First)

```
Candidate Submits
  │
  ├── Google Sheets (primary) — row appended immediately
  ├── Google Drive (primary) — resume uploaded immediately
  ├── Application ID generated from Sheets counter
  ├── Response sent to candidate
  └── Supabase (async) — synced in background; failures logged
```

If Google is unavailable → falls back to timestamp-based App ID.
If Supabase is unavailable → submission still saved to Google Sheets.

### Employee Portal Auth

- All email domains are welcome (no `@urbanmistrii.com` restriction)
- Google OAuth and Email/Password both work
- RLS policies updated to use role-based access instead of domain check

### Open Status Page

`/open` — public, no login required.
Calculates status from: day of week → Saturday schedule → holidays → manual overrides.

Saturday schedule: 1st=Open, 2nd=Closed, 3rd=Open, 4th=Closed, 5th=Open

### Admin Routes

- `/admin` — Recruiter dashboard + candidate management (React SPA)
- `/admin/login` — Recruiter sign-in
- `/api/admin-recruitment` — Admin API (list, stats, update, actions, holidays, overrides)

## Audit Report

### Candidate Application Flow
- [x] Form submission via careers.html → POST /api/candidates
- [x] Google Sheets primary storage (if configured)
- [x] Google Drive resume upload (if configured)
- [x] Application ID generated immediately (Sheets counter or fallback)
- [x] Candidate receives ID instantly
- [x] Supabase syncs asynchronously
- [x] Application ID unique, sequential, never reused

### Resume Upload Flow
- [x] Direct form (no Fillout dependency)
- [x] Google Drive upload via service account
- [x] Fallback to timestamp-based ID generation

### Google Drive Storage
- [x] Service account JWT auth
- [x] Multipart upload with metadata
- [x] Returns file ID + web view link

### Google Sheets Backup
- [x] Append row with all fields
- [x] Counter cell for sequential IDs
- [x] Falls back gracefully if missing

### Supabase Synchronization
- [x] Async non-blocking sync
- [x] Fails gracefully (logs error)
- [x] Read path tries Supabase first, falls back to Sheets

### Recruiter Dashboard (/admin)
- [x] Supabase auth with email/password
- [x] Dashboard stats (attention, interviews, tests, offers)
- [x] Candidates table with filters (status, position, archived, search)
- [x] Candidate detail with full info + documents + notes
- [x] 7 recruiter actions (review → hire)
- [x] Email automation on actions (via Resend)
- [x] Email template editor

### Leave Requests
- [x] Submission form in portal
- [x] Status workflow (pending → approved/rejected)
- [x] HR approval queue
- [x] Connected to Supabase (`leave_requests` table)
- [x] RLS: self or HR read

### Resignation Workflow
- [x] Offboarding form in portal
- [x] Exit type selection (Resignation/Contract end/Termination)
- [x] Connected to Supabase (`offboarding_cases` table)
- [x] HR can manage status

### Public Open Status Page (/open)
- [x] No login required
- [x] Calculates from day of week + Saturday schedule + holidays + overrides
- [x] Displays Open/Closed, hours, reason
- [x] Mobile-friendly
- [x] Holiday management in admin

### Remaining Issues
- Email delivery requires RESEND_API_KEY env var (not yet configured)
- Google Sheets/Drive integration requires service account setup
- Supabase service role key needs to be added to Vercel env vars
- Saturday schedule is hardcoded in the API (not configurable via DB)
- Leave balance tracking is not yet implemented (leave_requests stores individual requests but no balance aggregation)
- Attendance tracking is via monthly inputs (attendance_inputs) not daily check-in
- No automated reminders for pending approvals

### Recommended Improvements
1. Deploy and test end-to-end before announcing to team
2. Set up Resend for email delivery (free tier handles 100 emails/day)
3. Add leave balance calculation from leave_requests history
4. Add daily attendance check-in via a simple form
5. Add a sync failure log viewable in the admin dashboard
6. Make Saturday schedule configurable in company_settings
