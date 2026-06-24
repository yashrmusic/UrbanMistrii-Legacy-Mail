-- ==============================================================
-- Urban Mistrii Recruitment v2 — Holidays, Auth Relaxation, Settings
-- Run this in your Supabase SQL Editor AFTER supabase-recruitment-schema.sql
-- ==============================================================

-- Company Settings
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.company_settings (key, value) values
  ('working_hours_start', '09:30'),
  ('working_hours_end', '18:30'),
  ('timezone', 'Asia/Kolkata'),
  ('company_name', 'Urban Mistrii Studio')
on conflict (key) do nothing;

alter table public.company_settings enable row level security;

create policy "Anyone can read company settings"
  on public.company_settings for select
  using (true);

create policy "Admin can update company settings"
  on public.company_settings for update
  to authenticated
  using (true)
  with check (true);

create policy "Admin can insert company settings"
  on public.company_settings for insert
  to authenticated
  with check (true);

-- Holidays table
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  type text not null default 'public_holiday',
  created_at timestamptz not null default now(),
  created_by text
);

alter table public.holidays enable row level security;

create policy "Anyone can read holidays"
  on public.holidays for select
  using (true);

create policy "Authenticated users can manage holidays"
  on public.holidays for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update holidays"
  on public.holidays for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete holidays"
  on public.holidays for delete
  to authenticated
  using (true);

-- Manual overrides (emergency closure, events, etc.)
create table if not exists public.day_overrides (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  status text not null check (status in ('closed', 'open', 'half_day')),
  reason text,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.day_overrides enable row level security;

create policy "Anyone can read day overrides"
  on public.day_overrides for select
  using (true);

create policy "Authenticated users can manage day overrides"
  on public.day_overrides for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update day overrides"
  on public.day_overrides for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete day overrides"
  on public.day_overrides for delete
  to authenticated
  using (true);

-- ==============================================================
-- AUTH RELAXATION: Allow any email domain
-- ==============================================================

-- Update profiles trigger to accept any email
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  user_email text;
  assigned_role text;
begin
  user_email := new.email;

  -- Determine role based on email pattern
  if user_email like 'mail@%' or user_email like 'admin@%' then
    assigned_role := 'admin';
  elsif user_email like 'hr@%' then
    assigned_role := 'hr';
  else
    assigned_role := 'employee';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, user_email, new.raw_user_meta_data ->> 'full_name', assigned_role)
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = assigned_role;

  return new;
end;
$$;

-- Drop old domain-restricted policies on portal tables
-- and recreate without domain checks

-- Profiles: allow any authenticated user to manage their own
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles hr update" on public.profiles;

create policy "profiles self read"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles hr read"
  on public.profiles for select
  to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')
  ));

create policy "profiles self insert"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles hr update"
  on public.profiles for update
  to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')
  ))
  with check (true);

-- Leave requests: allow any email, not just company
drop policy if exists "leave self or hr read" on public.leave_requests;
drop policy if exists "leave self insert" on public.leave_requests;
drop policy if exists "leave hr insert" on public.leave_requests;
drop policy if exists "leave hr update" on public.leave_requests;

create policy "leave self or hr read"
  on public.leave_requests for select
  to authenticated
  using (
    employee_email = auth.jwt() ->> 'email'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr'))
  );

create policy "leave self insert"
  on public.leave_requests for insert
  to authenticated
  with check (employee_email = auth.jwt() ->> 'email');

create policy "leave hr insert"
  on public.leave_requests for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')));

create policy "leave hr update"
  on public.leave_requests for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')))
  with check (true);

-- Same for attendance_inputs
drop policy if exists "attendance self or hr read" on public.attendance_inputs;
drop policy if exists "attendance self insert" on public.attendance_inputs;
drop policy if exists "attendance hr insert" on public.attendance_inputs;
drop policy if exists "attendance hr update" on public.attendance_inputs;

create policy "attendance self or hr read"
  on public.attendance_inputs for select
  to authenticated
  using (
    employee_email = auth.jwt() ->> 'email'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr'))
  );

create policy "attendance self insert"
  on public.attendance_inputs for insert
  to authenticated
  with check (employee_email = auth.jwt() ->> 'email');

create policy "attendance hr insert"
  on public.attendance_inputs for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')));

create policy "attendance hr update"
  on public.attendance_inputs for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')))
  with check (true);

-- Same for onboarding_cases
drop policy if exists "onboarding self or hr read" on public.onboarding_cases;
drop policy if exists "onboarding self insert" on public.onboarding_cases;
drop policy if exists "onboarding hr insert" on public.onboarding_cases;
drop policy if exists "onboarding hr update" on public.onboarding_cases;

create policy "onboarding self or hr read"
  on public.onboarding_cases for select
  to authenticated
  using (
    employee_email = auth.jwt() ->> 'email'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr'))
  );

create policy "onboarding self insert"
  on public.onboarding_cases for insert
  to authenticated
  with check (employee_email = auth.jwt() ->> 'email');

create policy "onboarding hr insert"
  on public.onboarding_cases for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')));

create policy "onboarding hr update"
  on public.onboarding_cases for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')))
  with check (true);

-- Same for offboarding_cases
drop policy if exists "offboarding self or hr read" on public.offboarding_cases;
drop policy if exists "offboarding self insert" on public.offboarding_cases;
drop policy if exists "offboarding hr insert" on public.offboarding_cases;
drop policy if exists "offboarding hr update" on public.offboarding_cases;

create policy "offboarding self or hr read"
  on public.offboarding_cases for select
  to authenticated
  using (
    employee_email = auth.jwt() ->> 'email'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr'))
  );

create policy "offboarding self insert"
  on public.offboarding_cases for insert
  to authenticated
  with check (employee_email = auth.jwt() ->> 'email');

create policy "offboarding hr insert"
  on public.offboarding_cases for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')));

create policy "offboarding hr update"
  on public.offboarding_cases for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hr')))
  with check (true);

-- Drop old helper functions that enforce domain restriction
-- (keeping is_company_user/is_company_email for backwards compatibility but not using them in policies)
