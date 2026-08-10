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
