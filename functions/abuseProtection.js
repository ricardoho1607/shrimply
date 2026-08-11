const crypto = require("node:crypto");
const { HttpsError } = require("firebase-functions/v2/https");

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
};

const buildRateLimitDocumentId = (namespace, scope) => {
  const safeNamespace = String(namespace || "request").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  const digest = crypto.createHash("sha256").update(String(scope || "unknown")).digest("hex").slice(0, 40);
  return `${safeNamespace}_${digest}`;
};

const evaluateFixedWindowLimit = ({ current = {}, limit, windowMs, nowMs }) => {
  const windowStartedAtMs = toMillis(current.windowStartedAt);
  const count = Number.isInteger(current.count) && current.count >= 0 ? current.count : 0;
  const inCurrentWindow = windowStartedAtMs > 0 && nowMs - windowStartedAtMs < windowMs;
  if (inCurrentWindow && count >= limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(windowMs - (nowMs - windowStartedAtMs), 1),
    };
  }
  return {
    allowed: true,
    count: inCurrentWindow ? count + 1 : 1,
    windowStartedAtMs: inCurrentWindow ? windowStartedAtMs : nowMs,
  };
};

const enforceFixedWindowLimits = async ({ db, admin, limits, nowMs = Date.now() }) => {
  const activeLimits = limits.filter((entry) => entry?.scope);
  if (activeLimits.length === 0) return;

  const entries = activeLimits.map((entry) => ({
    ...entry,
    ref: db.collection("securityRateLimits").doc(buildRateLimitDocumentId(entry.namespace, entry.scope)),
  }));

  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(entries.map((entry) => transaction.get(entry.ref)));
    const evaluations = entries.map((entry, index) => evaluateFixedWindowLimit({
      current: snapshots[index].exists ? snapshots[index].data() || {} : {},
      limit: entry.limit,
      windowMs: entry.windowMs,
      nowMs,
    }));
    const blockedIndex = evaluations.findIndex((evaluation) => !evaluation.allowed);
    if (blockedIndex >= 0) {
      const blocked = entries[blockedIndex];
      const evaluation = evaluations[blockedIndex];
      throw new HttpsError("resource-exhausted", blocked.message || "Too many requests. Try again later.", {
        retryAfterSeconds: Math.ceil(evaluation.retryAfterMs / 1000),
      });
    }

    entries.forEach((entry, index) => {
      const evaluation = evaluations[index];
      transaction.set(entry.ref, {
        count: evaluation.count,
        windowStartedAt: admin.firestore.Timestamp.fromMillis(evaluation.windowStartedAtMs),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  });
};

const logCallableAppCheckStatus = (request, functionName) => {
  console.info("app_check_rollout_observation", {
    functionName,
    status: request.app?.appId ? "verified" : "missing_or_invalid",
    appId: request.app?.appId || null,
    authenticated: Boolean(request.auth?.uid),
  });
};

module.exports = {
  buildRateLimitDocumentId,
  enforceFixedWindowLimits,
  evaluateFixedWindowLimit,
  logCallableAppCheckStatus,
};
