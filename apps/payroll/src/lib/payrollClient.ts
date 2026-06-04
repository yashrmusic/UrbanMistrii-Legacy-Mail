import { calcSalary } from "@urbanmistrii/payroll-core";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Employee, PayrollClient, PayrollEntry, PayrollRun, RoleName } from "../types";

type DbEmployee = {
  id: string;
  name: string;
  email: string;
  position: string;
  base_salary: number | string;
  status: "Permanent" | "Probation";
  leave_allowance: number | string;
  is_active: boolean;
  created_at?: string;
};

type DbRun = {
  id: string;
  month: number;
  year: number;
  status: "draft" | "locked";
  created_at?: string;
};

type DbEntry = {
  id: string;
  run_id: string;
  employee_id: string;
  employee?: DbEmployee | DbEmployee[];
  previous_leave_balance: number | string;
  current_month_leaves: number | string;
  sandwich_leaves: number | string;
  adjustment: number | string;
  per_day_rate: number | string;
  chargeable_leaves: number | string;
  deduction: number | string;
  final_salary: number | string;
  notes?: string | null;
};

type DemoState = {
  employees: Employee[];
  runs: PayrollRun[];
  entries: PayrollEntry[];
};

const demoKey = "um_payroll_app_state_v1";

const numberValue = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toEmployee = (employee: DbEmployee): Employee => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  position: employee.position,
  baseSalary: numberValue(employee.base_salary),
  status: employee.status,
  leaveAllowance: numberValue(employee.leave_allowance),
  isActive: employee.is_active,
  ...(employee.created_at ? { createdAt: employee.created_at } : {})
});

const toRun = (run: DbRun): PayrollRun => ({
  id: run.id,
  month: run.month,
  year: run.year,
  status: run.status,
  ...(run.created_at ? { createdAt: run.created_at } : {})
});

const getEntryEmployee = (entry: DbEntry) => {
  if (Array.isArray(entry.employee)) return entry.employee[0];
  return entry.employee;
};

const toEntry = (entry: DbEntry): PayrollEntry => {
  const employee = getEntryEmployee(entry);
  if (!employee) {
    throw new Error("Payroll entry is missing its employee record.");
  }

  return {
    id: entry.id,
    runId: entry.run_id,
    employeeId: entry.employee_id,
    employee: toEmployee(employee),
    previousLeaveBalance: numberValue(entry.previous_leave_balance),
    currentMonthLeaves: numberValue(entry.current_month_leaves),
    sandwichLeaves: numberValue(entry.sandwich_leaves),
    adjustment: numberValue(entry.adjustment),
    perDayRate: numberValue(entry.per_day_rate),
    chargeableLeaves: numberValue(entry.chargeable_leaves),
    deduction: numberValue(entry.deduction),
    finalSalary: numberValue(entry.final_salary),
    notes: entry.notes ?? ""
  };
};

const employeeToDb = (employee: Employee) => ({
  name: employee.name.trim(),
  email: employee.email.trim().toLowerCase(),
  position: employee.position.trim(),
  base_salary: employee.baseSalary,
  status: employee.status,
  leave_allowance: employee.leaveAllowance,
  is_active: employee.isActive
});

const entryToDb = (entry: PayrollEntry) => {
  const result = calcSalary(entry.employee, entry);
  return {
    previous_leave_balance: entry.previousLeaveBalance,
    current_month_leaves: entry.currentMonthLeaves,
    sandwich_leaves: entry.sandwichLeaves,
    adjustment: entry.adjustment,
    per_day_rate: result.perDayRate,
    chargeable_leaves: result.chargeableLeaves,
    deduction: result.deduction,
    final_salary: result.finalSalary,
    notes: entry.notes
  };
};

const assertNoError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const createSeedState = (): DemoState => {
  const employees: Employee[] = [
    {
      id: "emp-principal",
      name: "Ritika Sharma",
      email: "ritika@urbanmistrii.com",
      position: "Principal Architect",
      baseSalary: 125000,
      status: "Permanent",
      leaveAllowance: 2,
      isActive: true
    },
    {
      id: "emp-architect",
      name: "Aarav Mehta",
      email: "aarav@urbanmistrii.com",
      position: "Project Architect",
      baseSalary: 78000,
      status: "Permanent",
      leaveAllowance: 2,
      isActive: true
    },
    {
      id: "emp-designer",
      name: "Maya Rao",
      email: "maya@urbanmistrii.com",
      position: "Designer",
      baseSalary: 42000,
      status: "Probation",
      leaveAllowance: 0,
      isActive: true
    }
  ];
  const now = new Date();
  const run: PayrollRun = {
    id: "run-demo",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: "draft",
    createdAt: now.toISOString()
  };

  return {
    employees,
    runs: [run],
    entries: employees.map((employee) => {
      const result = calcSalary(employee, {
        previousLeaveBalance: 0,
        currentMonthLeaves: employee.status === "Probation" ? 1 : 0.5,
        sandwichLeaves: 0,
        adjustment: 0
      });
      return {
        id: `entry-${employee.id}`,
        runId: run.id,
        employeeId: employee.id,
        employee,
        previousLeaveBalance: 0,
        currentMonthLeaves: employee.status === "Probation" ? 1 : 0.5,
        sandwichLeaves: 0,
        adjustment: 0,
        notes: "",
        ...result
      };
    })
  };
};

