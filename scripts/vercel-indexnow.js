const { spawnSync } = require("child_process");
const path = require("path");

if (process.env.VERCEL_ENV !== "production") {
  console.log("IndexNow skipped outside a Vercel production build.");
  process.exit(0);
}

const result = spawnSync(process.execPath, [path.join(__dirname, "submit-indexnow.js")], {
  stdio: "inherit"
});

if (result.status !== 0) {
  console.warn("IndexNow notification failed; the production deployment will continue.");
}
