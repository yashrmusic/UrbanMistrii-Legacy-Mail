const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const output = path.join(root, "public");

const config = {
  portalEnabled: process.env.PORTAL_ENABLED === "true",
  provider: process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? "supabase" : "draft",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  emailRedirectTo: process.env.PORTAL_EMAIL_REDIRECT_TO || "https://urbanmistrii.com/portal",
  supportEmail: process.env.PORTAL_SUPPORT_EMAIL || "hr@urbanmistrii.com",
  allowedEmailDomains: (process.env.PORTAL_ALLOWED_EMAIL_DOMAINS || "*").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean),
  portalMode: process.env.PORTAL_MODE || "closed"
};

const copyTargets = [
  ".well-known",
  "404.html",
  "about.html",
  "assets",
  "careers.html",
  "status.html",
  "faq.html",
  "humans.txt",
  "index.html",
  "commercial-interior-designers-delhi.html",
  "group-housing-architects-delhi.html",
  "restaurant-architects-delhi.html",
  "retail-interior-designers-delhi.html",
  "journal",
  "journal.html",
  "llms.txt",
  "process.html",
  "ritika-rakhiani.html",
  "portal.css",
  "portal.html",
  "portal.js",
  "press.html",
  "projects",
  "robots.txt",
  "open.html",
  "script.js",
  "sector-pages.css",
  "sectors.html",
  "sitemap.xml",
  "services.html",
  "start-project.html",
  "styles.css",
  "bd83858e8934102cb7f3af2f7d2f92d2.txt",
  "5b8f1689cff8ce83e94fc70e7f7e8bc4.txt",
  "thank-you.html"
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const target of copyTargets) {
  const source = path.join(root, target);
  const destination = path.join(output, target);
  if (fs.existsSync(source)) {
    fs.cpSync(source, destination, { recursive: true });
  }
}

function readObservabilityConfig() {
  try {
    return JSON.parse(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG || "{}");
  } catch {
    return {};
  }
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function dataAttributes(config, names) {
  return names
    .filter((name) => config[name] !== undefined && config[name] !== null)
    .map((name) => {
      const attribute = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      return ` data-${attribute}="${escapeAttribute(config[name])}"`;
    })
    .join("");
}

const observabilityConfig = readObservabilityConfig();
const analyticsConfig = observabilityConfig.analytics || {};
const speedInsightsConfig = observabilityConfig.speedInsights || {};
const analyticsScriptSrc = analyticsConfig.scriptSrc || "/_vercel/insights/script.js";
const speedInsightsScriptSrc = speedInsightsConfig.scriptSrc || "/_vercel/speed-insights/script.js";
const analyticsAttributes = dataAttributes(analyticsConfig, ["dsn", "endpoint", "viewEndpoint", "eventEndpoint", "sessionEndpoint"]);
const speedInsightsAttributes = dataAttributes(speedInsightsConfig, ["dsn", "endpoint"]);

const observabilitySnippet = `
    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
    </script>
    <script defer src="${escapeAttribute(analyticsScriptSrc)}"${analyticsAttributes}></script>
    <script defer src="${escapeAttribute(speedInsightsScriptSrc)}"${speedInsightsAttributes}></script>`;

function injectObservability(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    const relativePath = path.relative(output, filePath);

    if (entry.isDirectory()) {
      if (relativePath === "admin" || relativePath === "portal") continue;
      injectObservability(filePath);
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name) !== ".html" || relativePath === "portal.html") continue;

    const html = fs.readFileSync(filePath, "utf8");
    if (html.includes("/_vercel/insights/script.js") || !html.includes("</head>")) continue;
    fs.writeFileSync(filePath, html.replace("</head>", `${observabilitySnippet}\n  </head>`));
  }
}

injectObservability(output);

const serialized = `${JSON.stringify(config, null, 2)}\n`;
fs.writeFileSync(path.join(root, "portal-config.json"), serialized);
fs.writeFileSync(path.join(output, "portal-config.json"), serialized);

console.log(`Portal config written in ${config.provider} mode.`);
