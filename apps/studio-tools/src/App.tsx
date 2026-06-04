import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  FileDown,
  FolderKanban,
  KeyRound,
  LogOut,
  Mail,
  MapPinned,
  Plus,
  Save,
  Trash2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { hasSupabaseConfig, loadPortalConfig } from "./lib/config";
import type { Issue, Phase, PortalConfig, Priority, Project, ProjectStatus, SiteLog, StudioState, Task, TaskStatus, ViewKey } from "./types";

const phases: Phase[] = ["Schematic", "DD", "CD", "Tender", "Construction", "Handover"];
const projectStatuses: ProjectStatus[] = ["Active", "On Hold", "At Risk", "Complete"];
const taskStatuses: TaskStatus[] = ["To Do", "In Progress", "In Review", "Done"];
const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];
const colors = ["#4f6549", "#385f7d", "#9a6248", "#b0832f", "#6b5a7d", "#7c4f57"];
const storeKey = "um_studio_tools_state_v1";

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const formatDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN") : "Not set");
const toDate = (value: string) => new Date(`${value}T00:00:00`).getTime();
const daysBetween = (start: string, end: string) => Math.max(1, Math.round((toDate(end) - toDate(start)) / 86_400_000) + 1);

const emptyProject = (): Project => ({
  id: "",
  name: "",
  client: "",
  lead: "",
  phase: "Schematic",
  status: "Active",
  startDate: today(),
  endDate: today(),
  color: colors[0]!,
  budget: 0,
  createdAt: new Date().toISOString()
});

const emptyTask = (projectId = ""): Task => ({
  id: "",
  projectId,
  title: "",
  assignee: "",
  phase: "Schematic",
  status: "To Do",
  priority: "Medium",
  startDate: today(),
  dueDate: today(),
  notes: ""
});

const emptyIssue = (projectId = ""): Issue => ({
  id: "",
  projectId,
  title: "",
  drawing: "",
  discipline: "Architecture",
  owner: "",
  severity: "Medium",
  status: "Open",
  dueDate: today()
});

const emptyLog = (projectId = ""): SiteLog => ({
  id: "",
  projectId,
  date: today(),
  author: "",
  weather: "Clear",
  manpower: 0,
  summary: "",
  blockers: ""
});

const seedState = (): StudioState => {
  const projects: Project[] = [
    {
      ...emptyProject(),
      id: "project-residence",
      name: "Sector 62 Residence",
      client: "Mehra Family",
      lead: "Navdha Kapila",
      phase: "DD",
      status: "Active",
      startDate: "2026-06-01",
      endDate: "2026-09-18",
      color: colors[0]!,
      budget: 1850000
    },
    {
      ...emptyProject(),
      id: "project-cafe",
      name: "Courtyard Cafe Fitout",
      client: "Nivara Hospitality",
      lead: "Alankrit Malyan",
      phase: "CD",
      status: "At Risk",
      startDate: "2026-05-20",
      endDate: "2026-08-05",
      color: colors[1]!,
      budget: 920000
    },
    {
      ...emptyProject(),
      id: "project-studio",
      name: "Studio Library Upgrade",
      client: "Urban Mistrii",
      lead: "Vanshika Khemani",
      phase: "Tender",
      status: "Active",
      startDate: "2026-06-10",
      endDate: "2026-07-30",
      color: colors[2]!,
      budget: 360000
    }
  ];

  const tasks: Task[] = [
    { ...emptyTask("project-residence"), id: "task-layout", title: "Freeze ground floor layout", assignee: "Navdha", phase: "DD", status: "In Progress", priority: "High", startDate: "2026-06-04", dueDate: "2026-06-12", notes: "Coordinate stair and courtyard clearances." },
    { ...emptyTask("project-residence"), id: "task-render", title: "Material moodboard", assignee: "Vanshika", phase: "DD", status: "To Do", priority: "Medium", startDate: "2026-06-08", dueDate: "2026-06-16", notes: "Warm neutral palette with stone options." },
    { ...emptyTask("project-cafe"), id: "task-mep", title: "MEP reflected ceiling check", assignee: "Devam", phase: "CD", status: "In Review", priority: "Critical", startDate: "2026-06-02", dueDate: "2026-06-07", notes: "Resolve exhaust route conflict." },
    { ...emptyTask("project-cafe"), id: "task-boq", title: "BOQ update for bar counter", assignee: "Alankrit", phase: "Tender", status: "Done", priority: "High", startDate: "2026-05-28", dueDate: "2026-06-03", notes: "Issued to procurement." },
    { ...emptyTask("project-studio"), id: "task-vendors", title: "Shortlist shelving vendors", assignee: "Yash", phase: "Tender", status: "To Do", priority: "Medium", startDate: "2026-06-10", dueDate: "2026-06-18", notes: "" }
  ];

  return {
    projects,
    tasks,
    issues: [
      { ...emptyIssue("project-cafe"), id: "issue-ceiling", title: "Ceiling access panel clashes with pendant grid", drawing: "A-502", owner: "Devam", severity: "High", status: "Open", dueDate: "2026-06-08" },
      { ...emptyIssue("project-residence"), id: "issue-window", title: "Master bedroom sill height confirmation", drawing: "A-301", owner: "Navdha", severity: "Medium", status: "Review", dueDate: "2026-06-11" }
    ],
    logs: [
      { ...emptyLog("project-cafe"), id: "log-cafe-1", author: "Alankrit", date: "2026-06-04", manpower: 8, summary: "False ceiling framing started. Bar counter base marked on site.", blockers: "Awaiting final pendant specs." }
    ]
  };
};

