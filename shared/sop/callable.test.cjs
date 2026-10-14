const { test } = require("node:test");
const assert = require("node:assert/strict");
const { initializeApp, deleteApp } = require("firebase/app");
const { getFunctions, httpsCallable } = require("firebase/functions");
const { callSopFunction } = require("./callable.ts");
const {
  SOP_ASSIST_CLIENT_TIMEOUT_MS,
  SOP_DOCUMENT_TIMEOUT_MS,
  SOP_ASSIST_TIMEOUT_SECONDS,
} = require("./timing.ts");

async function advance(t, milliseconds) {
  // Let the real Firebase SDK finish acquiring optional credentials before
  // advancing its timeout and the simulated server response.
  for (let i = 0; i < 30; i++) await Promise.resolve();
  t.mock.timers.tick(milliseconds);
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

test("the SDK reproduces the 70-second failure, while SOP AI accepts a five-minute document response", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = initializeApp(
    { projectId: "demo-sop-timeout", apiKey: "test" },
    "sop-timeout",
  );
  t.after(() => deleteApp(app));
  const functions = getFunctions(app);
  functions.fetchImpl = async () =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve(
            new Response(
              JSON.stringify({ data: { title: "Recovered draft" } }),
            ),
          ),
        300000,
      ),
    );
  const legacy = httpsCallable(functions, "assistSop")({});
  const rejected = assert.rejects(legacy, {
    code: "functions/deadline-exceeded",
  });
  await advance(t, 70000);
  await rejected;
  const repaired = callSopFunction(functions, "assistSop", {});
  await advance(t, 300000);
  assert.deepEqual(await repaired, { title: "Recovered draft" });
});

test("other SOP operations keep the normal timeout, while exhausted AI has a recoverable error", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const app = initializeApp(
    { projectId: "demo-sop-timeout", apiKey: "test" },
    "sop-timeout-errors",
  );
  t.after(() => deleteApp(app));
  const functions = getFunctions(app);
  functions.fetchImpl = async () => new Promise(() => {});
  const normal = assert.rejects(callSopFunction(functions, "sopCommand", {}), {
    code: "functions/deadline-exceeded",
  });
  await advance(t, 70000);
  await normal;
  const exhausted = assert.rejects(
    callSopFunction(functions, "assistSop", {}),
    /Try generating the draft again/,
  );
  await advance(t, SOP_ASSIST_CLIENT_TIMEOUT_MS);
  await exhausted;
});
test("a legacy saving endpoint cannot silently strip new document content", async (t) => {
  const app = initializeApp(
    { projectId: "demo-sop-content", apiKey: "test" },
    "sop-content-support",
  );
  t.after(() => deleteApp(app));
  const functions = getFunctions(app),
    actions = [];
  functions.fetchImpl = async (_, options) => {
    const action = JSON.parse(options.body).data.action;
    actions.push(action);
    return new Response(
      JSON.stringify({
        error: { status: "INVALID_ARGUMENT", message: "Unknown SOP command." },
      }),
      { status: 400 },
    );
  };
  const payload = {
    companyId: "farm",
    operationId: "op",
    action: "saveDraft",
    definition: { content: { sections: [] } },
  };
  await assert.rejects(
    callSopFunction(functions, "sopCommand", payload),
    /existing saved draft has not been changed/,
  );
  assert.deepEqual(actions, ["checkContentSupport"]);
  functions.fetchImpl = async (_, options) => {
    const action = JSON.parse(options.body).data.action;
    actions.push(action);
    return new Response(
      JSON.stringify({
        data:
          action === "checkContentSupport"
            ? { documentContentVersion: 1 }
            : { ok: true, sopId: "saved" },
      }),
    );
  };
  assert.deepEqual(await callSopFunction(functions, "sopCommand", payload), {
    ok: true,
    sopId: "saved",
  });
  assert.deepEqual(actions, [
    "checkContentSupport",
    "checkContentSupport",
    "saveDraft",
  ]);
});

