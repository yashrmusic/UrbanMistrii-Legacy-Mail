import { calcSalary } from "@urbanmistrii/payroll-core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import {
  Building2,
  CalendarPlus,
  CheckCircle2,
  Download,
  Edit3,
  KeyRound,
  LogOut,
  Mail,
  Plus,
  Save,
  ShieldAlert,
  Users,
  Wallet,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, loadPortalConfig } from "./lib/config";
import { createDemoClient, createSupabasePayrollClient } from "./lib/payrollClient";
import type { Employee, MyPayrollRecord, PayrollClient, PayrollEntry, PayrollRun, PortalConfig } from "./types";

type ViewKey = "dashboard" | "employees" | "payroll" | "run";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const inr = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency"
});

const compactNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2
});

const blankEmployee = (): Employee => ({
  id: "",
  name: "",
  email: "",
  position: "",
  baseSalary: 0,
  status: "Permanent",
  leaveAllowance: 2,
  isActive: true
});

const monthLabel = (run?: Pick<PayrollRun, "month" | "year">) =>
  run ? `${monthNames[run.month - 1]} ${run.year}` : "No payroll run";

const getCurrentMonth = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const downloadCsv = (run: PayrollRun, entries: PayrollEntry[]) => {
  const headers = [
    "Month",
    "Employee",
    "Email",
    "Position",
    "Base salary",
    "Status",
    "Leave allowance",
    "Previous balance",
    "Current leaves",
    "Sandwich leaves",
    "Total leaves",
    "Chargeable leaves",
    "Per-day rate",
    "Deduction",
    "Adjustment",
    "Final salary",
    "Notes"
  ];
  const rows = entries.map((entry) => {
    const result = calcSalary(entry.employee, entry);
    return [
      monthLabel(run),
      entry.employee.name,
      entry.employee.email,
      entry.employee.position,
      entry.employee.baseSalary,
      entry.employee.status,
      result.allowedLeaves,
      entry.previousLeaveBalance,
      entry.currentMonthLeaves,
      entry.sandwichLeaves,
      result.totalLeaves,
      result.chargeableLeaves,
      result.perDayRate,
      result.deduction,
      entry.adjustment,
      result.finalSalary,
      entry.notes
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `urbanmistrii-payroll-${run.year}-${String(run.month).padStart(2, "0")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const useSupabaseSession = (supabase: SupabaseClient | null) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return { loading, session };
};

function App() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<PortalConfig>();
  const [configLoading, setConfigLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [employeeForm, setEmployeeForm] = useState<Employee>(blankEmployee);
  const [employeePanelOpen, setEmployeePanelOpen] = useState(false);
  const [newRun, setNewRun] = useState(getCurrentMonth);

  useEffect(() => {
    loadPortalConfig().then((loaded) => {
      setConfig(loaded);
      setConfigLoading(false);
    });
  }, []);

  const supabase = useMemo(() => {
    if (!hasSupabaseConfig(config)) return null;
    return createClient(config!.supabaseUrl!, config!.supabaseAnonKey!);
  }, [config]);

  const { loading: authLoading, session } = useSupabaseSession(supabase);
  const client = useMemo<PayrollClient>(() => {
    if (supabase && session) return createSupabasePayrollClient(supabase, session);
    return createDemoClient();
  }, [session, supabase]);
  const readyForData = !supabase || Boolean(session);

  const roleQuery = useQuery({
    enabled: readyForData,
    queryFn: () => client.getRole(),
    queryKey: ["payroll-role", session?.user.id ?? "demo"]
  });
  const isAdmin = roleQuery.data === "admin";
  const isEmployee = roleQuery.data === "employee";
  const adminEnabled = readyForData && isAdmin;
  const employeeEnabled = readyForData && isEmployee;

  const employeesQuery = useQuery({
    enabled: adminEnabled,
    queryFn: () => client.listEmployees(),
    queryKey: ["employees", client.mode, session?.user.id ?? "demo"]
  });
  const runsQuery = useQuery({
    enabled: adminEnabled,
    queryFn: () => client.listRuns(),
    queryKey: ["payroll-runs", client.mode, session?.user.id ?? "demo"]
  });
  const myEmployeeQuery = useQuery({
    enabled: employeeEnabled,
    queryFn: () => client.getMyEmployee(),
    queryKey: ["my-employee", client.mode, session?.user.id ?? "demo"]
  });
  const myPayrollQuery = useQuery({
    enabled: employeeEnabled,
    queryFn: () => client.listMyPayrollRecords(),
    queryKey: ["my-payroll-records", client.mode, session?.user.id ?? "demo"]
  });

  const employees = employeesQuery.data ?? [];
  const activeEmployees = employees.filter((employee) => employee.isActive);
  const runs = runsQuery.data ?? [];
  const latestRun = runs[0];
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? latestRun;

  const latestEntriesQuery = useQuery({
    enabled: adminEnabled && Boolean(latestRun),
    queryFn: () => client.listEntries(latestRun!.id),
    queryKey: ["payroll-entries", client.mode, latestRun?.id ?? "none"]
  });
  const selectedEntriesQuery = useQuery({
    enabled: adminEnabled && activeView === "run" && Boolean(selectedRun),
    queryFn: () => client.listEntries(selectedRun!.id),
    queryKey: ["payroll-entries", client.mode, selectedRun?.id ?? "none"]
  });

  const createRunMutation = useMutation({
    mutationFn: () => client.createRun(newRun.month, newRun.year),
    onSuccess: (run) => {
      setSelectedRunId(run.id);
      setActiveView("run");
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-entries"] });
    }
  });

  const saveEmployeeMutation = useMutation({
    mutationFn: (employee: Employee) => client.saveEmployee(employee),
    onSuccess: () => {
      setEmployeePanelOpen(false);
      setEmployeeForm(blankEmployee());
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-entries"] });
    }
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: (id: string) => client.removeEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-entries"] });
    }
  });

  const latestEntries = latestEntriesQuery.data ?? [];
  const latestTotal = latestEntries.reduce((sum, entry) => sum + calcSalary(entry.employee, entry).finalSalary, 0);

  if (configLoading || authLoading || roleQuery.isLoading) {
    return <LoadingState label="Loading payroll workspace" />;
  }

  if (supabase && !session) {
    return <AuthScreen config={config} supabase={supabase} />;
  }

  if (readyForData && roleQuery.data === "pending") {
    return <PendingScreen onSignOut={() => void supabase?.auth.signOut()} supportEmail={config?.supportEmail} />;
  }

  if (employeeEnabled) {
    return (
      <EmployeePayrollShell
        employee={myEmployeeQuery.data ?? null}
        employeeError={myEmployeeQuery.error?.message}
        employeeLoading={myEmployeeQuery.isLoading}
        mode={client.mode}
        onSignOut={() => void supabase?.auth.signOut()}
        records={myPayrollQuery.data ?? []}
        recordsError={myPayrollQuery.error?.message}
        recordsLoading={myPayrollQuery.isLoading}
        sessionEmail={session?.user.email ?? "Local preview"}
        showSignOut={Boolean(supabase)}
      />
    );
  }

  return (
    <div className="payroll-shell">
      <aside className="payroll-sidebar">
        <a className="brand-lockup" href="/portal">
          <img src="/assets/urbanmistrii-logo-clean.png" alt="Urban Mistrii" />
        </a>
        <nav className="nav-stack" aria-label="Payroll navigation">
          <NavButton icon={Wallet} label="Dashboard" active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} />
          <NavButton icon={Users} label="Employees" active={activeView === "employees"} onClick={() => setActiveView("employees")} />
          <NavButton icon={CalendarPlus} label="Payroll runs" active={activeView === "payroll"} onClick={() => setActiveView("payroll")} />
          <NavButton icon={Building2} label="Current run" active={activeView === "run"} onClick={() => setActiveView("run")} disabled={!selectedRun} />
        </nav>
        <div className="session-box">
          <span>{client.mode === "demo" ? "Demo mode" : "Live Supabase"}</span>
          <strong>{session?.user.email ?? "Local preview"}</strong>
          {supabase ? (
            <button className="quiet-button" type="button" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <main className="payroll-main">
        <header className="payroll-topbar">
          <div>
            <p className="eyebrow">Urban Mistrii Payroll</p>
            <h1>{activeView === "run" ? monthLabel(selectedRun) : "Salary operations"}</h1>
          </div>
          <div className="topbar-actions">
            <a className="outline-button" href="/portal">Portal</a>
            {selectedRun ? (
              <button
                className="outline-button"
                type="button"
                onClick={() => downloadCsv(selectedRun, selectedEntriesQuery.data ?? latestEntries)}
              >
                <Download size={17} aria-hidden="true" />
                CSV
              </button>
            ) : null}
          </div>
        </header>

        {client.mode === "demo" ? (
          <div className="notice-row">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>Preview data is stored in this browser until Supabase payroll tables are created.</span>
          </div>
        ) : null}

        {activeView === "dashboard" ? (
          <Dashboard
            activeEmployees={activeEmployees.length}
            latestRun={latestRun}
            latestTotal={latestTotal}
            runCount={runs.length}
            entriesLoading={latestEntriesQuery.isLoading}
          />
        ) : null}

        {activeView === "employees" ? (
          <EmployeesView
            employees={employees}
            employeeForm={employeeForm}
            employeePanelOpen={employeePanelOpen}
            error={saveEmployeeMutation.error?.message ?? removeEmployeeMutation.error?.message}
            loading={employeesQuery.isLoading}
            saving={saveEmployeeMutation.isPending}
            onClosePanel={() => {
              setEmployeePanelOpen(false);
              setEmployeeForm(blankEmployee());
            }}
            onEdit={(employee) => {
              setEmployeeForm(employee);
              setEmployeePanelOpen(true);
            }}
            onNew={() => {
              setEmployeeForm(blankEmployee());
              setEmployeePanelOpen(true);
            }}
            onRemove={(id) => removeEmployeeMutation.mutate(id)}
            onSave={(employee) => saveEmployeeMutation.mutate(employee)}
            setEmployeeForm={setEmployeeForm}
          />
        ) : null}

        {activeView === "payroll" ? (
          <PayrollRunsView
            createError={createRunMutation.error?.message}
            creating={createRunMutation.isPending}
            newRun={newRun}
            runs={runs}
            onCreate={() => createRunMutation.mutate()}
            onOpen={(run) => {
              setSelectedRunId(run.id);
              setActiveView("run");
            }}
            setNewRun={setNewRun}
          />
        ) : null}

        {activeView === "run" ? (
          selectedRun ? (
            <RunGrid
              client={client}
              entries={selectedEntriesQuery.data ?? []}
              loading={selectedEntriesQuery.isLoading}
              run={selectedRun}
            />
          ) : (
            <EmptyState actionLabel="Create run" onAction={() => setActiveView("payroll")} title="No payroll run yet" />
          )
        ) : null}
      </main>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="center-state">
      <div className="loader-mark" />
      <p>{label}</p>
    </div>
  );
}

function AuthScreen({ config, supabase }: { config?: PortalConfig | undefined; supabase: SupabaseClient }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectTo = `${window.location.origin}/portal/payroll`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
        : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(mode === "signup" ? "Account created. Check your inbox if confirmation is required." : "Signed in.");
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <a className="brand-lockup is-auth" href="/">
          <img src="/assets/urbanmistrii-logo-clean.png" alt="Urban Mistrii" />
        </a>
        <div>
          <p className="eyebrow">Payroll Access</p>
          <h1>Salary operations</h1>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="name@urbanmistrii.com" required />
          </label>
          <label>
            <span>Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            <KeyRound size={17} aria-hidden="true" />
            {loading ? "Working" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button
            className="outline-button is-full"
            type="button"
            onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })}
          >
            <Mail size={17} aria-hidden="true" />
            Google
          </button>
        </form>
        <div className="auth-switch">
          <button type="button" className={mode === "signin" ? "is-active" : ""} onClick={() => setMode("signin")}>
            Sign in
          </button>
          <button type="button" className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")}>
            New account
          </button>
        </div>
        {message ? <p className="form-status">{message}</p> : null}
        <p className="microcopy">Support: {config?.supportEmail ?? "hr@urbanmistrii.com"}</p>
      </section>
    </main>
  );
}

function PendingScreen({ onSignOut, supportEmail }: { onSignOut: () => void; supportEmail?: string | undefined }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <ShieldAlert size={30} aria-hidden="true" />
        <div>
          <p className="eyebrow">Access Pending</p>
          <h1>Waiting for admin approval</h1>
        </div>
        <p className="auth-copy">Your account exists, but it is not matched to an active employee profile yet.</p>
        <div className="inline-actions">
          <a className="outline-button" href={`mailto:${supportEmail ?? "hr@urbanmistrii.com"}`}>Contact HR</a>
          <button className="primary-button" type="button" onClick={onSignOut}>
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

function EmployeePayrollShell({
  employee,
  employeeError,
  employeeLoading,
  mode,
  onSignOut,
  records,
  recordsError,
  recordsLoading,
  sessionEmail,
  showSignOut
}: {
  employee: Employee | null;
  employeeError?: string | undefined;
  employeeLoading: boolean;
  mode: PayrollClient["mode"];
  onSignOut: () => void;
  records: MyPayrollRecord[];
  recordsError?: string | undefined;
  recordsLoading: boolean;
  sessionEmail: string;
  showSignOut: boolean;
}) {
  return (
    <div className="payroll-shell is-employee">
      <aside className="payroll-sidebar">
        <a className="brand-lockup" href="/portal">
          <img src="/assets/urbanmistrii-logo-clean.png" alt="Urban Mistrii" />
        </a>
        <nav className="nav-stack" aria-label="Payroll navigation">
          <NavButton icon={Wallet} label="My salary" active onClick={() => undefined} />
        </nav>
        <div className="session-box">
          <span>{mode === "demo" ? "Demo employee" : "Employee access"}</span>
          <strong>{sessionEmail}</strong>
          {showSignOut ? (
            <button className="quiet-button" type="button" onClick={onSignOut}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <main className="payroll-main">
        <header className="payroll-topbar">
          <div>
            <p className="eyebrow">Urban Mistrii Payroll</p>
            <h1>My salary</h1>
          </div>
          <div className="topbar-actions">
            <a className="outline-button" href="/portal">Portal</a>
          </div>
        </header>

        <div className="notice-row">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>This is a read-only employee view. Only your own salary records are available here.</span>
        </div>

        {employeeError || recordsError ? <p className="error-line">{employeeError ?? recordsError}</p> : null}

        <EmployeeSelfView
          employee={employee}
          employeeLoading={employeeLoading}
          records={records}
          recordsLoading={recordsLoading}
        />
      </main>
    </div>
  );
}

function EmployeeSelfView({
  employee,
  employeeLoading,
  records,
  recordsLoading
}: {
  employee: Employee | null;
  employeeLoading: boolean;
  records: MyPayrollRecord[];
  recordsLoading: boolean;
}) {
  const latestRecord = records.at(0);
  const profile = employee ?? latestRecord?.employee ?? null;
  const latestResult = latestRecord ? calcSalary(latestRecord.employee, latestRecord) : null;
  const loading = employeeLoading || recordsLoading;

  if (loading) {
    return (
      <section className="content-stack">
        <section className="work-surface">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Employee Record</p>
              <h2>Loading your payroll</h2>
            </div>
          </div>
        </section>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="empty-state">
        <h2>No employee profile found</h2>
        <p className="auth-copy">Ask HR to add your login email to the employee roster.</p>
      </section>
    );
  }

  return (
    <section className="content-stack">
      <div className="metric-grid">
        <Metric icon={Users} label="Profile" value={profile.name} />
        <Metric icon={Building2} label="Position" value={profile.position} />
        <Metric icon={CalendarPlus} label="Latest month" value={latestRecord ? monthLabel(latestRecord.run) : "Not published"} />
        <Metric icon={CheckCircle2} label="Net salary" value={latestResult ? inr.format(latestResult.finalSalary) : "Not published"} />
      </div>

      <div className="employee-overview-grid">
        <section className="work-surface">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Employee Profile</p>
              <h2>{profile.name}</h2>
            </div>
            <Pill label={profile.status} tone={profile.status === "Permanent" ? "green" : "amber"} />
          </div>
          <div className="detail-grid">
            <Detail label="Email" value={profile.email} />
            <Detail label="Position" value={profile.position} />
            <Detail label="Base salary" value={inr.format(profile.baseSalary)} />
            <Detail label="Leave allowance" value={compactNumber.format(profile.leaveAllowance)} />
          </div>
        </section>

        <section className="work-surface salary-snapshot">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Latest Salary</p>
              <h2>{latestRecord ? monthLabel(latestRecord.run) : "Not published"}</h2>
            </div>
            <strong>{latestResult ? inr.format(latestResult.finalSalary) : "..."}</strong>
          </div>
          {latestRecord && latestResult ? (
            <div className="detail-grid">
              <Detail label="Base salary" value={inr.format(latestRecord.employee.baseSalary)} />
              <Detail label="Per-day rate" value={inr.format(latestResult.perDayRate)} />
              <Detail label="Total leaves" value={compactNumber.format(latestResult.totalLeaves)} />
              <Detail label="Chargeable leaves" value={compactNumber.format(latestResult.chargeableLeaves)} />
              <Detail label="Deduction" value={inr.format(latestResult.deduction)} />
              <Detail label="Adjustment" value={inr.format(latestRecord.adjustment)} />
              {latestRecord.notes ? <Detail label="Notes" value={latestRecord.notes} wide /> : null}
            </div>
          ) : (
            <p className="auth-copy">No salary entry has been published for your profile yet.</p>
          )}
        </section>
      </div>

      <section className="content-stack">
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">History</p>
            <h2>My salary records</h2>
          </div>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Base</th>
                <th>Total leaves</th>
                <th>Chargeable</th>
                <th>Deduction</th>
                <th>Adjustment</th>
                <th>Final</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((record) => {
                  const result = calcSalary(record.employee, record);
                  return (
                    <tr key={record.id}>
                      <td><strong>{monthLabel(record.run)}</strong></td>
                      <td>{inr.format(record.employee.baseSalary)}</td>
                      <td>{compactNumber.format(result.totalLeaves)}</td>
                      <td>{compactNumber.format(result.chargeableLeaves)}</td>
                      <td>{inr.format(result.deduction)}</td>
                      <td>{inr.format(record.adjustment)}</td>
                      <td><strong>{inr.format(result.finalSalary)}</strong></td>
                    </tr>
                  );
                })
              ) : (
                <TableEmpty colSpan={7} label="No salary records published yet" />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Detail({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <article className={`detail-item${wide ? " is-wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function NavButton({
  active,
  disabled,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button${active ? " is-active" : ""}`} type="button" onClick={onClick} disabled={disabled}>
      <Icon size={18} aria-hidden={true} />
      <span>{label}</span>
    </button>
  );
}

function Dashboard({
  activeEmployees,
  entriesLoading,
  latestRun,
  latestTotal,
  runCount
}: {
  activeEmployees: number;
  entriesLoading: boolean;
  latestRun?: PayrollRun | undefined;
  latestTotal: number;
  runCount: number;
}) {
  return (
    <section className="content-stack">
      <div className="metric-grid">
        <Metric icon={Users} label="Active employees" value={activeEmployees} />
        <Metric icon={CalendarPlus} label="Payroll runs" value={runCount} />
        <Metric icon={Wallet} label="Latest month" value={monthLabel(latestRun)} />
        <Metric icon={CheckCircle2} label="Total payable" value={entriesLoading ? "Calculating" : inr.format(latestTotal)} />
      </div>
      <section className="work-surface">
        <div className="surface-header">
          <div>
            <p className="eyebrow">Studio Payroll</p>
            <h2>{monthLabel(latestRun)}</h2>
          </div>
          <strong>{entriesLoading ? "..." : inr.format(latestTotal)}</strong>
        </div>
        <div className="signal-row">
          <span>Per-day rate uses base salary divided by 30.</span>
          <span>Probation employees have zero leave allowance.</span>
          <span>Final salary stores deduction plus adjustment output.</span>
        </div>
      </section>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <article className="metric-card">
      <Icon size={18} aria-hidden={true} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmployeesView({
  employeeForm,
  employeePanelOpen,
  employees,
  error,
  loading,
  onClosePanel,
  onEdit,
  onNew,
  onRemove,
  onSave,
  saving,
  setEmployeeForm
}: {
  employeeForm: Employee;
  employeePanelOpen: boolean;
  employees: Employee[];
  error?: string | undefined;
  loading: boolean;
  onClosePanel: () => void;
  onEdit: (employee: Employee) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
  onSave: (employee: Employee) => void;
  saving: boolean;
  setEmployeeForm: React.Dispatch<React.SetStateAction<Employee>>;
}) {
  return (
    <section className="content-stack">
      <div className="section-toolbar">
        <div>
          <p className="eyebrow">Roster</p>
          <h2>Employees</h2>
        </div>
        <button className="primary-button" type="button" onClick={onNew}>
          <Plus size={17} aria-hidden="true" />
          Employee
        </button>
      </div>
      {error ? <p className="error-line">{error}</p> : null}
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Status</th>
              <th>Base salary</th>
              <th>Allowance</th>
              <th>Active</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableWait colSpan={7} />
            ) : employees.length ? (
              employees.map((employee) => (
                <tr key={employee.id} className={!employee.isActive ? "is-muted" : ""}>
                  <td>
                    <strong>{employee.name}</strong>
                    <small>{employee.email}</small>
                  </td>
                  <td>{employee.position}</td>
                  <td><Pill label={employee.status} tone={employee.status === "Permanent" ? "green" : "amber"} /></td>
                  <td>{inr.format(employee.baseSalary)}</td>
                  <td>{compactNumber.format(employee.leaveAllowance)}</td>
                  <td>{employee.isActive ? "Yes" : "No"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-action" type="button" aria-label={`Edit ${employee.name}`} onClick={() => onEdit(employee)}>
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      {employee.isActive ? (
                        <button className="icon-action" type="button" aria-label={`Deactivate ${employee.name}`} onClick={() => onRemove(employee.id)}>
                          <X size={16} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <TableEmpty colSpan={7} label="No employees yet" />
            )}
          </tbody>
        </table>
      </div>

      {employeePanelOpen ? (
        <form
          className="drawer-panel"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(employeeForm);
          }}
        >
          <div className="surface-header">
            <div>
              <p className="eyebrow">{employeeForm.id ? "Edit" : "Add"}</p>
              <h2>{employeeForm.id ? employeeForm.name : "Employee"}</h2>
            </div>
            <button className="icon-action" type="button" aria-label="Close employee form" onClick={onClosePanel}>
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="form-grid">
            <Field label="Name">
              <input value={employeeForm.name} onChange={(event) => setEmployeeForm((item) => ({ ...item, name: event.target.value }))} required />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={employeeForm.email}
                onChange={(event) => setEmployeeForm((item) => ({ ...item, email: event.target.value }))}
                required
              />
            </Field>
            <Field label="Position">
              <input value={employeeForm.position} onChange={(event) => setEmployeeForm((item) => ({ ...item, position: event.target.value }))} required />
            </Field>
            <Field label="Base salary">
              <input
                min="0"
                type="number"
                value={employeeForm.baseSalary}
                onChange={(event) => setEmployeeForm((item) => ({ ...item, baseSalary: Number(event.target.value) }))}
              />
            </Field>
            <Field label="Status">
              <select
                value={employeeForm.status}
                onChange={(event) =>
                  setEmployeeForm((item) => ({
                    ...item,
                    leaveAllowance: event.target.value === "Probation" ? 0 : item.leaveAllowance,
                    status: event.target.value as Employee["status"]
                  }))
                }
              >
                <option>Permanent</option>
                <option>Probation</option>
              </select>
            </Field>
            <Field label="Leave allowance">
              <input
                min="0"
                step="0.5"
                type="number"
                value={employeeForm.leaveAllowance}
                onChange={(event) => setEmployeeForm((item) => ({ ...item, leaveAllowance: Number(event.target.value) }))}
                disabled={employeeForm.status === "Probation"}
              />
            </Field>
          </div>
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={employeeForm.isActive}
              onChange={(event) => setEmployeeForm((item) => ({ ...item, isActive: event.target.checked }))}
            />
            Active employee
          </label>
          <div className="inline-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              <Save size={17} aria-hidden="true" />
              {saving ? "Saving" : "Save"}
            </button>
            <button className="outline-button" type="button" onClick={onClosePanel}>Cancel</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function PayrollRunsView({
  createError,
  creating,
  newRun,
  onCreate,
  onOpen,
  runs,
  setNewRun
}: {
  createError?: string | undefined;
  creating: boolean;
  newRun: { month: number; year: number };
  onCreate: () => void;
  onOpen: (run: PayrollRun) => void;
  runs: PayrollRun[];
  setNewRun: React.Dispatch<React.SetStateAction<{ month: number; year: number }>>;
}) {
  return (
    <section className="content-stack">
      <form
        className="run-composer"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
        <div>
          <p className="eyebrow">Monthly Run</p>
          <h2>Create payroll</h2>
        </div>
        <Field label="Month">
          <select value={newRun.month} onChange={(event) => setNewRun((run) => ({ ...run, month: Number(event.target.value) }))}>
            {monthNames.map((month, index) => (
              <option key={month} value={index + 1}>{month}</option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input
            type="number"
            value={newRun.year}
            onChange={(event) => setNewRun((run) => ({ ...run, year: Number(event.target.value) }))}
          />
        </Field>
        <button className="primary-button" type="submit" disabled={creating}>
          <CalendarPlus size={17} aria-hidden="true" />
          {creating ? "Creating" : "Create"}
        </button>
      </form>
      {createError ? <p className="error-line">{createError}</p> : null}
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Status</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {runs.length ? (
              runs.map((run) => (
                <tr key={run.id}>
                  <td><strong>{monthLabel(run)}</strong></td>
                  <td><Pill label={run.status} tone={run.status === "draft" ? "amber" : "green"} /></td>
                  <td>{run.createdAt ? new Date(run.createdAt).toLocaleDateString("en-IN") : "Draft"}</td>
                  <td>
                    <button className="outline-button is-compact" type="button" onClick={() => onOpen(run)}>Open</button>
                  </td>
                </tr>
              ))
            ) : (
              <TableEmpty colSpan={4} label="No payroll runs yet" />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RunGrid({
  client,
  entries,
  loading,
  run
}: {
  client: PayrollClient;
  entries: PayrollEntry[];
  loading: boolean;
  run: PayrollRun;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PayrollEntry[]>([]);
  const saveMutation = useMutation({
    mutationFn: () => client.saveEntries(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-entries"] });
    }
  });

  useEffect(() => {
    setDraft(entries);
  }, [entries]);

  const updateDraft = (id: string, patch: Partial<PayrollEntry>) => {
    setDraft((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const totals = draft.reduce(
    (acc, entry) => {
      const result = calcSalary(entry.employee, entry);
      acc.base += entry.employee.baseSalary;
      acc.deductions += result.deduction;
      acc.adjustments += entry.adjustment;
      acc.final += result.finalSalary;
      return acc;
    },
    { adjustments: 0, base: 0, deductions: 0, final: 0 }
  );

  return (
    <section className="content-stack">
      <div className="section-toolbar">
        <div>
          <p className="eyebrow">Run Detail</p>
          <h2>{monthLabel(run)}</h2>
        </div>
        <div className="inline-actions">
          <button className="outline-button" type="button" onClick={() => downloadCsv(run, draft)} disabled={!draft.length}>
            <Download size={17} aria-hidden="true" />
            CSV
          </button>
          <button className="primary-button" type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !draft.length}>
            <Save size={17} aria-hidden="true" />
            {saveMutation.isPending ? "Saving" : "Save"}
          </button>
        </div>
      </div>
      {saveMutation.error ? <p className="error-line">{saveMutation.error.message}</p> : null}
      <div className="payroll-summary">
        <Metric icon={Wallet} label="Base salary" value={inr.format(totals.base)} />
        <Metric icon={X} label="Deductions" value={inr.format(totals.deductions)} />
        <Metric icon={Plus} label="Adjustments" value={inr.format(totals.adjustments)} />
        <Metric icon={CheckCircle2} label="Final payable" value={inr.format(totals.final)} />
      </div>
      <div className="table-shell is-wide">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Base</th>
              <th>Prev</th>
              <th>Current</th>
              <th>Sandwich</th>
              <th>Total</th>
              <th>Chargeable</th>
              <th>Deduction</th>
              <th>Adjustment</th>
              <th>Final</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableWait colSpan={10} />
            ) : draft.length ? (
              draft.map((entry) => {
                const result = calcSalary(entry.employee, entry);
                return (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.employee.name}</strong>
                      <small>{entry.employee.position}</small>
                    </td>
                    <td>{inr.format(entry.employee.baseSalary)}</td>
                    <td>
                      <GridNumber value={entry.previousLeaveBalance} onChange={(value) => updateDraft(entry.id, { previousLeaveBalance: value })} />
                    </td>
                    <td>
                      <GridNumber value={entry.currentMonthLeaves} onChange={(value) => updateDraft(entry.id, { currentMonthLeaves: value })} />
                    </td>
                    <td>
                      <GridNumber value={entry.sandwichLeaves} onChange={(value) => updateDraft(entry.id, { sandwichLeaves: value })} />
                    </td>
                    <td>{compactNumber.format(result.totalLeaves)}</td>
                    <td>{compactNumber.format(result.chargeableLeaves)}</td>
                    <td>{inr.format(result.deduction)}</td>
                    <td>
                      <GridNumber value={entry.adjustment} onChange={(value) => updateDraft(entry.id, { adjustment: value })} money />
                    </td>
                    <td><strong>{inr.format(result.finalSalary)}</strong></td>
                  </tr>
                );
              })
            ) : (
              <TableEmpty colSpan={10} label="No active employees were attached to this run" />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function GridNumber({ money, onChange, value }: { money?: boolean; onChange: (value: number) => void; value: number }) {
  return (
    <input
      className={money ? "grid-input is-money" : "grid-input"}
      type="number"
      step={money ? "1" : "0.5"}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function Pill({ label, tone }: { label: string; tone: "amber" | "green" }) {
  return <span className={`pill is-${tone}`}>{label}</span>;
}

function TableWait({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td className="table-state" colSpan={colSpan}>Loading</td>
    </tr>
  );
}

function TableEmpty({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td className="table-state" colSpan={colSpan}>{label}</td>
    </tr>
  );
}

function EmptyState({ actionLabel, onAction, title }: { actionLabel: string; onAction: () => void; title: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <button className="primary-button" type="button" onClick={onAction}>{actionLabel}</button>
    </section>
  );
}

export default App;
