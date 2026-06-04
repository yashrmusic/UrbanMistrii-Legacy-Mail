-- Import source:
-- https://docs.google.com/spreadsheets/d/1u0kK0FMAOMw4XpTqGSAxtfF2FXK04JZZaEOYmfmr6EE/edit?gid=0#gid=0
-- Email/source submission enrichment:
-- https://docs.google.com/spreadsheets/d/1770d3yp5QyYr8qZFdEG1BlQAO03m0WdadXWJjPjIMNw/edit?gid=436151096#gid=436151096
--
-- Run database/supabase-payroll-schema.sql first. The live project currently
-- does not expose public.employees, so this file assumes the payroll schema
-- has already been created in Supabase.
--
-- Source-sheet notes:
-- - Tanveer Saifi appears in the leave/conveyance form, but not in the May
--   payroll report, so no salary/status/position row is seeded here.
-- - Mohd Shadman appears in the May payroll report, but not in the supplied
--   form-response sheet, so a company-domain placeholder email is retained.

begin;

with employee_seed (name, email, position, base_salary, status, leave_allowance, is_active) as (
  values
    ('Yash Mahour', 'um.yashmahour@gmail.com', 'Ops', 15000.00, 'Permanent', 2.00, true),
    ('Vanshika Khemani', 'vanshika@urbanmistrii.com', 'Junior Architect', 30000.00, 'Permanent', 2.00, true),
    ('Devam Bindal', 'bindaldevam05@gmail.com', 'Architectural Intern', 24000.00, 'Permanent', 2.00, true),
    ('Navdha Kapila', 'navdha@urbanmistrii.com', 'Senior Architect', 42500.00, 'Permanent', 2.00, true),
    ('Vaishnavi Sinha', 'vaishnaviv.sinha@gmail.com', 'Architectural Intern', 10000.00, 'Permanent', 2.00, true),
    ('Alankrit Malyan', 'um.alankrit@gmail.com', 'Senior Architect', 45000.00, 'Permanent', 2.00, true),
    ('Mohit Verma', 'mohitverma0908@gmail.com', 'Junior Architect', 27000.00, 'Probation', 0.00, true),
    ('Vanshika Sharma', 'um.vanshika@gmail.com', 'Junior Architect', 30000.00, 'Probation', 0.00, true),
    ('Rithik Choudhary', 'rithikchoudhary2013@gmail.com', 'Interior Design Intern', 10000.00, 'Probation', 0.00, true),
    ('Mohd Shadman', 'mohd.shadman@urbanmistrii.com', 'Interior Design Intern', 10000.00, 'Probation', 0.00, true),
    ('Wasif Hashmi', 'wsfhashmi.um@gmail.com', 'Accountant', 25000.00, 'Probation', 0.00, true)
)
insert into public.employees (
  name,
  email,
  position,
  base_salary,
  status,
  leave_allowance,
  is_active
)
select
  name,
  email,
  position,
  base_salary,
  status,
  leave_allowance,
  is_active
from employee_seed
on conflict (email) do update
set
  name = excluded.name,
  position = excluded.position,
  base_salary = excluded.base_salary,
  status = excluded.status,
  leave_allowance = excluded.leave_allowance,
  is_active = excluded.is_active,
  updated_at = now();

