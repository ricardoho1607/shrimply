"use strict";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8187";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const backendRequire = require("node:module").createRequire(
  require("node:path").resolve("functions/package.json"),
);
const { initializeApp } = backendRequire("firebase-admin/app"),
  { getFirestore } = backendRequire("firebase-admin/firestore");
const db = getFirestore(initializeApp({ projectId: "demo-shrimply-agent" }));
const runtime = require("../../functions/sop/runtime").createSopRuntime(db),
  companyId = "sop-browser-farm";
const rows = async (name) =>
  (await db.collection(`companies/${companyId}/${name}`).get()).docs.map(
    (d) => ({ id: d.id, ...d.data() }),
  );
const wait = async (predicate) => {
  for (let i = 0; i < 50; i++) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Committed state did not become visible.");
};
(async () => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: process.env.SOP_TEST_BROWSER || "chrome",
    });
    const page = await browser.newPage({
      viewport: { width: 1360, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3017/auth");
    await page.locator("#login-email").fill("sop-owner@example.test");
    await page.locator("#login-password").fill("Local-sop-test-123!");
    await page
      .getByRole("button", { name: "Enter Dashboard", exact: true })
      .click();
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("http://localhost:3017/dashboard/sops");
    await page
      .getByRole("button", { name: "Create SOP", exact: true })
      .waitFor({ timeout: 30000 });
    await page.screenshot({
      path: "/tmp/shrimply-sops-library.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Create SOP", exact: true }).click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("Browser water acceptance SOP");
    await page
      .getByLabel("Instructions", { exact: true })
      .fill(
        "Record morning dissolved oxygen in the existing water-quality form.",
      );
    await page.getByLabel("Minimum", { exact: true }).fill("5");
    await page.getByLabel("Maximum", { exact: true }).fill("8");
    await page.getByLabel("Severity").selectOption("critical");
    await page
      .getByLabel("Local time", { exact: true })
      .fill(new Date().toISOString().slice(11, 16));
    await page
      .getByLabel("Then: corrective instructions", { exact: true })
      .fill(
        "Inspect equipment and record the farm-approved corrective action.",
      );
    await page.getByLabel("Recheck interval (minutes)", { exact: true }).fill("1");
    await page.screenshot({
      path: "/tmp/shrimply-sop-builder.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("button", { name: "Approve version", exact: true })
      .click();
    await page.getByRole("button", { name: "Adopt", exact: true }).click();
    await page.getByLabel("Acceptance block", { exact: true }).check();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await page.getByRole("button", { name: "Activate", exact: true }).click();
    await wait(async () => !!(await rows("sopAdoptions")).length);
    const ad = (await rows("sopAdoptions"))[0];
    await runtime.tickAdoption(companyId, ad.id);
    const recordWater = async (value) => {
      await page.goto("http://localhost:3017/dashboard/water");
      await page
        .getByRole("button", { name: "New Parameter Log", exact: true })
        .click();
      await page
        .locator("form select")
        .first()
        .selectOption("acceptance-cycle");
      await page
        .locator("label")
        .filter({ hasText: /^DO \(Morning\) mg\/L$/ })
        .locator("..")
        .locator("input")
        .fill(String(value));
      await page
        .getByText("Observation times for SOP checks", { exact: true })
        .click();
      await page
        .getByLabel("do Morning observation time", { exact: true })
        .fill(new Date().toISOString());
      await page
        .getByRole("button", { name: "Save Log Entry", exact: true })
        .click();
      await wait(async () => {
        const pond = (
          await db.doc(`companies/${companyId}/ponds/acceptance-cycle`).get()
        ).data();
        return pond.samplings.some(
          (s) => String(s.doMorning) === String(value),
        );
      });
      await wait(async () =>
        (await rows("sopEvidence")).some(
          (e) =>
            e.field === "water.doMorning" &&
            String(e.value) === String(value) &&
            !e.deleted,
        ),
      );
    };
    await recordWater(4);
    let routine = (await rows("tasks")).find((t) => t.purpose === "routine");
    await runtime.evaluateTask(companyId, routine.id);
    let issue = (await rows("sopIssues"))[0];
    assert.equal(issue.status, "open");
    assert.equal(
      (await db.doc(`companies/${companyId}/tasks/${routine.id}`).get()).data()
        .status,
      "completed",
    );
    await page.goto(
      `http://localhost:3017/dashboard/todo?taskId=${issue.correctiveTaskId}`,
    );
    await page.getByRole("dialog", { name: "Task evidence" }).waitFor();
    await page
      .getByRole("button", { name: "Use current time", exact: true })
      .click();
    await page
      .getByLabel("Notes", { exact: true })
      .fill("Checked equipment and recorded the farm-approved action.");
    await page
      .getByRole("button", { name: "Submit evidence", exact: true })
      .click();
    await wait(
      async () =>
        (
          await db
            .doc(`companies/${companyId}/tasks/${issue.correctiveTaskId}`)
            .get()
        ).data().status === "submitted",
    );
    await runtime.evaluateTask(companyId, issue.correctiveTaskId);
    const recheck = (
      await db.doc(`companies/${companyId}/tasks/${issue.recheckTaskId}`).get()
    ).data();
    const remaining = recheck.windowStart - Date.now() + 500;
    if (remaining > 0) {
      console.log("Waiting for the real recheck measurement window.");
      await new Promise((r) => setTimeout(r, remaining));
    }
    await recordWater(6);
    await runtime.evaluateTask(companyId, issue.recheckTaskId);
    issue = (
      await db.doc(`companies/${companyId}/sopIssues/${issue.id}`).get()
    ).data();
    assert.equal(issue.status, "closure_review");
    await page.goto(
      `http://localhost:3017/dashboard/todo?taskId=${issue.recheckTaskId}`,
    );
    await page.getByRole("dialog", { name: "Task evidence" }).waitFor();
    await page
      .getByText("Recovery requires manager sign-off", { exact: true })
      .waitFor();
    page.once("dialog", (d) =>
      d.accept(
        "Verified committed recovery measurement and corrective action.",
      ),
    );
    await page
      .getByRole("button", { name: "Review as pass", exact: true })
      .click();
    await wait(async () => (await rows("sopIssues"))[0].status === "closed");
    const observations = await rows("waterObservations");
    assert.equal(observations.length, 2);
    assert.deepEqual(observations.map((o) => String(o.value)).sort(), [
      "4",
      "6",
    ]);
    await page.goto("http://localhost:3017/dashboard/sops");
    await page
      .getByRole("button", { name: "Issue history", exact: true })
      .click();
    await page.getByText(/Recovery verified/).waitFor();
    await page.screenshot({
      path: "/tmp/shrimply-sop-recovery-history.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3017/dashboard/todo");
    await page
      .getByRole("button", { name: "Create task", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/shrimply-sop-mobile-web.png",
      fullPage: true,
    });
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "Full browser water-quality corrective loop verified against committed emulator records.",
    );
  } finally {
    await browser?.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
