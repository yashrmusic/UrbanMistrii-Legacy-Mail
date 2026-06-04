const workflows = [
  {
    id: "leave",
    title: "Leave and attendance",
    next: "Track staff leave submissions, review status, and keep payroll-related records aligned."
  },
  {
    id: "onboarding",
    title: "Onboarding",
    next: "Capture joining details, internal ownership, and account setup in one controlled onboarding workflow."
  },
  {
    id: "offboarding",
    title: "Offboarding",
    next: "Track exits, internal notes, and recovery steps through a single operational record."
  },
  {
    id: "payroll",
    title: "Payroll entries",
    next: "Record monthly working days, leave days, and claims before payroll review or export."
  }
];

const storageKey = "um_portal_draft_records";
const sessionKey = "um_portal_session";
const initialRecords = { leave: [], onboarding: [], offboarding: [], payroll: [] };
const tableMap = {
  leave: "leave_requests",
  onboarding: "onboarding_cases",
  offboarding: "offboarding_cases",
  payroll: "attendance_inputs"
};
const roleCapabilities = {
  team: {
    label: "Team member",
    workspace: "Team workspace",
    summary: "This workspace is tuned for personal requests, profile details, and the day-to-day records most team members actually need.",
    capabilities: [
      "View your own requests and records",
      "Submit leave and payroll inputs",
      "Review your profile and access status"
    ],
    tabs: ["dashboard", "requests", "profile", "leave", "payroll"],
    export: false,
    operations: false
  },
  hr: {
    label: "HR lead",
    workspace: "HR operations workspace",
    summary: "This workspace includes approvals, people visibility, onboarding, offboarding, and the operational records needed to keep internal systems moving.",
    capabilities: [
      "Review approvals and pending people actions",
      "Create onboarding and offboarding records",
      "Export internal operational records"
    ],
    tabs: ["dashboard", "requests", "profile", "approvals", "people", "activity", "documents", "leave", "onboarding", "offboarding", "payroll"],
    export: true,
    operations: true
  },
  admin: {
    label: "Studio admin",
    workspace: "Admin workspace",
    summary: "This workspace carries broad studio visibility across requests, people, payroll, and internal operations with export controls enabled.",
    capabilities: [
      "Oversee approvals, people, and payroll activity",
      "Open and track onboarding or offboarding cases",
      "Export records for reporting or handover"
    ],
    tabs: ["dashboard", "requests", "profile", "approvals", "people", "activity", "documents", "leave", "onboarding", "offboarding", "payroll"],
    export: true,
    operations: true
  },
  leadership: {
    label: "Leadership",
    workspace: "Leadership workspace",
    summary: "This workspace keeps a high-level operational view available without hiding the deeper team workflows that may need oversight.",
    capabilities: [
      "Review studio-wide operational signals",
      "Access approvals, people, and payroll context",
      "Export records when strategic review is needed"
    ],
    tabs: ["dashboard", "requests", "profile", "approvals", "people", "activity", "documents", "leave", "onboarding", "offboarding", "payroll"],
    export: true,
    operations: true
  }
};

let config = { provider: "draft", supportEmail: "hr@urbanmistrii.com" };
let session = null;
let currentUser = null;
let records = { ...initialRecords };
let currentRoleKey = "team";

const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const queue = document.querySelector("[data-queue]");
const priorityQueue = document.querySelector("[data-priority-queue]");
const authState = document.querySelector("[data-auth-state]");
const authCard = document.querySelector("[data-auth-card]");
const authForm = document.querySelector("[data-auth-form]");
const authMessage = document.querySelector("[data-auth-message]");
const authCopy = document.querySelector("[data-auth-copy]");
const signOutButton = document.querySelector("[data-sign-out]");
const googleSignInButton = document.querySelector("[data-google-sign-in]");
const workflowForms = document.querySelectorAll(".workflow-form");
const authRequiredBlocks = document.querySelectorAll("[data-requires-auth]");
const guestOnlyBlocks = document.querySelectorAll("[data-guest-only]");
const authHeading = document.querySelector("[data-auth-heading]");
const authTitle = document.querySelector("[data-auth-title]");
const authSubhead = document.querySelector("[data-auth-subhead]");
const personalRequests = document.querySelector("[data-personal-requests]");
const approvalsList = document.querySelector("[data-approvals]");
const peopleDirectory = document.querySelector("[data-people-directory]");
const calendarMarkers = document.querySelector("[data-calendar-markers]");
const activityFeed = document.querySelector("[data-activity-feed]");
const documentsCenter = document.querySelector("[data-documents-center]");
const roleScopedElements = document.querySelectorAll("[data-role-scope]");
const roleSummary = document.querySelector("[data-role-summary]");
const roleCapabilitiesList = document.querySelector("[data-role-capabilities]");
const workspaceLabel = document.querySelector("[data-workspace-label]");
const portalNotice = document.querySelector("[data-portal-notice]");
const controlInputs = document.querySelectorAll("[data-filter-input], [data-filter-status], [data-filter-role], [data-filter-workflow], [data-sort-select]");
const editorDialog = document.querySelector("[data-editor-dialog]");
const editorForm = document.querySelector("[data-editor-form]");
const editorFields = document.querySelector("[data-editor-fields]");
const editorTitle = document.querySelector("[data-editor-title]");
const editorMessage = document.querySelector("[data-editor-message]");

const controlState = {
  approvals: { query: "", status: "all", sort: "recent" },
  people: { query: "", role: "all", sort: "name" },
  activity: { query: "", workflow: "all", sort: "recent" }
};
let editorState = null;

const setMessage = (target, text, type = "") => {
  if (!target) return;
  target.textContent = text;
  target.classList.toggle("is-error", type === "error");
  target.classList.toggle("is-success", type === "success");
};

const setPortalNotice = (text = "", type = "") => {
  if (!portalNotice) return;
  portalNotice.hidden = !text;
  portalNotice.textContent = text;
  portalNotice.classList.toggle("is-error", type === "error");
};