with payroll_run as (
  insert into public.payroll_runs (month, year, status)
  values (5, 2026, 'draft')
  on conflict (month, year) do update
  set status = excluded.status,
      updated_at = now()
  returning id
),
entry_seed (
  email,
  previous_leave_balance,
  current_month_leaves,
  sandwich_leaves,
  adjustment,
  per_day_rate,
  chargeable_leaves,
  deduction,
  final_salary,
  notes
) as (
  values
    ('um.yashmahour@gmail.com', 3.00, 0.00, 0.00, 0.00, 500.00, 0.00, 0.00, 15000.00, 'Within policy. Email matched from leave/conveyance form.'),
    ('vanshika@urbanmistrii.com', 4.00, 1.00, 0.00, 0.00, 1000.00, 0.00, 0.00, 30000.00, 'Within policy. May leave: 22/05/2026. Reason: Planned Personal Leave.'),
    ('bindaldevam05@gmail.com', 1.00, 3.00, 0.00, 0.00, 800.00, 0.00, 0.00, 24000.00, 'Within policy. May leaves: 04-05-26, 05-05-26, 19-05-26. Reason: Planned Personal Leave.'),
    ('navdha@urbanmistrii.com', 1.00, 0.00, 0.00, 0.00, 1416.67, 0.00, 0.00, 42500.00, 'Within policy. May form submission shows 0 leaves.'),
    ('vaishnaviv.sinha@gmail.com', 3.00, 3.00, 0.00, 0.00, 333.33, 0.00, 0.00, 10000.00, 'Within policy. May leaves: 04-05-2026, 11-05-2026, 18-05-2026. Reason: Sick Leave.'),
    ('um.alankrit@gmail.com', 7.50, 5.00, 1.00, 0.00, 1500.00, 0.00, 0.00, 45000.00, 'Sandwich Warning: 18 Apr (Sat) & 19 Apr (Sun). May leaves: 07-05-2026, 08-05-2026, 11-05-2026, 12-05-2026, 13-05-2026. Reason: Planned Personal Leave.'),
    ('mohitverma0908@gmail.com', 1.00, 0.00, 0.00, 0.00, 900.00, 0.00, 0.00, 27000.00, 'Probation: 0 leaves chargeable for the month'),
    ('um.vanshika@gmail.com', 1.00, 2.00, 0.00, 0.00, 1000.00, 2.00, 2000.00, 28000.00, 'Probation: 2 leaves chargeable for the month. May leaves: 15-05-2026 half day, 18-05-2026 sick leave. Reason: Sick leave, personal reason.'),
    ('rithikchoudhary2013@gmail.com', 2.00, 4.00, 0.00, 0.00, 333.33, 4.00, 1333.33, 8666.67, 'Probation: 4 leaves chargeable for the month. May leaves: 13-05-26, 19-05-26, 29-05-26, 30-05-26. Reason: birthday leave, sick leave with work from home, exam leave.'),
    ('mohd.shadman@urbanmistrii.com', 0.00, 0.00, 0.00, 0.00, 333.33, 0.00, 0.00, 10000.00, 'Probation: 0 leaves chargeable for the month'),
    ('wsfhashmi.um@gmail.com', 0.00, 0.00, 0.00, 0.00, 833.33, 0.00, 0.00, 25000.00, 'Probation: 0 leaves chargeable for the month. May form submission shows 0 leaves.')
)
insert into public.payroll_entries (
  run_id,
  employee_id,
  previous_leave_balance,
  current_month_leaves,
  sandwich_leaves,
  adjustment,
  per_day_rate,
  chargeable_leaves,
  deduction,
  final_salary,
  notes
)
select
  payroll_run.id,
  employees.id,
  entry_seed.previous_leave_balance,
  entry_seed.current_month_leaves,
  entry_seed.sandwich_leaves,
  entry_seed.adjustment,
  entry_seed.per_day_rate,
  entry_seed.chargeable_leaves,
  entry_seed.deduction,
  entry_seed.final_salary,
  entry_seed.notes
from entry_seed
join public.employees on employees.email = entry_seed.email
cross join payroll_run
on conflict (run_id, employee_id) do update
set
  previous_leave_balance = excluded.previous_leave_balance,
  current_month_leaves = excluded.current_month_leaves,
  sandwich_leaves = excluded.sandwich_leaves,
  adjustment = excluded.adjustment,
  per_day_rate = excluded.per_day_rate,
  chargeable_leaves = excluded.chargeable_leaves,
  deduction = excluded.deduction,
  final_salary = excluded.final_salary,
  notes = excluded.notes,
  updated_at = now();

commit;
