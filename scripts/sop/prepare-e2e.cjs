"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../.."),
  target = path.join(root, ".sop-emulator");
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(
  path.join(target, "package.json"),
  JSON.stringify(
    {
      name: "shrimply-sop-emulator",
      private: true,
      main: "index.js",
      engines: { node: "22" },
      dependencies: {
        "firebase-admin": "^14.2.0",
        "firebase-functions": "^7.3.2",
      },
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(target, "index.js"),
  `const admin=require(${JSON.stringify(path.join(root, "functions/firebaseAdmin.js"))});admin.initializeApp();Object.assign(exports,require(${JSON.stringify(path.join(root, "functions/sop/index.js"))}));\n`,
);
const modules = path.join(target, "node_modules");
if (!fs.existsSync(modules))
  fs.symlinkSync(path.join(root, "functions/node_modules"), modules, "dir");
// No provider request is exercised by browser acceptance. Automatic AI decisions remain off.
fs.writeFileSync(
  path.join(target, ".secret.local"),
  "MODEL_API_KEY=local-emulator-only\n",
);
fs.writeFileSync(
  path.join(target, ".env.local"),
  "SOP_NARRATIVE_CALIBRATED=false\nSOP_NARRATIVE_CALIBRATION_ID=\n",
);
console.log("Prepared an isolated SOP-only emulator codebase.");
