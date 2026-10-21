/* Builds public/llms-full.txt: the readable text of every page in the
   sitemap, in one plain-text file, so AI assistants and answer engines can
   read the whole site in a single request. llms.txt links to it. Runs after
   write-portal-config.js, which recreates public/. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const output = path.join(root, "public");
const site = "https://urbanmistrii.com";

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", hellip: "…" };
const decode = (text) =>
  text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => entities[name.toLowerCase()] ?? m);

function pageText(html) {
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
  return decode(
    main
      .replace(/<(script|style|svg|noscript|form|nav)[\s\S]*?<\/\1>/gi, "")
      .replace(/<h([1-3])[^>]*>/gi, (_, level) => "\n\n" + "#".repeat(Number(level) + 1) + " ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<(p|div|section|article|figure|figcaption|blockquote|tr|dt|dd|br)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ([,.;:!?])/g, "$1")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const sections = [];
for (const url of urls) {
  const slug = url.replace(site, "").replace(/^\//, "") || "index";
  const file = path.join(root, `${slug}.html`);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [, slug])[1].trim());
  const description = decode((html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [, ""])[1]);
  sections.push(`## ${title}\n\nURL: ${url}\n${description ? `Summary: ${description}\n` : ""}\n${pageText(html)}`);
}

const header = fs.readFileSync(path.join(root, "llms.txt"), "utf8").trim();
const body = `${header}\n\n---\n\n# Full site text\n\nEvery public page of ${site}, in sitemap order.\n\n${sections.join("\n\n---\n\n")}\n`;

fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "llms-full.txt"), body);
console.log(`Wrote llms-full.txt for ${sections.length} pages (${Math.round(body.length / 1024)} KB).`);
