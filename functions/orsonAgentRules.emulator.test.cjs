const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, setDoc, getDoc } = require("firebase/firestore");
const { ref, uploadBytes, getBytes } = require("firebase/storage");
let env;
before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    "Emulators required",
  );
  env = await initializeTestEnvironment({
    projectId: "demo-shrimply-agent",
    firestore: {
      rules: fs.readFileSync(
        require("node:path").join(__dirname, "../firestore.rules"),
        "utf8",
      ),
    },
    storage: {
      rules: fs.readFileSync(
        require("node:path").join(__dirname, "../storage.rules"),
        "utf8",
      ),
    },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "companies/rules-farm"), {
      ownerId: "rules-owner",
      teamMembers: ["rules-owner", "rules-tech", "rules-other", "rules-denied"],
    });
    for (const [uid, role, overrides] of [
      ["rules-owner", "owner", {}],
      ["rules-tech", "technician", {}],
      ["rules-other", "manager", {}],
      ["rules-denied", "technician", { useOrson: false }],
    ])
      await setDoc(doc(db, `users/${uid}`), {
        companyId: "rules-farm",
        role,
        permissionOverrides: overrides,
      });
  });
});
after(async () => env?.cleanup());
test("clients cannot manufacture, edit or read operation receipts directly", async () => {
  const db = env.authenticatedContext("rules-owner").firestore();
  await assertFails(
    setDoc(doc(db, "companies/rules-farm/orsonOperations/forged"), {
      uid: "rules-owner",
      state: "completed",
    }),
  );
  await assertFails(
    getDoc(doc(db, "companies/rules-farm/orsonOperations/forged")),
  );
});
test("temporary documents require uploader ownership, company membership, Orson permission and safe MIME", async () => {
  const path = "companies/rules-farm/orsonTemp/rules-tech/upload";
  const owner = env.authenticatedContext("rules-tech").storage();
  await assertSucceeds(
    uploadBytes(ref(owner, path), new Uint8Array([1, 2]), {
      contentType: "image/png",
    }),
  );
  await assertFails(
    getBytes(ref(env.authenticatedContext("rules-other").storage(), path)),
  );
  await assertFails(
    uploadBytes(
      ref(env.authenticatedContext("rules-other").storage(), path),
      new Uint8Array([1]),
      { contentType: "image/png" },
    ),
  );
  await assertFails(
    uploadBytes(ref(owner, path + "-bad"), new Uint8Array([1]), {
      contentType: "text/html",
    }),
  );
  await assertFails(
    uploadBytes(
      ref(
        env.authenticatedContext("rules-denied").storage(),
        "companies/rules-farm/orsonTemp/rules-denied/upload",
      ),
      new Uint8Array([1]),
      { contentType: "image/png" },
    ),
  );
});