const inferDisplayName = (email = "") => {
  const local = String(email).split("@")[0] || "team";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Team Member";
};

const inferRoleFromEmail = (email = "") => {
  const local = String(email).split("@")[0].toLowerCase();
  if (local === "hr") return "HR lead";
  if (local === "mail" || local === "admin") return "Studio admin";
  if (local.includes("founder") || local.includes("ritika")) return "Leadership";
  return "Team member";
};

const inferRoleKey = (email = "", profileRole = "") => {
  const seeded = `${email} ${profileRole}`.toLowerCase();
  if (seeded.includes("ritika") || seeded.includes("founder") || seeded.includes("leadership")) return "leadership";
  if (seeded.includes("hr")) return "hr";
  if (seeded.includes("admin") || seeded.includes("mail@")) return "admin";
  return "team";
};

const inferAccessMethod = (user) => {
  const provider = user?.app_metadata?.provider || user?.identities?.[0]?.provider || "";
  if (provider === "google") return "Google Workspace";
  if (provider === "email") return "Password login";
  return "Company account";
};

const formatDate = (value, options = {}) => {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: options.short ? undefined : "numeric"
  }).format(date);
};

const composeOnboardingNotes = (data) => {
  const parts = [];
  if (data.accessMethod) parts.push(`Access setup: ${data.accessMethod}`);
  if (data.notes) parts.push(data.notes);
  return parts.join("\n\n") || null;
};

const fieldSchemas = {
  leave: [
    { key: "name", label: "Name", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "type", label: "Leave type", type: "select", options: ["Casual", "Sick", "Emergency", "Unpaid"] },
    { key: "start", label: "Start date", type: "date" },
    { key: "end", label: "End date", type: "date" },
    { key: "reason", label: "Reason", type: "textarea", full: true }
  ],
  onboarding: [
    { key: "name", label: "Name", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "role", label: "Role", type: "text" },
    { key: "joining", label: "Joining date", type: "date" },
    { key: "manager", label: "Manager", type: "text" },
    { key: "accessMethod", label: "Access setup", type: "select", options: ["Google Workspace", "Password login"] },
    { key: "status", label: "Status", type: "select", options: ["Open", "In progress", "Complete", "Archived"] },
    { key: "notes", label: "Notes", type: "textarea", full: true }
  ],
  offboarding: [
    { key: "name", label: "Name", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "lastDay", label: "Last day", type: "date" },
    { key: "type", label: "Exit type", type: "select", options: ["Resignation", "Contract end", "Termination"] },
    { key: "status", label: "Status", type: "select", options: ["Open", "In progress", "Complete", "Archived"] },
    { key: "notes", label: "Checklist notes", type: "textarea", full: true }
  ],
  payroll: [
    { key: "name", label: "Name", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "month", label: "Month", type: "month" },
    { key: "workingDays", label: "Working days", type: "number" },
    { key: "leaveDays", label: "Leave days", type: "number" },
    { key: "expense", label: "Expense claim", type: "number" },
    { key: "status", label: "Status", type: "select", options: ["Draft", "Submitted", "Locked"] },
    { key: "notes", label: "Notes", type: "textarea", full: true }
  ]
};

const extractAccessMethod = (notes = "") => {
  const match = String(notes).match(/Access setup:\s*(.+)/);
  return match ? match[1].trim() : "";
};

const normalizeRecordStatus = (workflow, status = "") => {
  const value = String(status).trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const aliases = {
    leave: {
      awaiting_review: "pending",
      reviewed: "approved",
      needs_follow_up: "pending",
      approved: "approved",
      rejected: "rejected",
      cancelled: "cancelled",
      pending: "pending"
    },
    onboarding: {
      reviewed: "complete",
      needs_follow_up: "in_progress",
      in_progress: "in_progress",
      open: "open",
      complete: "complete",
      archived: "archived"
    },
    offboarding: {
      reviewed: "complete",
      needs_follow_up: "in_progress",
      in_progress: "in_progress",
      open: "open",
      complete: "complete",
      archived: "archived"
    },
    payroll: {
      reviewed: "locked",
      needs_follow_up: "submitted",
      ready_for_review: "submitted",
      draft: "draft",
      submitted: "submitted",
      locked: "locked"
    }
  };
  return aliases[workflow]?.[value] || value;
};

const displayStatus = (workflow, status = "") => {
  const value = normalizeRecordStatus(workflow, status);
  const labels = {
    pending: "Awaiting review",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    open: "Open",
    in_progress: "In progress",
    complete: "Complete",
    archived: "Archived",
    draft: "Draft",
    submitted: "Submitted",
    locked: "Locked"
  };
  return labels[value] || status || "Recorded";
};

const loadDraftRecords = () => {
  try {
    return { ...initialRecords, ...JSON.parse(localStorage.getItem(storageKey)) };
  } catch {
    return { ...initialRecords };
  }
};

const saveDraftRecords = () => {
  localStorage.setItem(storageKey, JSON.stringify(records));
};

const getEmailDomain = (email) => {
  const value = String(email || "").trim().toLowerCase();
  const parts = value.split("@");
  return parts.length === 2 ? parts[1] : "";
};

const isAllowedEmail = (email) => {
  const domain = getEmailDomain(email);
  return Boolean(domain) && (config.allowedEmailDomains || []).includes(domain);
};

const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
};

const saveSession = (nextSession) => {
  session = nextSession;
  if (nextSession) {
    localStorage.setItem(sessionKey, JSON.stringify(nextSession));
  } else {
    localStorage.removeItem(sessionKey);
  }
};

const normalizeSession = (payload) => {
  if (!payload?.access_token) return null;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000
  };
};

const parseAuthHash = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const expiresIn = Number(hash.get("expires_in") || 3600);
  if (!accessToken) return;

  saveSession({
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000
  });
  history.replaceState(null, "", window.location.pathname);
};

