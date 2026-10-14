"use strict";
const { spawn } = require("node:child_process"),
  path = require("node:path");
const root = path.resolve(__dirname, "../..");
async function run(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`)),
    );
  });
}
(async () => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw new Error(
      "Run through test:sop:browser; real Firebase projects are not permitted.",
    );
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--port", "3017"],
    {
      cwd: path.join(root, "web"),
      stdio: "inherit",
      env: { ...process.env, NEXT_PUBLIC_ORSON_LOCAL_EMULATORS: "true" },
    },
  );
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null)
        throw new Error("Web server stopped before readiness.");
      try {
        if ((await fetch("http://localhost:3017/auth")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Web server did not become ready.");
    await run("scripts/sop/seed-browser.cjs");
    await run("scripts/sop/browser-check.cjs");
  } finally {
    server.kill("SIGTERM");
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