const readState = (): StudioState => {
  const stored = window.localStorage.getItem(storeKey);
  if (!stored) {
    const seeded = seedState();
    window.localStorage.setItem(storeKey, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(stored) as StudioState;
  } catch {
    const seeded = seedState();
    window.localStorage.setItem(storeKey, JSON.stringify(seeded));
    return seeded;
  }
};

const writeState = (state: StudioState) => {
  window.localStorage.setItem(storeKey, JSON.stringify(state));
};

const projectName = (projects: Project[], projectId: string) => projects.find((project) => project.id === projectId)?.name ?? "Unassigned";

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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return { loading, session };
};

function App() {
  const [config, setConfig] = useState<PortalConfig>();
  const [configLoading, setConfigLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [state, setState] = useState<StudioState>(() => readState());
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    loadPortalConfig().then((loaded) => {
      setConfig(loaded);
      setConfigLoading(false);
    });
  }, []);

  useEffect(() => {
    writeState(state);
  }, [state]);

  const supabase = useMemo(() => {
    if (!hasSupabaseConfig(config)) return null;
    return createClient(config!.supabaseUrl!, config!.supabaseAnonKey!);
  }, [config]);
  const { loading: authLoading, session } = useSupabaseSession(supabase);
  const ready = !configLoading && !authLoading;
  const selectedProject = state.projects.find((project) => project.id === selectedProjectId) ?? state.projects[0];
  const visibleTasks = selectedProject ? state.tasks.filter((task) => task.projectId === selectedProject.id) : state.tasks;

  const updateState = (updater: (current: StudioState) => StudioState) => setState((current) => updater(current));

  const saveProject = (project: Project) => {
    const saved = { ...project, id: project.id || uid("project"), createdAt: project.createdAt || new Date().toISOString() };
    updateState((current) => ({
      ...current,
      projects: current.projects.some((item) => item.id === saved.id)
        ? current.projects.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current.projects]
    }));
    setSelectedProjectId(saved.id);
  };

  const saveTask = (task: Task) => {
    const saved = { ...task, id: task.id || uid("task"), projectId: task.projectId || selectedProject?.id || state.projects[0]?.id || "" };
    updateState((current) => ({
      ...current,
      tasks: current.tasks.some((item) => item.id === saved.id)
        ? current.tasks.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current.tasks]
    }));
  };

  const saveIssue = (issue: Issue) => {
    const saved = { ...issue, id: issue.id || uid("issue"), projectId: issue.projectId || selectedProject?.id || state.projects[0]?.id || "" };
    updateState((current) => ({
      ...current,
      issues: current.issues.some((item) => item.id === saved.id)
        ? current.issues.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current.issues]
    }));
  };

  const saveLog = (log: SiteLog) => {
    const saved = { ...log, id: log.id || uid("log"), projectId: log.projectId || selectedProject?.id || state.projects[0]?.id || "" };
    updateState((current) => ({
      ...current,
      logs: current.logs.some((item) => item.id === saved.id)
        ? current.logs.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current.logs]
    }));
  };

  const removeItem = (kind: keyof StudioState, id: string) => {
    updateState((current) => ({
      ...current,
      [kind]: current[kind].filter((item) => item.id !== id)
    }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `urbanmistrii-studio-tools-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) return <LoadingState />;
  if (supabase && !session) return <AuthScreen config={config} supabase={supabase} />;

  return (
    <div className="tool-shell">
      <aside className="tool-sidebar">
        <a className="brand-lockup" href="/portal">
          <img src="/assets/urbanmistrii-logo-clean.png" alt="Urban Mistrii" />
        </a>
        <nav className="nav-stack" aria-label="Studio tools">
          <NavButton icon={BarChart3} label="Dashboard" active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} />
          <NavButton icon={Building2} label="Projects" active={activeView === "projects"} onClick={() => setActiveView("projects")} />
          <NavButton icon={FolderKanban} label="Kanban" active={activeView === "board"} onClick={() => setActiveView("board")} />
          <NavButton icon={CalendarDays} label="Gantt" active={activeView === "gantt"} onClick={() => setActiveView("gantt")} />
          <NavButton icon={AlertTriangle} label="Issues" active={activeView === "issues"} onClick={() => setActiveView("issues")} />
          <NavButton icon={MapPinned} label="Site logs" active={activeView === "logs"} onClick={() => setActiveView("logs")} />
        </nav>
        <div className="session-box">
          <span>{supabase ? "Signed in" : "Draft mode"}</span>
          <strong>{session?.user.email ?? "Local workspace"}</strong>
          {supabase ? (
            <button className="quiet-button" type="button" onClick={() => void supabase.auth.signOut()}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <main className="tool-main">
        <header className="tool-topbar">
          <div>
            <p className="eyebrow">Architecture Workspace</p>
            <h1>{viewTitle(activeView)}</h1>
          </div>
          <div className="topbar-actions">
            <a className="outline-button" href="/portal">Portal</a>
            <a className="outline-button" href="/portal/payroll">Payroll</a>
            <button className="outline-button" type="button" onClick={exportJson}>
              <Download size={17} aria-hidden="true" />
              JSON
            </button>
          </div>
        </header>

        <div className="notice-row">
          <ClipboardList size={18} aria-hidden="true" />
          <span>Project data is saved in this browser for now. Export JSON before switching machines.</span>
        </div>

        {activeView === "dashboard" ? <Dashboard state={state} selectedProject={selectedProject} /> : null}
        {activeView === "projects" ? <ProjectsView projects={state.projects} onDelete={(id) => removeItem("projects", id)} onSave={saveProject} /> : null}
        {activeView === "board" ? (
          <BoardView
            projects={state.projects}
            selectedProjectId={selectedProject?.id ?? ""}
            tasks={visibleTasks}
            onDelete={(id) => removeItem("tasks", id)}
            onProjectChange={setSelectedProjectId}
            onSave={saveTask}
          />
        ) : null}
        {activeView === "gantt" ? (
          <GanttView
            projects={state.projects}
            selectedProjectId={selectedProject?.id ?? ""}
            tasks={visibleTasks}
            onProjectChange={setSelectedProjectId}
          />
        ) : null}
        {activeView === "issues" ? (
          <IssuesView
            issues={state.issues}
            projects={state.projects}
            onDelete={(id) => removeItem("issues", id)}
            onSave={saveIssue}
          />
        ) : null}
        {activeView === "logs" ? (
          <LogsView
            logs={state.logs}
            projects={state.projects}
            onDelete={(id) => removeItem("logs", id)}
            onSave={saveLog}
          />
        ) : null}
      </main>
    </div>
  );
}

function viewTitle(view: ViewKey) {
  const labels: Record<ViewKey, string> = {
    dashboard: "Studio controls",
    projects: "Projects",
    board: "Kanban board",
    gantt: "Gantt maker",
    issues: "Drawing issues",
    logs: "Site logs"
  };
  return labels[view];
}

function LoadingState() {
  return (
    <div className="center-state">
      <div className="loader-mark" />
      <p>Loading studio tools</p>
    </div>
  );
}

function AuthScreen({ config, supabase }: { config?: PortalConfig | undefined; supabase: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectTo = `${window.location.origin}/portal/studio`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    setMessage(result.error ? result.error.message : "Signed in.");
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <a className="brand-lockup is-auth" href="/">
          <img src="/assets/urbanmistrii-logo-clean.png" alt="Urban Mistrii" />
        </a>
        <div>
          <p className="eyebrow">Studio Tools</p>
          <h1>Architecture workspace</h1>
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
            {loading ? "Working" : "Sign in"}
          </button>
          <button className="outline-button is-full" type="button" onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })}>
            <Mail size={17} aria-hidden="true" />
            Google
          </button>
        </form>
        {message ? <p className="form-status">{message}</p> : null}
        <p className="microcopy">Support: {config?.supportEmail ?? "hr@urbanmistrii.com"}</p>
      </section>
    </main>
  );
}

function Dashboard({ selectedProject, state }: { selectedProject?: Project | undefined; state: StudioState }) {
  const activeProjects = state.projects.filter((project) => project.status !== "Complete").length;
  const openIssues = state.issues.filter((issue) => issue.status !== "Closed").length;
  const dueSoon = state.tasks.filter((task) => task.status !== "Done" && toDate(task.dueDate) - Date.now() < 7 * 86_400_000).length;
  const doneTasks = state.tasks.filter((task) => task.status === "Done").length;
  const progress = state.tasks.length ? Math.round((doneTasks / state.tasks.length) * 100) : 0;

  return (
    <section className="content-stack">
      <div className="metric-grid">
        <Metric icon={Building2} label="Active projects" value={activeProjects} />
        <Metric icon={FolderKanban} label="Tasks complete" value={`${progress}%`} />
        <Metric icon={AlertTriangle} label="Open issues" value={openIssues} />
        <Metric icon={CalendarDays} label="Due this week" value={dueSoon} />
      </div>
      <div className="dashboard-grid">
        <section className="work-surface">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Current Focus</p>
              <h2>{selectedProject?.name ?? "No project yet"}</h2>
            </div>
            {selectedProject ? <Pill label={selectedProject.status} tone={selectedProject.status === "At Risk" ? "red" : "green"} /> : null}
          </div>
          {selectedProject ? (
            <div className="detail-grid">
              <Detail label="Client" value={selectedProject.client} />
              <Detail label="Lead" value={selectedProject.lead} />
              <Detail label="Phase" value={selectedProject.phase} />
              <Detail label="Dates" value={`${formatDate(selectedProject.startDate)} - ${formatDate(selectedProject.endDate)}`} />
            </div>
          ) : null}
        </section>
        <section className="work-surface">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Architecture Tools</p>
              <h2>Daily operating set</h2>
            </div>
          </div>
          <div className="signal-row">
            <span>Use kanban for task ownership and review status.</span>
            <span>Use Gantt to plan phases, dates, and dependencies visually.</span>
            <span>Use issues and site logs to keep drawing/site gaps out of chat threads.</span>
          </div>
        </section>
      </div>
    </section>
  );
}

function ProjectsView({ onDelete, onSave, projects }: { onDelete: (id: string) => void; onSave: (project: Project) => void; projects: Project[] }) {
  const [form, setForm] = useState<Project>(emptyProject);

  return (
    <section className="content-stack">
      <form className="work-surface form-surface" onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
        setForm(emptyProject());
      }}>
        <div className="surface-header">
          <div>
            <p className="eyebrow">{form.id ? "Edit Project" : "New Project"}</p>
            <h2>{form.id ? form.name : "Project setup"}</h2>
          </div>
          <button className="primary-button" type="submit">
            <Save size={17} aria-hidden="true" />
            Save
          </button>
        </div>
        <div className="form-grid">
          <Field label="Project"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="Client"><input value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} required /></Field>
          <Field label="Lead"><input value={form.lead} onChange={(event) => setForm({ ...form, lead: event.target.value })} required /></Field>
          <Field label="Budget"><input type="number" min="0" value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} /></Field>
          <Field label="Phase"><select value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value as Phase })}>{phases.map((phase) => <option key={phase}>{phase}</option>)}</select></Field>
          <Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>{projectStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
          <Field label="Start"><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
          <Field label="End"><input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></Field>
        </div>
        <div className="swatch-row">
          {colors.map((color) => (
            <button key={color} className={`swatch${form.color === color ? " is-active" : ""}`} style={{ background: color }} type="button" aria-label={`Use ${color}`} onClick={() => setForm({ ...form, color })} />
          ))}
        </div>
      </form>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Lead</th>
              <th>Phase</th>
              <th>Status</th>
              <th>Dates</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td><strong>{project.name}</strong><small>{project.client}</small></td>
                <td>{project.lead}</td>
                <td>{project.phase}</td>
                <td><Pill label={project.status} tone={project.status === "At Risk" ? "red" : project.status === "Complete" ? "blue" : "green"} /></td>
                <td>{formatDate(project.startDate)} - {formatDate(project.endDate)}</td>
                <td>
                  <div className="row-actions">
                    <button className="outline-button is-compact" type="button" onClick={() => setForm(project)}>Edit</button>
                    <button className="icon-action" type="button" aria-label={`Delete ${project.name}`} onClick={() => onDelete(project.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BoardView({
  onDelete,
  onProjectChange,
  onSave,
  projects,
  selectedProjectId,
  tasks
}: {
  onDelete: (id: string) => void;
  onProjectChange: (id: string) => void;
  onSave: (task: Task) => void;
  projects: Project[];
  selectedProjectId: string;
  tasks: Task[];
}) {
  const [form, setForm] = useState<Task>(emptyTask(selectedProjectId));

  useEffect(() => {
    setForm((current) => ({ ...current, projectId: selectedProjectId }));
  }, [selectedProjectId]);

  const moveTask = (task: Task, direction: 1 | -1) => {
    const index = taskStatuses.indexOf(task.status);
    const next = taskStatuses[Math.min(taskStatuses.length - 1, Math.max(0, index + direction))]!;
    onSave({ ...task, status: next });
  };

  return (
    <section className="content-stack">
      <ProjectPicker projects={projects} selectedProjectId={selectedProjectId} onChange={onProjectChange} />
      <form className="work-surface form-surface" onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
        setForm(emptyTask(selectedProjectId));
      }}>
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">Task Composer</p>
            <h2>Add kanban task</h2>
          </div>
          <button className="primary-button" type="submit"><Plus size={17} aria-hidden="true" />Task</button>
        </div>
        <div className="form-grid">
          <Field label="Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
          <Field label="Assignee"><input value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} /></Field>
          <Field label="Phase"><select value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value as Phase })}>{phases.map((phase) => <option key={phase}>{phase}</option>)}</select></Field>
          <Field label="Priority"><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
          <Field label="Start"><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
          <Field label="Due"><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field>
        </div>
      </form>
      <div className="kanban-board">
        {taskStatuses.map((status) => (
          <section className="kanban-column" key={status}>
            <div className="kanban-head">
              <strong>{status}</strong>
              <span>{tasks.filter((task) => task.status === status).length}</span>
            </div>
            {tasks.filter((task) => task.status === status).map((task) => (
              <article className="task-card" key={task.id}>
                <div className="card-title-row">
                  <strong>{task.title}</strong>
                  <Pill label={task.priority} tone={task.priority === "Critical" || task.priority === "High" ? "red" : "blue"} />
                </div>
                <p>{task.notes || task.phase}</p>
                <div className="task-meta">
                  <span>{task.assignee || "Unassigned"}</span>
                  <span>{formatDate(task.dueDate)}</span>
                </div>
                <div className="row-actions">
                  <button className="outline-button is-compact" type="button" onClick={() => moveTask(task, -1)} disabled={task.status === "To Do"}>Back</button>
                  <button className="outline-button is-compact" type="button" onClick={() => moveTask(task, 1)} disabled={task.status === "Done"}>Next</button>
                  <button className="icon-action" type="button" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task.id)}><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}

function GanttView({
  onProjectChange,
  projects,
  selectedProjectId,
  tasks
}: {
  onProjectChange: (id: string) => void;
  projects: Project[];
  selectedProjectId: string;
  tasks: Task[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const currentProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const items = tasks.length ? tasks : currentProject ? [{ ...emptyTask(currentProject.id), id: "placeholder", title: currentProject.name, phase: currentProject.phase, startDate: currentProject.startDate, dueDate: currentProject.endDate }] : [];
  const start = items.reduce((min, item) => (toDate(item.startDate) < toDate(min) ? item.startDate : min), items[0]?.startDate ?? today());
  const end = items.reduce((max, item) => (toDate(item.dueDate) > toDate(max) ? item.dueDate : max), items[0]?.dueDate ?? today());
  const totalDays = daysBetween(start, end);

  const exportPng = async () => {
    if (!chartRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#fffdf8", scale: 2 });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `urbanmistrii-gantt-${currentProject?.name.replace(/\s+/g, "-").toLowerCase() ?? "plan"}.png`;
    link.click();
  };

  return (
    <section className="content-stack">
      <div className="section-toolbar">
        <ProjectPicker projects={projects} selectedProjectId={selectedProjectId} onChange={onProjectChange} />
        <button className="primary-button" type="button" onClick={exportPng}>
          <FileDown size={17} aria-hidden="true" />
          PNG
        </button>
      </div>
      <section className="gantt-shell" ref={chartRef}>
        <div className="gantt-title">
          <div>
            <p className="eyebrow">Gantt Plan</p>
            <h2>{currentProject?.name ?? "Project timeline"}</h2>
          </div>
          <span>{formatDate(start)} - {formatDate(end)}</span>
        </div>
        <div className="gantt-scale">
          <span>{formatDate(start)}</span>
          <span>{totalDays} days</span>
          <span>{formatDate(end)}</span>
        </div>
        <div className="gantt-rows">
          {items.map((item) => {
            const left = Math.max(0, ((toDate(item.startDate) - toDate(start)) / 86_400_000 / totalDays) * 100);
            const width = Math.max(5, (daysBetween(item.startDate, item.dueDate) / totalDays) * 100);
            return (
              <div className="gantt-row" key={item.id}>
                <div className="gantt-label">
                  <strong>{item.title}</strong>
                  <small>{item.phase} / {item.assignee || "Team"}</small>
                </div>
                <div className="gantt-track">
                  <span className="gantt-bar" style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, background: currentProject?.color ?? "#4f6549" }}>{formatDate(item.dueDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function IssuesView({ issues, onDelete, onSave, projects }: { issues: Issue[]; onDelete: (id: string) => void; onSave: (issue: Issue) => void; projects: Project[] }) {
  const [form, setForm] = useState<Issue>(emptyIssue(projects[0]?.id));

  return (
    <section className="content-stack">
      <form className="work-surface form-surface" onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
        setForm(emptyIssue(projects[0]?.id));
      }}>
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">Drawing Review</p>
            <h2>Issue tracker</h2>
          </div>
          <button className="primary-button" type="submit"><Plus size={17} aria-hidden="true" />Issue</button>
        </div>
        <div className="form-grid">
          <Field label="Project"><select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
          <Field label="Issue"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
          <Field label="Drawing"><input value={form.drawing} onChange={(event) => setForm({ ...form, drawing: event.target.value })} placeholder="A-101" /></Field>
          <Field label="Owner"><input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></Field>
          <Field label="Severity"><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field>
          <Field label="Due"><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field>
        </div>
      </form>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Project</th>
              <th>Drawing</th>
              <th>Owner</th>
              <th>Severity</th>
              <th>Due</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td><strong>{issue.title}</strong><small>{issue.status}</small></td>
                <td>{projectName(projects, issue.projectId)}</td>
                <td>{issue.drawing || "Not set"}</td>
                <td>{issue.owner || "Team"}</td>
                <td><Pill label={issue.severity} tone={issue.severity === "Critical" || issue.severity === "High" ? "red" : "blue"} /></td>
                <td>{formatDate(issue.dueDate)}</td>
                <td>
                  <button className="icon-action" type="button" aria-label={`Delete ${issue.title}`} onClick={() => onDelete(issue.id)}><Trash2 size={16} aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LogsView({ logs, onDelete, onSave, projects }: { logs: SiteLog[]; onDelete: (id: string) => void; onSave: (log: SiteLog) => void; projects: Project[] }) {
  const [form, setForm] = useState<SiteLog>(emptyLog(projects[0]?.id));

  return (
    <section className="content-stack">
      <form className="work-surface form-surface" onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
        setForm(emptyLog(projects[0]?.id));
      }}>
        <div className="section-toolbar">
          <div>
            <p className="eyebrow">Site Record</p>
            <h2>Daily log</h2>
          </div>
          <button className="primary-button" type="submit"><Plus size={17} aria-hidden="true" />Log</button>
        </div>
        <div className="form-grid">
          <Field label="Project"><select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
          <Field label="Author"><input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} /></Field>
          <Field label="Manpower"><input type="number" min="0" value={form.manpower} onChange={(event) => setForm({ ...form, manpower: Number(event.target.value) })} /></Field>
          <Field label="Summary"><textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} rows={3} /></Field>
          <Field label="Blockers"><textarea value={form.blockers} onChange={(event) => setForm({ ...form, blockers: event.target.value })} rows={3} /></Field>
        </div>
      </form>
      <div className="log-grid">
        {logs.map((log) => (
          <article className="log-card" key={log.id}>
            <div className="surface-header">
              <div>
                <p className="eyebrow">{formatDate(log.date)}</p>
                <h2>{projectName(projects, log.projectId)}</h2>
              </div>
              <button className="icon-action" type="button" aria-label="Delete log" onClick={() => onDelete(log.id)}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
            <div className="detail-grid">
              <Detail label="Author" value={log.author || "Team"} />
              <Detail label="Manpower" value={log.manpower} />
              <Detail label="Summary" value={log.summary || "No summary"} wide />
              <Detail label="Blockers" value={log.blockers || "None"} wide />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectPicker({ onChange, projects, selectedProjectId }: { onChange: (id: string) => void; projects: Project[]; selectedProjectId: string }) {
  return (
    <label className="project-picker">
      <span>Project</span>
      <select value={selectedProjectId} onChange={(event) => onChange(event.target.value)}>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
    </label>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <article className="metric-card">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Pill({ label, tone }: { label: string; tone: "blue" | "green" | "red" }) {
  return <span className={`pill is-${tone}`}>{label}</span>;
}

function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className={`nav-button${active ? " is-active" : ""}`} type="button" onClick={onClick}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export default App;