const setPortalAvailability = (enabled, signedIn = false) => {
  const interactive = enabled && signedIn;
  workflowForms.forEach((form) => {
    form.querySelectorAll("input, select, textarea, button").forEach((field) => {
      field.disabled = !interactive;
    });
  });
  if (authForm) {
    authForm.querySelectorAll("input, button").forEach((field) => {
      field.disabled = !enabled;
    });
  }
  document.querySelectorAll("[data-open], [data-export]").forEach((field) => {
    field.disabled = !interactive;
  });
};

const setAuthMode = (signedIn) => {
  document.body.classList.toggle("portal-guest", !signedIn);
  document.body.classList.toggle("portal-signed-in", signedIn);
  authRequiredBlocks.forEach((element) => {
    element.hidden = !signedIn;
  });
  guestOnlyBlocks.forEach((element) => {
    element.hidden = signedIn;
  });
  if (authHeading) {
    authHeading.textContent = signedIn ? "Private Operations" : "Team Access";
  }
  if (authTitle) {
    authTitle.textContent = signedIn ? "Internal operations dashboard" : "Sign in to the Urban Mistrii team portal";
  }
  if (authSubhead) {
    authSubhead.textContent = signedIn
      ? "Move between personal requests, team records, onboarding, and payroll from one secure workspace."
      : "Secure access to records, approvals, and internal workflows.";
  }
  setPortalAvailability(Boolean(config.portalEnabled), signedIn);
};

const getActiveRoleConfig = () => roleCapabilities[currentRoleKey] || roleCapabilities.team;

const canAccessTab = (tabId) => getActiveRoleConfig().tabs.includes(tabId);

const isOperationsRole = () => getActiveRoleConfig().operations;

const applyRoleVisibility = () => {
  const roleConfig = getActiveRoleConfig();

  roleScopedElements.forEach((element) => {
    const allowed = String(element.dataset.roleScope || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const visible = !allowed.length || allowed.includes(currentRoleKey);
    element.hidden = !visible;
  });

  tabs.forEach((tab) => {
    tab.hidden = !canAccessTab(tab.dataset.tab);
  });

  if (workspaceLabel) {
    workspaceLabel.textContent = roleConfig.workspace;
  }

  if (roleSummary) {
    roleSummary.textContent = roleConfig.summary;
  }

  if (roleCapabilitiesList) {
    roleCapabilitiesList.innerHTML = "";
    roleConfig.capabilities.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      roleCapabilitiesList.append(li);
    });
  }

  const activeTab = document.querySelector(".tab.is-active")?.dataset.tab || "dashboard";
  if (!canAccessTab(activeTab)) {
    activatePanel("dashboard");
  }
};

const supabaseFetch = async (path, options = {}) => {
  const { skipAuth = false, ...requestOptions } = options;
  const headers = {
    apikey: config.supabaseAnonKey,
    "Content-Type": "application/json",
    ...requestOptions.headers
  };

  if (!skipAuth && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...requestOptions,
    headers
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let detail = "";

    if (contentType.includes("application/json")) {
      try {
        const payload = await response.json();
        detail = payload.msg || payload.error_description || payload.error || payload.error_code || "";
      } catch {
        detail = "";
      }
    }

    if (!detail) {
      detail = await response.text();
    }

    throw new Error(detail || `Request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

const refreshSessionIfNeeded = async () => {
  if (config.provider !== "supabase" || !session?.refreshToken) return;
  if (!session?.expiresAt || session.expiresAt > Date.now() + 60_000) return;

  const payload = await supabaseFetch("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refreshToken }),
    skipAuth: true
  });

  const nextSession = normalizeSession(payload);
  if (nextSession) saveSession(nextSession);
};

const getCurrentUser = async () => {
  if (config.provider !== "supabase" || !session?.accessToken) return null;
  try {
    await refreshSessionIfNeeded();
    return await supabaseFetch("/auth/v1/user");
  } catch {
    saveSession(null);
    return null;
  }
};

const activatePanel = (id) => {
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === id));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === id));
};

const toDatabaseRecord = (workflow, data) => {
  if (workflow === "leave") {
    return {
      employee_name: data.name,
      employee_email: data.email,
      leave_type: data.type,
      start_date: data.start,
      end_date: data.end,
      reason: data.reason || null,
      ...(data.status ? { status: normalizeRecordStatus(workflow, data.status) } : {})
    };
  }

  if (workflow === "onboarding") {
    return {
      employee_name: data.name,
      employee_email: data.email,
      role_title: data.role || null,
      joining_date: data.joining || null,
      manager: data.manager || null,
      notes: composeOnboardingNotes(data),
      ...(data.status ? { status: normalizeRecordStatus(workflow, data.status) } : {})
    };
  }

  if (workflow === "offboarding") {
    return {
      employee_name: data.name,
      employee_email: data.email,
      last_day: data.lastDay || null,
      exit_type: data.type || null,
      notes: data.notes || null,
      ...(data.status ? { status: normalizeRecordStatus(workflow, data.status) } : {})
    };
  }

  return {
    employee_name: data.name,
    employee_email: data.email,
    month: data.month,
    working_days: Number(data.workingDays || 0),
    leave_days: Number(data.leaveDays || 0),
    expense_claim: Number(data.expense || 0),
    notes: data.notes || null,
    ...(data.status ? { status: normalizeRecordStatus(workflow, data.status) } : {})
  };
};

const fromDatabaseRecord = (workflow, row) => {
  if (workflow === "leave") {
    return {
      id: row.id,
      name: row.employee_name,
      email: row.employee_email,
      type: row.leave_type,
      start: row.start_date,
      end: row.end_date,
      reason: row.reason,
      status: displayStatus(workflow, row.status || "pending"),
      createdAt: row.created_at
    };
  }

  if (workflow === "onboarding") {
    return {
      id: row.id,
      name: row.employee_name,
      email: row.employee_email,
      role: row.role_title,
      joining: row.joining_date,
      manager: row.manager,
      accessMethod: extractAccessMethod(row.notes),
      status: displayStatus(workflow, row.status || "open"),
      createdAt: row.created_at
    };
  }

  if (workflow === "offboarding") {
    return {
      id: row.id,
      name: row.employee_name,
      email: row.employee_email,
      type: row.exit_type,
      lastDay: row.last_day,
      notes: row.notes,
      status: displayStatus(workflow, row.status || "open"),
      createdAt: row.created_at
    };
  }

  return {
    id: row.id,
    name: row.employee_name,
    email: row.employee_email,
    month: row.month,
    workingDays: row.working_days,
    leaveDays: row.leave_days,
    expense: row.expense_claim,
    notes: row.notes,
    status: displayStatus(workflow, row.status || "submitted"),
    createdAt: row.created_at
  };
};

const loadRemoteRecords = async () => {
  records = { ...initialRecords };
  if (config.provider !== "supabase" || !session?.accessToken) return;

  await Promise.all(Object.entries(tableMap).map(async ([workflow, table]) => {
    const rows = await supabaseFetch(`/rest/v1/${table}?select=*&order=created_at.desc&limit=50`);
    records[workflow] = rows.map((row) => fromDatabaseRecord(workflow, row));
  }));
};

const sendWorkflowNotification = async (workflow, data) => {
  if (!session?.accessToken) {
    throw new Error("Please sign in again before submitting.");
  }

  const response = await fetch("/api/portal-notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`
    },
    body: JSON.stringify({ workflow, payload: data })
  });

  if (!response.ok) {
    let detail = "The request was saved, but notification email could not be sent.";
    try {
      const payload = await response.json();
      detail = payload.error || detail;
    } catch {}
    throw new Error(detail);
  }
};

