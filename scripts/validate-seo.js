const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sitemapPath = path.join(root, "sitemap.xml");
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const urls = [...sitemap.matchAll(/<loc>(https:\/\/urbanmistrii\.com\/?[^<]*)<\/loc>/g)].map((match) => match[1]);
const errors = [];
const titles = new Map();
const descriptions = new Map();
const pageSources = [];
const forbiddenPublicPhrases = [
  "search intent believable",
  "helps search understand",
  "this page is built to answer"
];

function pageFileFor(url) {
  const pathname = new URL(url).pathname.replace(/\/$/, "");
  return path.join(root, pathname ? `${pathname.slice(1)}.html` : "index.html");
}

function capture(html, expression) {
  return html.match(expression)?.[1]?.trim() || "";
}

function containsSchemaType(value, expectedType) {
  if (Array.isArray(value)) return value.some((entry) => containsSchemaType(entry, expectedType));
  if (!value || typeof value !== "object") return false;
  const type = value["@type"];
  if (type === expectedType || (Array.isArray(type) && type.includes(expectedType))) return true;
  return Object.values(value).some((entry) => containsSchemaType(entry, expectedType));
}

for (const url of urls) {
  const file = pageFileFor(url);
  if (!fs.existsSync(file)) {
    errors.push(`${url}: missing source file ${path.relative(root, file)}`);
    continue;
  }

  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  pageSources.push({ html, relative });
  const title = capture(html, /<title>([\s\S]*?)<\/title>/i);
  const description = capture(html, /<meta\s+name="description"\s+content="([^"]+)"/i);
  const canonical = capture(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
  const pathname = new URL(url).pathname;
  const isProjectPage = pathname.startsWith("/projects/") && pathname !== "/projects/case-studies";

  if (!title) errors.push(`${relative}: missing title`);
  if (!description) errors.push(`${relative}: missing meta description`);
  if (canonical !== url) errors.push(`${relative}: canonical is ${canonical || "missing"}; expected ${url}`);
  if (h1Count !== 1) errors.push(`${relative}: expected one h1, found ${h1Count}`);
  if (/name="robots"[^>]*content="[^"]*noindex/i.test(html)) errors.push(`${relative}: sitemap page is marked noindex`);
  if (/<img\b[^>]*\bsrc=["']\s*["']/i.test(html)) errors.push(`${relative}: image has an empty source`);
  for (const phrase of forbiddenPublicPhrases) {
    if (html.toLowerCase().includes(phrase)) errors.push(`${relative}: leaked internal SEO wording (${phrase})`);
  }

  if (title) {
    if (titles.has(title)) errors.push(`${relative}: duplicate title also used by ${titles.get(title)}`);
    titles.set(title, relative);
  }
  if (description) {
    if (descriptions.has(description)) errors.push(`${relative}: duplicate description also used by ${descriptions.get(description)}`);
    descriptions.set(description, relative);
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  const parsedJsonLd = [];
  if (jsonLdBlocks.length === 0) errors.push(`${relative}: missing JSON-LD`);
  for (const [, block] of jsonLdBlocks) {
    try {
      parsedJsonLd.push(JSON.parse(block));
    } catch (error) {
      errors.push(`${relative}: invalid JSON-LD (${error.message})`);
    }
  }

  const socialImage = capture(html, /<meta\s+property="og:image"\s+content="(https:\/\/urbanmistrii\.com\/assets\/[^"]+)"/i);
  if (isProjectPage && !socialImage) errors.push(`${relative}: project page is missing an Open Graph image`);
  if (isProjectPage && !parsedJsonLd.some((block) => containsSchemaType(block, "CreativeWork"))) {
    errors.push(`${relative}: project page is missing CreativeWork schema`);
  }
  if (socialImage) {
    const socialImageFile = path.join(root, new URL(socialImage).pathname.slice(1));
    if (!fs.existsSync(socialImageFile)) errors.push(`${relative}: Open Graph image is missing (${socialImage})`);
  }
}

for (const { html, relative } of pageSources) {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const href of hrefs) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const pathname = decodeURIComponent(href.split(/[?#]/)[0]).replace(/\/$/, "");
    if (pathname.startsWith("/api/")) continue;

    let target;
    if (!pathname) target = path.join(root, "index.html");
    else if (path.extname(pathname)) target = path.join(root, pathname.slice(1));
    else target = path.join(root, `${pathname.slice(1)}.html`);

    if (!fs.existsSync(target)) errors.push(`${relative}: broken internal link ${href}`);
  }
}

for (const imageUrl of [...sitemap.matchAll(/<image:loc>(https:\/\/urbanmistrii\.com\/assets\/[^<]+)<\/image:loc>/g)].map((match) => match[1])) {
  const imageFile = path.join(root, new URL(imageUrl).pathname.slice(1));
  if (!fs.existsSync(imageFile)) errors.push(`sitemap image missing: ${imageUrl}`);
}

const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
if (!/User-agent: OAI-SearchBot[\s\S]*?Allow: \//.test(robots)) errors.push("robots.txt: OAI-SearchBot is not explicitly allowed");
if (!robots.includes("Sitemap: https://urbanmistrii.com/sitemap.xml")) errors.push("robots.txt: canonical sitemap declaration is missing");

if (errors.length) {
  console.error(`SEO validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`SEO validation passed for ${urls.length} indexable pages.`);
