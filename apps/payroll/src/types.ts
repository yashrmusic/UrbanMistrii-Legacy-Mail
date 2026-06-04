import type { EmploymentStatus } from "@urbanmistrii/payroll-core";

export type PortalConfig = {
  portalEnabled?: boolean;
  provider?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  emailRedirectTo?: string;
  supportEmail?: string;
  allowedEmailDomains?: string[];
  portalMode?: string;
};

export type RoleName = "admin" | "employee" | "pending";

export type Employee = {
  id: string;
  name: string;
  email: string;
  position: string;
  baseSalary: number;
  status: EmploymentStatus;
  leaveAllowance: number;
  isActive: boolean;
  createdAt?: string;
};

export type PayrollRun = {
  id: string;
  month: number;
  year: number;
  status: "draft" | "locked";
  createdAt?: string;
};

export type PayrollEntry = {
  id: string;
  runId: string;
  employeeId: string;
  employee: Employee;
  previousLeaveBalance: number;
  currentMonthLeaves: number;
  sandwichLeaves: number;
  adjustment: number;
  perDayRate: number;
  chargeableLeaves: number;
  deduction: number;
  finalSalary: number;
  notes: string;
};

export type MyPayrollRecord = PayrollEntry & {
  run: PayrollRun;
};

export type PayrollClient = {
  mode: "demo" | "supabase";
  createRun: (month: number, year: number) => Promise<PayrollRun>;
  getMyEmployee: () => Promise<Employee | null>;
  getRole: () => Promise<RoleName>;
  listEmployees: () => Promise<Employee[]>;
  listEntries: (runId: string) => Promise<PayrollEntry[]>;
  listMyPayrollRecords: () => Promise<MyPayrollRecord[]>;
  listRuns: () => Promise<PayrollRun[]>;
  removeEmployee: (id: string) => Promise<void>;
  saveEmployee: (employee: Employee) => Promise<Employee>;
  saveEntries: (entries: PayrollEntry[]) => Promise<void>;
};