const submitWorkflow = async (workflow, data) => {
  if (config.provider === "supabase") {
    const user = await getCurrentUser();
    if (!user) throw new Error("Please sign in before submitting.");

    await supabaseFetch(`/rest/v1/${tableMap[workflow]}`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(toDatabaseRecord(workflow, data))
    });
    await loadRemoteRecords();
    try {
      await sendWorkflowNotification(workflow, data);
      return { notified: true };
    } catch (error) {
      return { notified: false, warning: error.message };
    }
  }

  records[workflow].unshift({ ...data, createdAt: new Date().toISOString() });
  saveDraftRecords();
  return { notified: false, warning: "Saved locally. Email notifications are only sent from the live portal." };
};

const formatRecord = (workflow, record) => {
  const status = record.status ? ` / ${record.status}` : "";
  if (workflow === "leave") {
    return `${record.type || "Leave"} from ${formatDate(record.start, { short: true })} to ${formatDate(record.end, { short: true })}${status}`;
  }
  if (workflow === "onboarding") {
    const access = record.accessMethod ? ` / ${record.accessMethod}` : "";
    return `${record.role || "Joining role"} / ${formatDate(record.joining, { short: true })}${access}${status}`;
  }
  if (workflow === "offboarding") {
    return `${record.type || "Exit"} / ${formatDate(record.lastDay, { short: true })}${status}`;
  }
  return `${record.month || "Month"} / ${record.workingDays || 0} working days / ${record.leaveDays || 0} leave days${status}`;
};

const renderCollection = (target, items, emptyText, buildItem) => {
  if (!target) return;
  target.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    target.append(empty);
    return;
  }

  items.forEach((item) => {
    target.append(buildItem(item));
  });
};

const recordArticle = (titleText, bodyText) => {
  const article = document.createElement("article");
  const title = document.createElement("h3");
  const body = document.createElement("p");
  title.textContent = titleText;
  body.textContent = bodyText;
  article.append(title, body);
  return article;
};

const createActionButton = (label, onClick, tone = "") => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mini-action${tone ? ` ${tone}` : ""}`;
  button.textContent = label;
  button.addEventListener("click", async () => {
    try {
      await onClick();
      setPortalNotice("");
    } catch (error) {
      setPortalNotice(error?.message || "Action could not be completed.", "error");
    }
  });
  return button;
};

const exportRecords = (workflow = "all", format = "json") => {
  const payload = workflow === "all" ? records : { [workflow]: records[workflow] || [] };
  if (format === "json") {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `urbanmistrii-${workflow}-records-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const rows = (records[workflow] || []).map((item) => ({ ...item }));
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `urbanmistrii-${workflow}-records-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const renderEditorFields = (workflow, record) => {
  if (!editorFields) return;
  editorFields.innerHTML = "";

  (fieldSchemas[workflow] || []).forEach((field) => {
    const label = document.createElement("label");
    if (field.full) label.classList.add("full");
    const span = document.createElement("span");
    span.textContent = field.label;
    let control;

    if (field.type === "select") {
      control = document.createElement("select");
      field.options.forEach((option) => {
        const node = document.createElement("option");
        node.value = option;
        node.textContent = option;
        control.append(node);
      });
    } else if (field.type === "textarea") {
      control = document.createElement("textarea");
      control.rows = 4;
    } else {
      control = document.createElement("input");
      control.type = field.type;
      if (field.type === "number") {
        control.step = "0.5";
        control.min = "0";
      }
    }

    control.name = field.key;
    control.value = record[field.key] ?? "";
    label.append(span, control);
    editorFields.append(label);
  });
};

const openRecordEditor = (workflow, record) => {
  if (!isOperationsRole() || !editorDialog || !editorForm) return;
  editorState = { workflow, record };
  if (editorTitle) {
    editorTitle.textContent = `Edit ${workflow.charAt(0).toUpperCase()}${workflow.slice(1)} record`;
  }
  setMessage(editorMessage, "");
  renderEditorFields(workflow, record);
  editorDialog.showModal();
};

const closeRecordEditor = () => {
  editorState = null;
  if (editorDialog?.open) editorDialog.close();
  if (editorFields) editorFields.innerHTML = "";
  setMessage(editorMessage, "");
};

const persistRecordUpdate = async (workflow, originalRecord, nextData) => {
  const nextRecord = { ...originalRecord, ...nextData };
  if (config.provider === "supabase" && originalRecord.id) {
    await supabaseFetch(`/rest/v1/${tableMap[workflow]}?id=eq.${originalRecord.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(toDatabaseRecord(workflow, nextRecord))
    });
    await loadRemoteRecords();
    return;
  }

  const target = records[workflow]?.find((item) => item.id === originalRecord.id || item.createdAt === originalRecord.createdAt);
  if (target) {
    Object.assign(target, nextRecord);
    saveDraftRecords();
  }
};

