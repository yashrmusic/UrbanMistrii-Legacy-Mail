-- ==============================================================
-- Urban Mistrii Recruitment v3 — Audit, Reliability, Rate Limiting
-- Run after v1 (supabase-recruitment-schema.sql) and v2 (supabase-recruitment-v2.sql)
-- ==============================================================

-- Failed syncs table for async reliability
create table if not exists public.failed_syncs (
  id uuid primary key default gen_random_uuid(),
  target text not null check (target in ('google_sheets', 'google_drive', 'email')),
  payload jsonb not null,
  error_message text,
  attempt_count int not null default 0,
  max_attempts int not null default 3,
  status text not null default 'pending' check (status in ('pending', 'retrying', 'failed', 'resolved')),
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  resolved_at timestamptz
);

alter table public.failed_syncs enable row level security;

create policy "Recruiters can read failed syncs"
  on public.failed_syncs for select
  to authenticated
  using (true);

create policy "Recruiters can update failed syncs"
  on public.failed_syncs for update
  to authenticated
  using (true)
  with check (true);

-- Recruiter audit log
create table if not exists public.recruitment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete set null,
  application_id text,
  action text not null,
  field text,
  old_value text,
  new_value text,
  performed_by text not null,
  performed_by_email text,
  ip_address text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.recruitment_audit_logs enable row level security;

create policy "Recruiters can read audit logs"
  on public.recruitment_audit_logs for select
  to authenticated
  using (true);

create policy "System can insert audit logs"
  on public.recruitment_audit_logs for insert
  with check (true);

create index if not exists audit_logs_candidate_idx on public.recruitment_audit_logs (candidate_id);
create index if not exists audit_logs_action_idx on public.recruitment_audit_logs (action);
create index if not exists audit_logs_created_idx on public.recruitment_audit_logs (created_at desc);

-- Email delivery log
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete set null,
  application_id text,
  recipient text not null,
  subject text not null,
  body_preview text,
  template_key text,
  recruiter_email text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  provider text default 'resend',
  provider_message_id text,
  error_message text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz
);

alter table public.email_logs enable row level security;

create policy "Recruiters can read email logs"
  on public.email_logs for select
  to authenticated
  using (true);

create policy "System can insert email logs"
  on public.email_logs for insert
  with check (true);

create index if not exists email_logs_candidate_idx on public.email_logs (candidate_id);
create index if not exists email_logs_recipient_idx on public.email_logs (recipient);

-- Rate limiting for status endpoint
create table if not exists public.status_queries (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  identifier text,
  query_type text not null check (query_type in ('application_id', 'email')),
  created_at timestamptz not null default now()
);

alter table public.status_queries enable row level security;

create policy "System can insert status queries"
  on public.status_queries for insert
  with check (true);

create policy "System can read status queries"
  on public.status_queries for select
  to authenticated
  using (true);

create index if not exists status_queries_ip_idx on public.status_queries (ip_address, created_at desc);

-- Add resume_url to candidates if not present (safe re-run)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'candidates' and column_name = 'resume_url'
  ) then
    alter table public.candidates add column resume_url text;
  end if;
end $$;

-- Drop overly permissive policies and replace with restricted ones
drop policy if exists "Anyone can upload resumes" on storage.objects;
drop policy if exists "Anyone can read resumes" on storage.objects;

create policy "Restricted resume uploads"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and length(name) < 255
    and (
      name ~* '\.(pdf|doc|docx)$'
    )
  );

create policy "Anyone can read resumes"
  on storage.objects for select
  using (bucket_id = 'resumes');

-- Helper: log audit entry
create or replace function public.log_recruitment_audit(
  p_candidate_id uuid,
  p_application_id text,
  p_action text,
  p_field text default null,
  p_old_value text default null,
  p_new_value text default null,
  p_performed_by text default null,
  p_performed_by_email text default null,
  p_ip_address text default null,
  p_metadata jsonb default null
) returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.recruitment_audit_logs (
    candidate_id, application_id, action, field, old_value, new_value,
    performed_by, performed_by_email, ip_address, metadata
  ) values (
    p_candidate_id, p_application_id, p_action, p_field, p_old_value, p_new_value,
    p_performed_by, p_performed_by_email, p_ip_address, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Helper: log email send
create or replace function public.log_email_send(
  p_candidate_id uuid,
  p_application_id text,
  p_recipient text,
  p_subject text,
  p_body_preview text default null,
  p_template_key text default null,
  p_recruiter_email text default null,
  p_status text default 'sent'
) returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.email_logs (
    candidate_id, application_id, recipient, subject, body_preview,
    template_key, recruiter_email, status
  ) values (
    p_candidate_id, p_application_id, p_recipient, p_subject, p_body_preview,
    p_template_key, p_recruiter_email, p_status
  )
  returning id into v_id;

  return v_id;
end;
$$;
