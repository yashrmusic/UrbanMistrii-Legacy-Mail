create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'pending' check (role in ('admin', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  position text not null,
  base_salary numeric(12, 2) not null default 0 check (base_salary >= 0),
  status text not null default 'Permanent' check (status in ('Permanent', 'Probation')),
  leave_allowance numeric(6, 2) not null default 0 check (leave_allowance >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2020 and 2100),
  status text not null default 'draft' check (status in ('draft', 'locked')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, year)
);

create table if not exists public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  previous_leave_balance numeric(6, 2) not null default 0,
  current_month_leaves numeric(6, 2) not null default 0,
  sandwich_leaves numeric(6, 2) not null default 0,
  adjustment numeric(12, 2) not null default 0,
  per_day_rate numeric(12, 2) not null default 0,
  chargeable_leaves numeric(6, 2) not null default 0,
  deduction numeric(12, 2) not null default 0,
  final_salary numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists payroll_runs_set_updated_at on public.payroll_runs;
create trigger payroll_runs_set_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();

drop trigger if exists payroll_entries_set_updated_at on public.payroll_entries;
create trigger payroll_entries_set_updated_at
  before update on public.payroll_entries
  for each row execute function public.set_updated_at();

drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

create or replace function public.current_payroll_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()),
    'pending'
  );
$$;

create or replace function public.is_payroll_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_payroll_role() = 'admin';
$$;

create or replace function public.handle_new_payroll_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
begin
  select case when exists (select 1 from public.user_roles) then 'pending' else 'admin' end
  into assigned_role;

  insert into public.user_roles (user_id, email, role)
  values (new.id, lower(new.email), assigned_role)
  on conflict (user_id) do update
    set email = lower(excluded.email),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_payroll_role on auth.users;
create trigger on_auth_user_created_payroll_role
  after insert or update of email on auth.users
  for each row execute function public.handle_new_payroll_user();

alter table public.user_roles enable row level security;
alter table public.employees enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_entries enable row level security;

drop policy if exists "user roles own or admin read" on public.user_roles;
create policy "user roles own or admin read" on public.user_roles
  for select using (user_id = auth.uid() or public.is_payroll_admin());

drop policy if exists "user roles admin update" on public.user_roles;
create policy "user roles admin update" on public.user_roles
  for update using (public.is_payroll_admin()) with check (public.is_payroll_admin());

drop policy if exists "employees admin all" on public.employees;
create policy "employees admin all" on public.employees
  for all using (public.is_payroll_admin()) with check (public.is_payroll_admin());

drop policy if exists "payroll runs admin all" on public.payroll_runs;
create policy "payroll runs admin all" on public.payroll_runs
  for all using (public.is_payroll_admin()) with check (public.is_payroll_admin());

drop policy if exists "payroll entries admin all" on public.payroll_entries;
create policy "payroll entries admin all" on public.payroll_entries
  for all using (public.is_payroll_admin()) with check (public.is_payroll_admin());