const getPersonalRecords = () => {
  const email = currentUser?.email || "";
  if (!email) return [];

  return Object.entries(records).flatMap(([workflow, items]) =>
    items
      .filter((item) => String(item.email || "").toLowerCase() === email.toLowerCase())
      .map((item) => ({ workflow, ...item }))
  ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const getVisibleWorkflowRecords = (workflow) => {
  const items = records[workflow] || [];
  if (isOperationsRole()) return items;
  const email = String(currentUser?.email || "").toLowerCase();
  if (!email) return [];
  return items.filter((item) => String(item.email || "").toLowerCase() === email);
};

const getPeopleDirectory = () => {
  if (!isOperationsRole()) {
    const email = currentUser?.email || "";
    if (!email) return [];
    return [{
      email,
      name: inferDisplayName(email),
      role: inferRoleFromEmail(email),
      accessMethod: inferAccessMethod(currentUser),
      manager: records.onboarding.find((item) => String(item.email || "").toLowerCase() === email.toLowerCase())?.manager || ""
    }];
  }

  const map = new Map();
  const pushPerson = (email, data = {}) => {
    if (!email) return;
    const key = String(email).toLowerCase();
    const existing = map.get(key) || {};
    map.set(key, { ...existing, email, ...data });
  };

  if (currentUser?.email) {
    pushPerson(currentUser.email, {
      name: inferDisplayName(currentUser.email),
      role: inferRoleFromEmail(currentUser.email),
      accessMethod: inferAccessMethod(currentUser)
    });
  }

  records.onboarding.forEach((item) => {
    pushPerson(item.email, {
      name: item.name || inferDisplayName(item.email),
      role: item.role || inferRoleFromEmail(item.email),
      accessMethod: item.accessMethod || "Company account",
      manager: item.manager || ""
    });
  });

  ["leave", "offboarding", "payroll"].forEach((workflow) => {
    records[workflow].forEach((item) => {
      pushPerson(item.email, {
        name: item.name || inferDisplayName(item.email),
        role: inferRoleFromEmail(item.email)
      });
    });
  });

  let items = [...map.values()];
  const { query, role, sort } = controlState.people;
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) {
    items = items.filter((item) =>
      `${item.name} ${item.email} ${item.role} ${item.accessMethod} ${item.manager || ""}`.toLowerCase().includes(normalizedQuery)
    );
  }
  if (role !== "all") {
    items = items.filter((item) => inferRoleKey(item.email || "", item.role || "") === role);
  }

  items.sort((a, b) => {
    if (sort === "email") return String(a.email || "").localeCompare(String(b.email || ""));
    if (sort === "role") return String(a.role || "").localeCompare(String(b.role || "")) || String(a.name || "").localeCompare(String(b.name || ""));
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return items;
};

const getPriorityItems = () => {
  const items = [];
  if (!currentUser?.email) return items;
  const roleConfig = getActiveRoleConfig();

  const personal = getPersonalRecords();
  if (!personal.length) {
    items.push({
      title: "Complete your first request",
      body: "Use the leave or payroll modules to create your first operational record."
    });
  }

  if (!records.onboarding.length) {
    items.push({
      title: "Prepare team onboarding records",
      body: "Create onboarding cases with role, joining date, manager, and access setup."
    });
  }

  if (roleConfig.operations && records.leave.some((item) => item.status === "Awaiting review")) {
    items.push({
      title: "Review pending leave requests",
      body: "Some leave records are waiting for operational confirmation."
    });
  }

  items.push(roleConfig.operations
    ? {
        title: "Keep payroll entries current",
        body: "Close out working days, leave days, and claims before monthly review."
      }
    : {
        title: "Keep your records current",
        body: "Use leave and payroll to keep your own monthly records aligned with operations."
      });

  return items.slice(0, 4);
};

const getApprovalItems = () => {
  if (!isOperationsRole()) return [];
  let items = Object.entries(records).flatMap(([workflow, items]) =>
    items.map((item) => ({
      workflow,
      record: item,
      title: item.name || item.email,
      body: formatRecord(workflow, item),
      status: item.status || "Pending"
    }))
  ).filter((item) => /awaiting|pending|progress|ready|follow-up/i.test(item.status));

  const { query, status, sort } = controlState.approvals;
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) {
    items = items.filter((item) =>
      `${item.title} ${item.body} ${item.workflow} ${item.status}`.toLowerCase().includes(normalizedQuery)
    );
  }
  if (status !== "all") {
    items = items.filter((item) => item.status.toLowerCase().includes(status));
  }

  items.sort((a, b) => {
    if (sort === "name") return a.title.localeCompare(b.title);
    if (sort === "workflow") return a.workflow.localeCompare(b.workflow) || a.title.localeCompare(b.title);
    return new Date(b.record.createdAt || 0) - new Date(a.record.createdAt || 0);
  });

  return items.slice(0, 24);
};

const getActivityItems = () => {
  if (!isOperationsRole()) return [];

  let items = Object.entries(records).flatMap(([workflow, items]) =>
    items.map((item) => ({
      workflow,
      title: item.name || item.email || "Internal record",
      status: item.status || "Recorded",
      timestamp: item.createdAt || "",
      body: formatRecord(workflow, item)
    }))
  );

  const { query, workflow, sort } = controlState.activity;
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) {
    items = items.filter((item) =>
      `${item.title} ${item.body} ${item.workflow} ${item.status}`.toLowerCase().includes(normalizedQuery)
    );
  }
  if (workflow !== "all") {
    items = items.filter((item) => item.workflow === workflow);
  }

  items.sort((a, b) => {
    if (sort === "workflow") return a.workflow.localeCompare(b.workflow) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    if (sort === "status") return a.status.localeCompare(b.status) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });

  return items.slice(0, 30);
};

const getDocumentEntries = () => {
  if (!isOperationsRole()) return [];

  return [
    {
      title: "Portal record export",
      body: "Download the current operational record set for reporting, archive, or internal review.",
      action: "Export records",
      type: "button"
    },
    {
      title: "Studio portfolio PDF",
      body: "Approved outward-facing portfolio reference for studio sharing and partner conversations.",
      href: "/assets/urbanmistrii-portfolio.pdf",
      action: "Open portfolio",
      type: "link"
    },
    {
      title: "Published work and media references",
      body: "Use the press index as the current public reference set for verified publication coverage.",
      href: "/press",
      action: "Open press page",
      type: "link"
    },
    {
      title: "Project lead intake",
      body: "Review the public-facing lead intake route used for new project enquiries and qualification.",
      href: "/start-project",
      action: "Open intake page",
      type: "link"
    },
    {
      title: "Leave register CSV",
      body: "Export the current leave records in spreadsheet-friendly format for internal reporting.",
      action: "Export leave CSV",
      type: "csv",
      workflow: "leave"
    },
    {
      title: "Payroll register CSV",
      body: "Export payroll inputs in CSV format for monthly review and reconciliation.",
      action: "Export payroll CSV",
      type: "csv",
      workflow: "payroll"
    }
  ];
};

const updateRecordStatus = async (workflow, record, nextStatus) => {
  if (!isOperationsRole()) {
    throw new Error("You do not have access to change this status.");
  }

  if (config.provider === "supabase" && record.id) {
    await supabaseFetch(`/rest/v1/${tableMap[workflow]}?id=eq.${record.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: normalizeRecordStatus(workflow, nextStatus) })
    });
    await loadRemoteRecords();
    return;
  }

  const target = records[workflow]?.find((item) => item.id === record.id || item.createdAt === record.createdAt);
  if (target) {
    target.status = displayStatus(workflow, nextStatus);
    saveDraftRecords();
  }
};

const getCalendarMarkers = () => {
  const visibleEmail = String(currentUser?.email || "").toLowerCase();
  const markers = [];

  records.onboarding.forEach((item) => {
    if (item.joining && (isOperationsRole() || String(item.email || "").toLowerCase() === visibleEmail)) {
      markers.push({
        title: `${item.name || item.email} joining`,
        body: `Onboarding scheduled for ${formatDate(item.joining)}.`
      });
    }
  });

  records.leave.forEach((item) => {
    if (item.start && (isOperationsRole() || String(item.email || "").toLowerCase() === visibleEmail)) {
      markers.push({
        title: `${item.name || item.email} leave`,
        body: `${formatDate(item.start)} to ${formatDate(item.end)}.`
      });
    }
  });

  records.offboarding.forEach((item) => {
    if (item.lastDay && (isOperationsRole() || String(item.email || "").toLowerCase() === visibleEmail)) {
      markers.push({
        title: `${item.name || item.email} transition`,
        body: `Exit planning aligned around ${formatDate(item.lastDay)}.`
      });
    }
  });

  records.payroll.forEach((item) => {
    if (item.month && (isOperationsRole() || String(item.email || "").toLowerCase() === visibleEmail)) {
      markers.push({
        title: `Payroll close for ${item.month}`,
        body: `${item.name || item.email} payroll inputs recorded for review.`
      });
    }
  });

  return markers.slice(0, 8);
};

const populateIdentity = () => {
  const email = currentUser?.email || "name@urbanmistrii.com";
  const name = currentUser?.user_metadata?.full_name || inferDisplayName(email);
  const role = getActiveRoleConfig().label;
  const access = inferAccessMethod(currentUser);
  const profileMatch = records.onboarding.find((item) => String(item.email).toLowerCase() === email.toLowerCase());

  document.querySelectorAll("[data-current-name], [data-profile-name]").forEach((element) => {
    element.textContent = profileMatch?.name || name;
  });
  document.querySelectorAll("[data-current-email], [data-profile-email]").forEach((element) => {
    element.textContent = email;
  });
  document.querySelectorAll("[data-current-role], [data-profile-role]").forEach((element) => {
    element.textContent = profileMatch?.role || role;
  });
  document.querySelectorAll("[data-current-access], [data-profile-access]").forEach((element) => {
    element.textContent = profileMatch?.accessMethod || access;
  });
  document.querySelectorAll("[data-profile-manager]").forEach((element) => {
    element.textContent = profileMatch?.manager || "Assigned during onboarding";
  });
};

const renderWorkflowRecords = () => {
  Object.entries(records).forEach(([workflow]) => {
    const items = getVisibleWorkflowRecords(workflow);
    const target = document.querySelector(`[data-records="${workflow}"]`);
    const count = document.querySelector(`[data-count="${workflow}"]`);

    if (count) count.textContent = items.length;

    renderCollection(
      target,
      items,
      "No submissions yet.",
      (item) => {
        const article = document.createElement("article");
        const title = document.createElement("h3");
        const body = document.createElement("p");
        title.textContent = item.name || item.email || "Untitled";
        body.textContent = formatRecord(workflow, item);
        article.append(title, body);

        if (isOperationsRole()) {
          const controls = document.createElement("div");
          controls.className = "inline-actions";
          controls.append(createActionButton("Edit", async () => {
            openRecordEditor(workflow, item);
          }, "is-secondary"));
          article.append(controls);
        }

        return article;
      }
    );
  });
};

const renderOverviewCollections = () => {
  renderCollection(
    queue,
    workflows,
    "No workflow modules configured yet.",
    (item) => recordArticle(item.title, item.next)
  );

  renderCollection(
    priorityQueue,
    getPriorityItems(),
    "No priority items right now.",
    (item) => recordArticle(item.title, item.body)
  );

  renderCollection(
    personalRequests,
    getPersonalRecords(),
    "No personal requests have been recorded yet.",
    (item) => recordArticle(
      `${item.workflow.charAt(0).toUpperCase()}${item.workflow.slice(1)} / ${item.name || item.email}`,
      formatRecord(item.workflow, item)
    )
  );

  renderCollection(
    approvalsList,
    getApprovalItems(),
    "No pending items are waiting for review right now.",
    (item) => {
      const article = document.createElement("article");
      const title = document.createElement("h3");
      const body = document.createElement("p");
      const controls = document.createElement("div");
      title.textContent = item.title;
      body.textContent = item.body;
      controls.className = "inline-actions";
      controls.append(
        createActionButton("Mark reviewed", async () => {
          await updateRecordStatus(item.workflow, item.record, "Reviewed");
          renderAll();
          setPortalNotice("Status updated to Reviewed.");
        }),
        createActionButton("Needs follow-up", async () => {
          await updateRecordStatus(item.workflow, item.record, "Needs follow-up");
          renderAll();
          setPortalNotice("Status updated to Needs follow-up.");
        }, "is-secondary"),
        createActionButton("Edit", async () => {
          openRecordEditor(item.workflow, item.record);
        }, "is-secondary")
      );
      article.append(title, body, controls);
      return article;
    }
  );

  renderCollection(
    peopleDirectory,
    getPeopleDirectory(),
    "No team directory records yet.",
    (item) => {
      const article = document.createElement("article");
      const title = document.createElement("strong");
      const email = document.createElement("p");
      const meta = document.createElement("div");
      title.textContent = item.name || inferDisplayName(item.email);
      email.textContent = item.email;
      meta.className = "directory-meta";
      [item.role || "Team member", item.accessMethod || "Company account", item.manager ? `Manager: ${item.manager}` : ""]
        .filter(Boolean)
        .forEach((value) => {
          const span = document.createElement("span");
          span.textContent = value;
          meta.append(span);
        });
      article.append(title, email, meta);
      return article;
    }
  );

  renderCollection(
    calendarMarkers,
    getCalendarMarkers(),
    "Upcoming team activity markers will appear here once records are added.",
    (item) => recordArticle(item.title, item.body)
  );

  renderCollection(
    activityFeed,
    getActivityItems(),
    "No internal activity has been recorded yet.",
    (item) => {
      const article = document.createElement("article");
      const title = document.createElement("strong");
      const body = document.createElement("p");
      const meta = document.createElement("div");
      title.textContent = item.title;
      body.textContent = item.body;
      meta.className = "directory-meta";
      [item.workflow, item.status, item.timestamp ? formatDate(item.timestamp) : ""]
        .filter(Boolean)
        .forEach((value) => {
          const span = document.createElement("span");
          span.textContent = value;
          meta.append(span);
        });
      article.append(title, body, meta);
      return article;
    }
  );

  renderCollection(
    documentsCenter,
    getDocumentEntries(),
    "No internal references are available yet.",
    (item) => {
      const article = document.createElement("article");
      const title = document.createElement("strong");
      const body = document.createElement("p");
      const controls = document.createElement("div");
      title.textContent = item.title;
      body.textContent = item.body;
      controls.className = "inline-actions";

      if (item.type === "link") {
        const link = document.createElement("a");
        link.className = "mini-action link-action";
        link.href = item.href;
        link.textContent = item.action;
        if (item.href.startsWith("http") || item.href.endsWith(".pdf")) {
          link.target = "_blank";
          link.rel = "noreferrer";
        }
        controls.append(link);
      } else if (item.type === "csv") {
        controls.append(createActionButton(item.action, async () => {
          exportRecords(item.workflow, "csv");
        }));
      } else {
        controls.append(createActionButton(item.action, async () => {
          exportRecords("all", "json");
        }));
      }

      article.append(title, body, controls);
      return article;
    }
  );
};

const renderAll = () => {
  populateIdentity();
  renderWorkflowRecords();
  renderOverviewCollections();
};

const updateAuthUi = async () => {
  currentUser = await getCurrentUser();
  const email = currentUser?.email || "";
  const profileMatch = email
    ? records.onboarding.find((item) => String(item.email || "").toLowerCase() === email.toLowerCase())
    : null;
  currentRoleKey = currentUser ? inferRoleKey(email, profileMatch?.role) : "team";
  applyRoleVisibility();

  if (config.provider === "draft") {
    authState.textContent = config.portalEnabled ? "Unavailable" : "Closed";
    authCopy.textContent = config.portalEnabled
      ? "The sign-in service is not available at the moment. Please contact the Urban Mistrii admin team."
      : "This private dashboard is not available at the moment.";
    signOutButton.hidden = true;
    setAuthMode(false);
    applyRoleVisibility();
    return null;
  }

  if (currentUser && !isAllowedEmail(email)) {
    if (session?.accessToken) {
      try {
        await supabaseFetch("/auth/v1/logout?scope=local", { method: "POST" });
      } catch {}
    }
    currentUser = null;
    saveSession(null);
    authState.textContent = "Sign in required";
    authCard.classList.remove("is-signed-in");
    authCopy.textContent = `Use an approved company email ending in ${config.allowedEmailDomains.join(", ")}.`;
    signOutButton.hidden = true;
    setAuthMode(false);
    applyRoleVisibility();
    setMessage(authMessage, "This portal is limited to Urban Mistrii company accounts.", "error");
    return null;
  }

  if (currentUser) {
    authState.textContent = email;
    authCard.classList.add("is-signed-in");
    authCopy.textContent = "You are signed in. Internal records are being handled through the private operations system with controlled access.";
    signOutButton.hidden = false;
    setAuthMode(true);
    applyRoleVisibility();
    document.querySelectorAll("[data-prefill-email]").forEach((input) => {
      if (!input.value) input.value = email;
    });
    return currentUser;
  }

  authState.textContent = "Sign in required";
  authCard.classList.remove("is-signed-in");
  authCopy.textContent = "Sign in with your company Google account or your approved team email and password to access the private dashboard.";
  signOutButton.hidden = true;
  setAuthMode(false);
  applyRoleVisibility();
  return null;
};

const signInWithPassword = async (email, password) => {
  if (!config.portalEnabled) {
    setMessage(authMessage, "Portal access is currently unavailable.", "error");
    return;
  }

  if (!isAllowedEmail(email)) {
    setMessage(authMessage, `Use an approved company email ending in ${config.allowedEmailDomains.join(", ")}.`, "error");
    return;
  }

  if (config.provider !== "supabase") {
    setMessage(authMessage, "The sign-in service is currently unavailable. Please contact the Urban Mistrii admin team.", "error");
    return;
  }

  const payload = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email, password })
  });

  const nextSession = normalizeSession(payload);
  if (!nextSession) {
    throw new Error("Sign-in succeeded, but the session payload was incomplete.");
  }

  saveSession(nextSession);
  await updateAuthUi();
  await loadRemoteRecords();
  renderAll();
  activatePanel("dashboard");
  setMessage(authMessage, "Signed in.", "success");
};

const signInWithGoogle = async () => {
  if (!config.portalEnabled) {
    setMessage(authMessage, "Portal access is currently unavailable.", "error");
    return;
  }

  if (config.provider !== "supabase") {
    setMessage(authMessage, "The sign-in service is currently unavailable. Please contact the Urban Mistrii admin team.", "error");
    return;
  }

  const target = `${config.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(config.emailRedirectTo)}`;
  window.location.assign(target);
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => activatePanel(tab.dataset.tab));
});

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => activatePanel(button.dataset.open));
});

controlInputs.forEach((input) => {
  input.addEventListener("input", () => {
    const panel = input.dataset.filterInput || input.dataset.filterStatus || input.dataset.filterRole || input.dataset.filterWorkflow || input.dataset.sortSelect;
    if (!panel || !controlState[panel]) return;

    if (input.dataset.filterInput) controlState[panel].query = input.value;
    if (input.dataset.filterStatus) controlState[panel].status = input.value;
    if (input.dataset.filterRole) controlState[panel].role = input.value;
    if (input.dataset.filterWorkflow) controlState[panel].workflow = input.value;
    if (input.dataset.sortSelect) controlState[panel].sort = input.value;

    renderOverviewCollections();
  });

  input.addEventListener("change", () => {
    input.dispatchEvent(new Event("input"));
  });
});

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  setMessage(authMessage, "Signing in...");
  try {
    await signInWithPassword(email, password);
  } catch (error) {
    const detail = String(error?.message || "").trim();
    const lowered = detail.toLowerCase();
    const friendly = lowered.includes("invalid login credentials")
      ? "Incorrect email or password. Check your credentials and try again."
      : lowered.includes("email not confirmed")
        ? "This account has not been confirmed yet. Ask HR to complete the account setup."
        : detail || "Could not sign in. Check portal credentials and Supabase auth settings.";
    setMessage(authMessage, friendly, "error");
  }
});

googleSignInButton?.addEventListener("click", async () => {
  setMessage(authMessage, "Redirecting to Google...");
  try {
    await signInWithGoogle();
  } catch {
    setMessage(authMessage, "Google sign-in could not be started. Check Supabase Google provider settings.", "error");
  }
});

signOutButton?.addEventListener("click", async () => {
  if (config.provider === "supabase" && session?.accessToken) {
    try {
      await supabaseFetch("/auth/v1/logout?scope=local", { method: "POST" });
    } catch {}
  }

  currentUser = null;
  saveSession(null);
  records = loadDraftRecords();
  await updateAuthUi();
  renderAll();
  activatePanel("dashboard");
  setMessage(authMessage, "Signed out.", "success");
});

document.querySelectorAll(".workflow-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const workflow = form.dataset.workflow;
    const message = form.querySelector("[data-form-message]");
    const data = Object.fromEntries(new FormData(form).entries());

    setMessage(message, "Saving...");
    try {
      if (!config.portalEnabled) {
        throw new Error("Portal access is currently unavailable.");
      }
      if (!isAllowedEmail(data.email)) {
        throw new Error(`Use an approved company email ending in ${config.allowedEmailDomains.join(", ")}.`);
      }

      const result = await submitWorkflow(workflow, data);
      form.reset();
      await updateAuthUi();
      document.querySelectorAll("[data-prefill-email]").forEach((input) => {
        if (!input.value && currentUser?.email) input.value = currentUser.email;
      });
      renderAll();
      const successMessage = result?.warning
        ? `Saved. ${result.warning}`
        : "Saved and shared with the Urban Mistrii team inbox.";
      setMessage(message, successMessage, "success");
    } catch (error) {
      setMessage(message, error.message || "Could not save this record.", "error");
    }
  });
});

document.querySelector("[data-export]")?.addEventListener("click", () => {
  exportRecords("all", "json");
});

editorForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editorState) return;
  const payload = Object.fromEntries(new FormData(editorForm).entries());
  setMessage(editorMessage, "Saving...");
  try {
    await persistRecordUpdate(editorState.workflow, editorState.record, payload);
    renderAll();
    closeRecordEditor();
    setPortalNotice("Record updated.");
  } catch (error) {
    setMessage(editorMessage, error?.message || "Could not save changes.", "error");
  }
});

document.querySelector("[data-editor-close]")?.addEventListener("click", closeRecordEditor);
document.querySelector("[data-editor-cancel]")?.addEventListener("click", closeRecordEditor);

const boot = async () => {
  parseAuthHash();
  session = loadSession();
  records = loadDraftRecords();

  try {
    const response = await fetch("/portal-config.json", { cache: "no-store" });
    config = await response.json();
  } catch {
    config = { provider: "draft", supportEmail: "hr@urbanmistrii.com" };
  }

  setPortalAvailability(Boolean(config.portalEnabled), false);

  await updateAuthUi();

  try {
    await loadRemoteRecords();
  } catch {
    setMessage(authMessage, "Signed in, but records could not load. Check database schema and row access settings.", "error");
  }

  renderAll();
  activatePanel("dashboard");
};

boot();
