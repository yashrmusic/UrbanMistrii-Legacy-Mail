const fs = require("fs");
const https = require("https");
const path = require("path");

const root = path.join(__dirname, "..");
const key = "5b8f1689cff8ce83e94fc70e7f7e8bc4";
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const urlList = [...sitemap.matchAll(/<loc>(https:\/\/urbanmistrii\.com\/?[^<]*)<\/loc>/g)].map((match) => match[1]);
const body = JSON.stringify({
  host: "urbanmistrii.com",
  key,
  keyLocation: `https://urbanmistrii.com/${key}.txt`,
  urlList
});

const request = https.request({
  hostname: "api.indexnow.org",
  path: "/indexnow",
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  }
}, (response) => {
  let responseBody = "";
  response.on("data", (chunk) => { responseBody += chunk; });
  response.on("end", () => {
    if (response.statusCode === 200 || response.statusCode === 202) {
      console.log(`IndexNow accepted ${urlList.length} URLs (${response.statusCode}).`);
      return;
    }
    console.error(`IndexNow returned ${response.statusCode}: ${responseBody || "no response body"}`);
    process.exitCode = 1;
  });
});

request.on("error", (error) => {
  console.error(`IndexNow request failed: ${error.message}`);
  process.exitCode = 1;
});

request.end(body);
