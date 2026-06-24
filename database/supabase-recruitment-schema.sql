-- ==============================================================
-- Urban Mistrii Recruitment Platform — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ==============================================================

-- Application ID sequence
create sequence if not exists application_id_seq start 1 increment 1;

-- Function to generate sequential UM-XXXX
create or replace function generate_application_id()
returns text
language plpgsql
as $$
declare
  next_val integer;
begin
  select nextval('application_id_seq') into next_val;
  return 'UM-' || lpad(next_val::text, 4, '0');
end;
$$;

-- Candidates table
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  application_id text unique not null default generate_application_id(),
  full_name text not null,
  email text not null,
  phone text,
  city text,
  position text not null,
  experience text,
  current_employer text,
  portfolio_url text,
  linkedin_url text,
  resume_url text,
  available_from date,
  expected_salary text,
  notice_period text,
  relocation_status text,
  cover_letter text,
  status text not null default 'Applied',
  public_status text not null default 'Applied',
  public_status_message text default 'Your application has been received and is being reviewed by our team.',
  internal_notes text,
  application_date timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived boolean not null default false,
  archived_at timestamptz,
  hired_at timestamptz
);

-- Indexes
create index if not exists candidates_application_id_idx on candidates (application_id);
create index if not exists candidates_email_idx on candidates (email);
create index if not exists candidates_status_idx on candidates (status);
create index if not exists candidates_position_idx on candidates (position);
create index if not exists candidates_archived_idx on candidates (archived);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists candidates_updated_at_trigger on candidates;
create trigger candidates_updated_at_trigger
  before update on candidates
  for each row
  execute function update_updated_at();

-- Row Level Security
alter table candidates enable row level security;

-- Anyone can insert (public form submission)
create policy "Anyone can apply"
  on candidates for insert
  with check (true);

-- Authenticated recruiters have full access
create policy "Recruiters read all"
  on candidates for select
  to authenticated
  using (true);

create policy "Recruiters update all"
  on candidates for update
  to authenticated
  using (true)
  with check (true);

-- Email templates table
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text unique not null,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;

create policy "Recruiters read templates"
  on email_templates for select
  to authenticated
  using (true);

create policy "Recruiters update templates"
  on email_templates for update
  to authenticated
  using (true)
  with check (true);

-- Default email templates
insert into email_templates (template_key, subject, body) values
  ('application_received', 'Application Received — Urban Mistrii',
   'Dear {{name}},\n\nThank you for applying to Urban Mistrii Studio.\n\nYour Application ID is: {{application_id}}\n\nYou can track your application status at any time:\nhttps://urbanmistrii.com/status\n\nWe will review your application and get back to you soon.\n\nBest regards,\nHR Team\nUrban Mistrii Studio'),
  ('assignment_sent', 'Design Assignment — Urban Mistrii',
   'Dear {{name}},\n\nWe have reviewed your application and would like to proceed with the next step.\n\nPlease find your design assignment attached. Kindly complete and submit it by {{due_date}}.\n\nBest regards,\nHR Team\nUrban Mistrii Studio'),
  ('interview_scheduled', 'Interview Scheduled — Urban Mistrii',
   'Dear {{name}},\n\nWe are pleased to inform you that your interview has been scheduled.\n\nDate: {{interview_date}}\nMode: {{interview_mode}}\n\nPlease confirm your availability.\n\nBest regards,\nHR Team\nUrban Mistrii Studio'),
  ('offer_extended', 'Offer Letter — Urban Mistrii',
   'Dear {{name}},\n\nWe are delighted to extend an offer to join Urban Mistrii Studio as {{position}}.\n\nPlease find the offer letter attached. Kindly respond within {{offer_validity}} days.\n\nWe look forward to having you on the team.\n\nBest regards,\nHR Team\nUrban Mistrii Studio'),
  ('rejected', 'Application Update — Urban Mistrii',
   'Dear {{name}},\n\nThank you for your interest in joining Urban Mistrii Studio.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate the time and effort you invested in the process and wish you the very best in your career.\n\nBest regards,\nHR Team\nUrban Mistrii Studio'),
  ('talent_pool', 'Talent Pool — Urban Mistrii',
   'Dear {{name}},\n\nThank you for your interest in Urban Mistrii Studio.\n\nWhile we do not have an immediate opening matching your profile, we have added your application to our talent pool and will reach out when a suitable opportunity arises.\n\nBest regards,\nHR Team\nUrban Mistrii Studio'),
  ('welcome_onboard', 'Welcome to Urban Mistrii!',
   'Dear {{name}},\n\nWelcome to Urban Mistrii Studio!\n\nWe are excited to have you join us as {{position}}. Your journey with us begins on {{start_date}}.\n\nPlease complete the attached onboarding documents before your first day.\n\nBest regards,\nHR Team\nUrban Mistrii Studio')
on conflict (template_key) do nothing;

-- Storage: resumes bucket
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', true)
on conflict (id) do nothing;

create policy "Anyone can upload resumes"
  on storage.objects for insert
  with check (bucket_id = 'resumes');

create policy "Anyone can read resumes"
  on storage.objects for select
  using (bucket_id = 'resumes');
