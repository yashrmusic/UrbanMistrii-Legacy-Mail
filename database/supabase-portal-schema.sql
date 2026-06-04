create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'employee' check (role in ('employee', 'hr', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_name text not null,
  employee_email text not null,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_inputs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_name text not null,
  employee_email text not null,
  month text not null,
  working_days numeric default 0,
  leave_days numeric default 0,
  expense_claim numeric default 0,
  notes text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'locked')),
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_name text not null,
  employee_email text not null,
  role_title text,
  joining_date date,
  manager text,
  notes text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'complete', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.offboarding_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_name text not null,
  employee_email text not null,
  last_day date,
  exit_type text,
  notes text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'complete', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  workflow text not null,
  action text not null,
  target_email text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and is_active = true),
    case
      when lower(auth.jwt() ->> 'email') = 'mail@urbanmistrii.com' then 'admin'
      when lower(auth.jwt() ->> 'email') = 'hr@urbanmistrii.com' then 'hr'
      when lower(auth.jwt() ->> 'email') like '%@urbanmistrii.com' then 'employee'
      else null
    end
  );
$$;

create or replace function public.is_company_email(email text)
returns boolean
language sql
stable
as $$
  select lower(coalesce(email, '')) like '%@urbanmistrii.com';
$$;

create or replace function public.is_company_user()
returns boolean
language sql
stable
as $$
  select public.is_company_email(auth.jwt() ->> 'email');
$$;

create or replace function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('hr', 'admin');
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_email(new.email) then
    return new;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case
      when lower(new.email) = 'mail@urbanmistrii.com' then 'admin'
      when lower(new.email) = 'hr@urbanmistrii.com' then 'hr'
      else 'employee'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        role = case
          when excluded.email = 'mail@urbanmistrii.com' then 'admin'
          when excluded.email = 'hr@urbanmistrii.com' then 'hr'
          else public.profiles.role
        end,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;
alter table public.attendance_inputs enable row level security;
alter table public.onboarding_cases enable row level security;
alter table public.offboarding_cases enable row level security;
alter table public.automation_logs enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (public.is_company_user() and (id = auth.uid() or public.is_hr()));

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email') and public.is_company_email(email));

drop policy if exists "profiles hr update" on public.profiles;
create policy "profiles hr update" on public.profiles
  for update using (public.is_hr()) with check (public.is_hr());

drop policy if exists "leave self or hr read" on public.leave_requests;
create policy "leave self or hr read" on public.leave_requests
  for select using (public.is_company_user() and (owner_id = auth.uid() or lower(employee_email) = lower(auth.jwt() ->> 'email') or public.is_hr()));

drop policy if exists "leave self insert" on public.leave_requests;
create policy "leave self insert" on public.leave_requests
  for insert with check (owner_id = auth.uid() and lower(employee_email) = lower(auth.jwt() ->> 'email') and public.is_company_email(employee_email));

drop policy if exists "leave hr insert" on public.leave_requests;
create policy "leave hr insert" on public.leave_requests
  for insert with check (public.is_hr() and public.is_company_email(employee_email));

drop policy if exists "leave hr update" on public.leave_requests;
create policy "leave hr update" on public.leave_requests
  for update using (public.is_hr()) with check (public.is_hr());

drop policy if exists "attendance self or hr read" on public.attendance_inputs;
create policy "attendance self or hr read" on public.attendance_inputs
  for select using (public.is_company_user() and (owner_id = auth.uid() or lower(employee_email) = lower(auth.jwt() ->> 'email') or public.is_hr()));

drop policy if exists "attendance self insert" on public.attendance_inputs;
create policy "attendance self insert" on public.attendance_inputs
  for insert with check (owner_id = auth.uid() and lower(employee_email) = lower(auth.jwt() ->> 'email') and public.is_company_email(employee_email));

drop policy if exists "attendance hr insert" on public.attendance_inputs;
create policy "attendance hr insert" on public.attendance_inputs
  for insert with check (public.is_hr() and public.is_company_email(employee_email));

drop policy if exists "attendance hr update" on public.attendance_inputs;
create policy "attendance hr update" on public.attendance_inputs
  for update using (public.is_hr()) with check (public.is_hr());

drop policy if exists "onboarding self or hr read" on public.onboarding_cases;
create policy "onboarding self or hr read" on public.onboarding_cases
  for select using (public.is_company_user() and (owner_id = auth.uid() or lower(employee_email) = lower(auth.jwt() ->> 'email') or public.is_hr()));

drop policy if exists "onboarding self insert" on public.onboarding_cases;
create policy "onboarding self insert" on public.onboarding_cases
  for insert with check (owner_id = auth.uid() and lower(employee_email) = lower(auth.jwt() ->> 'email') and public.is_company_email(employee_email));

drop policy if exists "onboarding hr insert" on public.onboarding_cases;
create policy "onboarding hr insert" on public.onboarding_cases
  for insert with check (public.is_hr() and public.is_company_email(employee_email));

drop policy if exists "onboarding hr update" on public.onboarding_cases;
create policy "onboarding hr update" on public.onboarding_cases
  for update using (public.is_hr()) with check (public.is_hr());

drop policy if exists "offboarding self or hr read" on public.offboarding_cases;
create policy "offboarding self or hr read" on public.offboarding_cases
  for select using (public.is_company_user() and (owner_id = auth.uid() or lower(employee_email) = lower(auth.jwt() ->> 'email') or public.is_hr()));

drop policy if exists "offboarding self insert" on public.offboarding_cases;
create policy "offboarding self insert" on public.offboarding_cases
  for insert with check (owner_id = auth.uid() and lower(employee_email) = lower(auth.jwt() ->> 'email') and public.is_company_email(employee_email));

drop policy if exists "offboarding hr insert" on public.offboarding_cases;
create policy "offboarding hr insert" on public.offboarding_cases
  for insert with check (public.is_hr() and public.is_company_email(employee_email));

drop policy if exists "offboarding hr update" on public.offboarding_cases;
create policy "offboarding hr update" on public.offboarding_cases
  for update using (public.is_hr()) with check (public.is_hr());

drop policy if exists "logs hr read" on public.automation_logs;
create policy "logs hr read" on public.automation_logs
  for select using (public.is_hr());

drop policy if exists "logs authenticated insert" on public.automation_logs;
create policy "logs authenticated insert" on public.automation_logs
  for insert with check (auth.uid() is not null and public.is_company_user());