test("older SOP services explain unavailable deletion without hiding other failures", async (t) => {
  const app = initializeApp(
    { projectId: "demo-sop-delete", apiKey: "test" },
    "sop-delete-errors",
  );
  t.after(() => deleteApp(app));
  const functions = getFunctions(app);
  const payload = {
    companyId: "farm",
    operationId: "delete-op",
    action: "deleteSop",
    sopId: "draft",
    expectedRevision: 1,
  };
  let status = "INVALID_ARGUMENT",
    message = "Unknown SOP command.";
  functions.fetchImpl = async () =>
    new Response(JSON.stringify({ error: { status, message } }), {
      status: 400,
    });
  for (const action of ["deleteSop", "restoreSop"])
    await assert.rejects(
      callSopFunction(functions, "sopCommand", { ...payload, action }),
      /service must be updated.*SOP has not been changed/,
    );
  message = "This SOP cannot be deleted.";
  await assert.rejects(callSopFunction(functions, "sopCommand", payload), {
    code: "functions/invalid-argument",
    message,
  });
  status = "PERMISSION_DENIED";
  message = "You may delete or restore your own drafts.";
  await assert.rejects(callSopFunction(functions, "sopCommand", payload), {
    code: "functions/permission-denied",
    message,
  });
  functions.fetchImpl = async (_, options) => {
    assert.deepEqual(JSON.parse(options.body).data, payload);
    return new Response(JSON.stringify({ data: { ok: true, sopId: "draft" } }));
  };
  assert.deepEqual(await callSopFunction(functions, "sopCommand", payload), {
    ok: true,
    sopId: "draft",
  });
});

test("document conversion budgets leave callable and client time for validation and delivery", () => {
  assert.ok(SOP_DOCUMENT_TIMEOUT_MS > 300000);
  assert.ok(SOP_ASSIST_TIMEOUT_SECONDS * 1000 > SOP_DOCUMENT_TIMEOUT_MS);
  assert.ok(SOP_ASSIST_CLIENT_TIMEOUT_MS > SOP_ASSIST_TIMEOUT_SECONDS * 1000);
});

test("delete calls use the dedicated endpoint and restore stays on the command service", async (t) => {
  const app = initializeApp(
    { projectId: "demo-sop-delete", apiKey: "test" },
    "sop-delete-endpoint",
  );
  t.after(() => deleteApp(app));
  const functions = getFunctions(app),
    urls = [];
  functions.fetchImpl = async (url) => {
    urls.push(String(url));
    return new Response(JSON.stringify({ data: { ok: true, sopId: "draft" } }));
  };
  await callSopFunction(functions, "sopCommand", {
    action: "deleteSop",
    sopId: "draft",
  });
  await callSopFunction(functions, "sopCommand", {
    action: "restoreSop",
    sopId: "draft",
  });
  assert.ok(urls[0].endsWith("/deleteSop"));
  assert.ok(urls[1].endsWith("/sopCommand"));
});

test("staged deletion retries the same operation without retrying an access denial", async (t) => {
  const app = initializeApp(
    { projectId: "demo-sop-delete", apiKey: "test" },
    "sop-delete-fallback",
  );
  t.after(() => deleteApp(app));
  const functions = getFunctions(app),
    calls = [];
  const payload = {
    action: "deleteSop",
    companyId: "farm",
    sopId: "draft",
    expectedRevision: 4,
    operationId: "delete-replay-safe",
  };
  functions.fetchImpl = async (url, options) => {
    calls.push({ url: String(url), data: JSON.parse(options.body).data });
    // A Cloud Run IAM rejection cannot return CORS headers to the browser.
    if (String(url).endsWith("/deleteSop"))
      throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify({ data: { ok: true, sopId: "draft" } }));
  };
  assert.deepEqual(await callSopFunction(functions, "sopCommand", payload), {
    ok: true,
    sopId: "draft",
  });
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.endsWith("/sopCommand"));
  assert.deepEqual(calls[0].data, payload);
  assert.deepEqual(calls[1].data, payload);
  calls.length = 0;
  functions.fetchImpl = async (url) => {
    calls.push(String(url));
    return new Response(
      JSON.stringify({
        error: {
          status: "PERMISSION_DENIED",
          message: "You may delete your own drafts.",
        },
      }),
      { status: 403 },
    );
  };
  await assert.rejects(callSopFunction(functions, "sopCommand", payload), {
    code: "functions/permission-denied",
  });
  assert.equal(calls.length, 1);
});
