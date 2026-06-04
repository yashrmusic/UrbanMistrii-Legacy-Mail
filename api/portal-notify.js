const DEFAULT_RECIPIENTS = ["mail@urbanmistrii.com", "hr@urbanmistrii.com"];
const ALLOWED_WORKFLOWS = new Set(["leave", "onboarding", "offboarding", "payroll"]);
const ALLOWED_DOMAINS = (process.env.PORTAL_ALLOWED_EMAIL_DOMAINS || "urbanmistrii.com")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const subjectByWorkflow = {
  leave: "New leave request / Urban Mistrii portal",
  onboarding: "New onboarding case / Urban Mistrii portal",
  offboarding: "New offboarding case / Urban Mistrii portal",
  payroll: "New payroll entry / Urban Mistrii portal"
};

const buildSummary = (workflow, payload) => {
  if (workflow === "leave") {
    return [
      `Name: ${payload.name || "-"}`,
      `Email: ${payload.email || "-"}`,
      `Leave type: ${payload.type || "-"}`,
      `Start date: ${payload.start || "-"}`,
      `End date: ${payload.end || "-"}`,
      `Reason: ${payload.reason || "-"}`
    ];
  }

  if (workflow === "onboarding") {
    return [
      `Name: ${payload.name || "-"}`,
      `Email: ${payload.email || "-"}`,
      `Role: ${payload.role || "-"}`,
      `Joining date: ${payload.joining || "-"}`,
      `Manager: ${payload.manager || "-"}`,
      `Access setup: ${payload.accessMethod || "-"}`,
      `Notes: ${payload.notes || "-"}`
    ];
  }

  if (workflow === "offboarding") {
    return [
      `Name: ${payload.name || "-"}`,
      `Email: ${payload.email || "-"}`,
      `Last day: ${payload.lastDay || "-"}`,
      `Exit type: ${payload.type || "-"}`,
      `Notes: ${payload.notes || "-"}`
    ];
  }

  return [
    `Name: ${payload.name || "-"}`,
    `Email: ${payload.email || "-"}`,
    `Month: ${payload.month || "-"}`,
    `Working days: ${payload.workingDays || "-"}`,
    `Leave days: ${payload.leaveDays || "-"}`,
    `Expense claim: ${payload.expense || "-"}`,
    `Notes: ${payload.notes || "-"}`
  ];
};

const getRecipients = () => {
  const value = process.env.PORTAL_NOTIFICATION_RECIPIENTS || DEFAULT_RECIPIENTS.join(",");
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};

const getEmailDomain = (email = "") => {
  const parts = String(email).trim().toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
};

const ensureAllowedWorkflow = (workflow) => {
  if (!ALLOWED_WORKFLOWS.has(workflow)) {
    const error = new Error("Unsupported workflow");
    error.statusCode = 400;
    throw error;
  }
};

const isPrivilegedEmail = (email = "") => {
  const normalized = String(email).trim().toLowerCase();
  return normalized === "mail@urbanmistrii.com" || normalized === "hr@urbanmistrii.com";
};

const ensurePayloadShape = (workflow, payload, actorEmail) => {
  if (!payload || typeof payload !== "object") {
    const error = new Error("Missing request payload");
    error.statusCode = 400;
    throw error;
  }

  const baseEmail = String(payload.email || "").trim().toLowerCase();
  if (!baseEmail || !ALLOWED_DOMAINS.includes(getEmailDomain(baseEmail))) {
    const error = new Error("Request email is not allowed");
    error.statusCode = 403;
    throw error;
  }

  if (!isPrivilegedEmail(actorEmail) && baseEmail !== String(actorEmail || "").trim().toLowerCase()) {
    const error = new Error("Request email must match the signed-in account");
    error.statusCode = 403;
    throw error;
  }

  if (workflow === "leave" && (!payload.start || !payload.end || !payload.type)) {
    const error = new Error("Leave requests must include leave type and dates");
    error.statusCode = 400;
    throw error;
  }
  if (workflow === "onboarding" && (!payload.role || !payload.accessMethod)) {
    const error = new Error("Onboarding requests must include role and access setup");
    error.statusCode = 400;
    throw error;
  }
  if (workflow === "offboarding" && !payload.type) {
    const error = new Error("Offboarding requests must include exit type");
    error.statusCode = 400;
    throw error;
  }
  if (workflow === "payroll" && !payload.month) {
    const error = new Error("Payroll requests must include month");
    error.statusCode = 400;
    throw error;
  }
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) {
    const error = new Error("Supabase auth configuration is missing");
    error.statusCode = 500;
    throw error;
  }
  return { url, anonKey };
};

const verifySession = async (token) => {
  if (!token) {
    const error = new Error("Missing session token");
    error.statusCode = 401;
    throw error;
  }

  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = new Error("Session verification failed");
    error.statusCode = 401;
    throw error;
  }

  const user = await response.json();
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email || !ALLOWED_DOMAINS.includes(getEmailDomain(email))) {
    const error = new Error("Portal session is not allowed");
    error.statusCode = 403;
    throw error;
  }

  return user;
};

const sendNotification = async (recipient, workflow, payload) => {
  const formData = new FormData();
  formData.set("_subject", subjectByWorkflow[workflow] || "New internal portal request / Urban Mistrii");
  formData.set("_template", "table");
  formData.set("_captcha", "false");
  formData.set("workflow", workflow);
  formData.set("submitted_at", new Date().toISOString());
  formData.set("summary", buildSummary(workflow, payload).join("\n"));

  Object.entries(payload || {}).forEach(([key, value]) => {
    formData.set(key, value == null ? "" : String(value));
  });

  const response = await fetch(`https://formsubmit.co/${encodeURIComponent(recipient)}`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const error = new Error(`Notification failed for ${recipient}`);
    error.statusCode = 502;
    throw error;
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { workflow, payload } = req.body || {};
    ensureAllowedWorkflow(workflow);
    const user = await verifySession(getTokenFromRequest(req));
    ensurePayloadShape(workflow, payload, user.email);

    const recipients = getRecipients();
    await Promise.all(recipients.map((recipient) => sendNotification(recipient, workflow, payload)));
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      ok: false,
      error: error?.message || "Could not send portal notification"
    });
  }
};
