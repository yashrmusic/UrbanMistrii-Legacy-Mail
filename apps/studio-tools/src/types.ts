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

export type ViewKey = "dashboard" | "projects" | "board" | "gantt" | "issues" | "logs";

export type Phase = "Schematic" | "DD" | "CD" | "Tender" | "Construction" | "Handover";
export type ProjectStatus = "Active" | "On Hold" | "At Risk" | "Complete";
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Done";
export type Priority = "Low" | "Medium" | "High" | "Critical";

export type Project = {
  id: string;
  name: string;
  client: string;
  lead: string;
  phase: Phase;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  color: string;
  budget: number;
  createdAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  assignee: string;
  phase: Phase;
  status: TaskStatus;
  priority: Priority;
  startDate: string;
  dueDate: string;
  notes: string;
};

export type Issue = {
  id: string;
  projectId: string;
  title: string;
  drawing: string;
  discipline: string;
  owner: string;
  severity: Priority;
  status: "Open" | "Review" | "Closed";
  dueDate: string;
};

export type SiteLog = {
  id: string;
  projectId: string;
  date: string;
  author: string;
  weather: string;
  manpower: number;
  summary: string;
  blockers: string;
};

export type StudioState = {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  logs: SiteLog[];
};
