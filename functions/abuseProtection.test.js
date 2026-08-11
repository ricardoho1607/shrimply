const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildRateLimitDocumentId,
  evaluateFixedWindowLimit,
} = require("./abuseProtection");

test("fixed-window limits reset, increment, and block with a retry time", () => {
  assert.deepEqual(evaluateFixedWindowLimit({
    current: {}, limit: 2, windowMs: 1000, nowMs: 5000,
  }), {
    allowed: true, count: 1, windowStartedAtMs: 5000,
  });
  assert.deepEqual(evaluateFixedWindowLimit({
    current: { count: 1, windowStartedAt: { toMillis: () => 5000 } },
    limit: 2,
    windowMs: 1000,
    nowMs: 5500,
  }), {
    allowed: true, count: 2, windowStartedAtMs: 5000,
  });
  assert.deepEqual(evaluateFixedWindowLimit({
    current: { count: 2, windowStartedAt: { toMillis: () => 5000 } },
    limit: 2,
    windowMs: 1000,
    nowMs: 5750,
  }), {
    allowed: false, retryAfterMs: 250,
  });
});

test("rate-limit document IDs do not expose user-controlled scope values", () => {
  const id = buildRateLimitDocumentId("orson/burst", "user:private@example.com");
  assert.match(id, /^orson_burst_[a-f0-9]{40}$/);
  assert.doesNotMatch(id, /private|example/);
});
