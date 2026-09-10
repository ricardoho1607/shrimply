const assert = require("node:assert/strict");
const test = require("node:test");
const {
  evaluateOrsonQuota,
  resolveOrsonAiFunction,
} = require("./orsonRequestPolicy");

const LEGACY_PROJECTION_PROMPT = `Please provide a risk analysis for this harvest projection:
Pond: Pond 1
Current DOC: 40 | Projected DOC: 55`;

test("classifies current and legacy Orson request payloads without trusting the client label", () => {
  assert.equal(resolveOrsonAiFunction(null), "chat");
  assert.equal(resolveOrsonAiFunction({ aiFunction: "chat", prompt: "How is Pond 1?" }), "chat");
  assert.equal(resolveOrsonAiFunction({ aiFunction: "projection", prompt: LEGACY_PROJECTION_PROMPT }), "projection");
  assert.equal(resolveOrsonAiFunction({ aiFunction: "chat", prompt: LEGACY_PROJECTION_PROMPT }), "projection");
  assert.equal(resolveOrsonAiFunction({ systemInstruction: "legacy", prompt: LEGACY_PROJECTION_PROMPT }), "projection");
  assert.equal(resolveOrsonAiFunction({ systemInstruction: "legacy", prompt: "How is Pond 1?" }), "chat");
});

test("enforces per-feature and combined quotas while migrating existing usage documents", () => {
  assert.deepEqual(evaluateOrsonQuota(null, "chat"), {
    allowed: true,
    next: { chat: 1, projection: 0, total: 1 },
  });
  assert.deepEqual(evaluateOrsonQuota({}, "chat"), {
    allowed: true,
    next: { chat: 1, projection: 0, total: 1 },
  });
  assert.deepEqual(evaluateOrsonQuota({ chat: 2, projection: 1 }, "projection"), {
    allowed: true,
    next: { chat: 2, projection: 2, total: 4 },
  });
  assert.deepEqual(evaluateOrsonQuota({ chat: 4, projection: 5, total: 9 }, "projection"), {
    allowed: false,
    quota: "projection",
    limit: 5,
    used: 5,
  });
  assert.deepEqual(evaluateOrsonQuota({ chat: 20, projection: 5, total: 25 }, "chat"), {
    allowed: false,
    quota: "total",
    limit: 25,
    used: 25,
  });
});

test("applies the company plan's daily Orson limits", () => {
  const freeLimits = { chat: 3, projection: 1, total: 4 };
  assert.deepEqual(evaluateOrsonQuota({ chat: 3, projection: 0, total: 3 }, "chat", freeLimits), {
    allowed: false,
    quota: "chat",
    limit: 3,
    used: 3,
  });
  assert.deepEqual(evaluateOrsonQuota({ chat: 2, projection: 1, total: 3 }, "projection", freeLimits), {
    allowed: false,
    quota: "projection",
    limit: 1,
    used: 1,
  });
});
test('explicit null quotas allow lifetime usage while still recording requests', () => {
  const result = evaluateOrsonQuota({ chat: 9000, projection: 1000, total: 10000 }, 'chat', { chat: null, projection: null, total: null });
  assert.equal(result.allowed, true);
  assert.equal(result.next.total, 10001);
  assert.equal(evaluateOrsonQuota({}, 'chat', {}).allowed, false);
});