const readDemoState = (): DemoState => {
  const existing = window.localStorage.getItem(demoKey);
  if (!existing) {
    const seeded = createSeedState();
    window.localStorage.setItem(demoKey, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(existing) as DemoState;
  } catch {
    const seeded = createSeedState();
    window.localStorage.setItem(demoKey, JSON.stringify(seeded));
    return seeded;
  }
};

const writeDemoState = (state: DemoState) => {
  window.localStorage.setItem(demoKey, JSON.stringify(state));
};

const withResult = (entry: PayrollEntry): PayrollEntry => ({
  ...entry,
  ...calcSalary(entry.employee, entry)
});

export const createDemoClient = (): PayrollClient => ({
  mode: "demo",
  getRole: async () => "admin",
  listEmployees: async () => readDemoState().employees,
  listRuns: async () => readDemoState().runs,
  listEntries: async (runId) => readDemoState().entries.filter((entry) => entry.runId === runId),
  createRun: async (month, year) => {
    const state = readDemoState();
    const existing = state.runs.find((run) => run.month === month && run.year === year);
    if (existing) return existing;

    const run: PayrollRun = {
      id: `run-${Date.now()}`,
      month,
      year,
      status: "draft",
      createdAt: new Date().toISOString()
    };
    const entries = state.employees
      .filter((employee) => employee.isActive)
      .map((employee) =>
        withResult({
          id: `entry-${run.id}-${employee.id}`,
          runId: run.id,
          employeeId: employee.id,
          employee,
          previousLeaveBalance: 0,
          currentMonthLeaves: 0,
          sandwichLeaves: 0,
          adjustment: 0,
          perDayRate: 0,
          chargeableLeaves: 0,
          deduction: 0,
          finalSalary: 0,
          notes: ""
        })
      );

    writeDemoState({ ...state, runs: [run, ...state.runs], entries: [...entries, ...state.entries] });
    return run;
  },
  saveEmployee: async (employee) => {
    const state = readDemoState();
    const id = employee.id || `emp-${Date.now()}`;
    const saved = { ...employee, id };
    const exists = state.employees.some((item) => item.id === id);
    const employees = exists
      ? state.employees.map((item) => (item.id === id ? saved : item))
      : [saved, ...state.employees];
    const entries = state.entries.map((entry) =>
      entry.employeeId === id ? withResult({ ...entry, employee: saved }) : entry
    );
    writeDemoState({ ...state, employees, entries });
    return saved;
  },
  removeEmployee: async (id) => {
    const state = readDemoState();
    writeDemoState({
      ...state,
      employees: state.employees.map((employee) => (employee.id === id ? { ...employee, isActive: false } : employee))
    });
  },
  saveEntries: async (entries) => {
    const state = readDemoState();
    const updated = entries.map(withResult);
    writeDemoState({
      ...state,
      entries: state.entries.map((entry) => updated.find((item) => item.id === entry.id) ?? entry)
    });
  }
});

export const createSupabasePayrollClient = (supabase: SupabaseClient, session: Session): PayrollClient => ({
  mode: "supabase",
  getRole: async (): Promise<RoleName> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();
    assertNoError(error);
    return data?.role === "admin" ? "admin" : "pending";
  },
  listEmployees: async () => {
    const { data, error } = await supabase.from("employees").select("*").order("name", { ascending: true });
    assertNoError(error);
    return ((data ?? []) as DbEmployee[]).map(toEmployee);
  },
  listRuns: async () => {
    const { data, error } = await supabase
      .from("payroll_runs")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    assertNoError(error);
    return ((data ?? []) as DbRun[]).map(toRun);
  },
  listEntries: async (runId) => {
    const { data, error } = await supabase
      .from("payroll_entries")
      .select("*, employee:employees(*)")
      .eq("run_id", runId)
      .order("employee(name)", { ascending: true });
    assertNoError(error);
    return ((data ?? []) as DbEntry[]).map(toEntry);
  },
  createRun: async (month, year) => {
    const { data: existing, error: existingError } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();
    assertNoError(existingError);
    if (existing) return toRun(existing as DbRun);

    const { data: runData, error: runError } = await supabase
      .from("payroll_runs")
      .insert({ month, year, created_by: session.user.id })
      .select("*")
      .single();
    assertNoError(runError);

    const run = toRun(runData as DbRun);
    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true);
    assertNoError(employeeError);

    const rows = ((employeeData ?? []) as DbEmployee[]).map((dbEmployee) => {
      const employee = toEmployee(dbEmployee);
      const result = calcSalary(employee, {
        previousLeaveBalance: 0,
        currentMonthLeaves: 0,
        sandwichLeaves: 0,
        adjustment: 0
      });
      return {
        run_id: run.id,
        employee_id: employee.id,
        previous_leave_balance: 0,
        current_month_leaves: 0,
        sandwich_leaves: 0,
        adjustment: 0,
        per_day_rate: result.perDayRate,
        chargeable_leaves: result.chargeableLeaves,
        deduction: result.deduction,
        final_salary: result.finalSalary
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("payroll_entries").insert(rows);
      assertNoError(error);
    }

    return run;
  },
  saveEmployee: async (employee) => {
    if (employee.id) {
      const { data, error } = await supabase
        .from("employees")
        .update(employeeToDb(employee))
        .eq("id", employee.id)
        .select("*")
        .single();
      assertNoError(error);
      return toEmployee(data as DbEmployee);
    }

    const { data, error } = await supabase.from("employees").insert(employeeToDb(employee)).select("*").single();
    assertNoError(error);
    return toEmployee(data as DbEmployee);
  },
  removeEmployee: async (id) => {
    const { error } = await supabase.from("employees").update({ is_active: false }).eq("id", id);
    assertNoError(error);
  },
  saveEntries: async (entries) => {
    const updates = entries.map((entry) =>
      supabase.from("payroll_entries").update(entryToDb(entry)).eq("id", entry.id)
    );
    const results = await Promise.all(updates);
    results.forEach(({ error }) => assertNoError(error));
  }
});
