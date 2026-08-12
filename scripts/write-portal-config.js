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
  "restaurant-architects-delhi.html",
  "journal",
  "journal.html",
  "llms.txt",
  "process.html",
  "portal.css",
  "portal.html",
  "portal.js",
  "press.html",
  "projects",
  "robots.txt",
  "open.html",
  "script.js",
  "sectors.html",
  "sitemap.xml",
  "services.html",
  "start-project.html",
  "styles.css",
  "bd83858e8934102cb7f3af2f7d2f92d2.txt",
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

const serialized = `${JSON.stringify(config, null, 2)}\n`;
fs.writeFileSync(path.join(root, "portal-config.json"), serialized);
fs.writeFileSync(path.join(output, "portal-config.json"), serialized);

console.log(`Portal config written in ${config.provider} mode.`);
