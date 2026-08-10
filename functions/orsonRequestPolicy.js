const ORSON_DAILY_LIMITS = Object.freeze({
  chat: 20,
  projection: 5,
  total: 25,
});

const PROJECTION_PROMPT_MARKERS = [
  "risk analysis for this harvest projection",
  "projected doc:",
  "projected mbw:",
  "projection confidence:",
  "structured risks:",
  "operating-profit comparison",
];

const resolveOrsonAiFunction = (data = {}) => {
  const payload = data && typeof data === "object" ? data : {};
  const prompt = typeof payload.prompt === "string" ? payload.prompt.toLowerCase() : "";
  const projectionMarkerCount = PROJECTION_PROMPT_MARKERS.reduce(
    (count, marker) => count + (prompt.includes(marker) ? 1 : 0),
    0,
  );

  if (projectionMarkerCount >= 2 || payload.aiFunction === "projection") return "projection";
  return "chat";
};

const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0 ? value : 0;

const normalizeOrsonUsage = (value = {}) => {
  const usage = value && typeof value === "object" ? value : {};
  const chat = nonNegativeInteger(usage.chat);
  const projection = nonNegativeInteger(usage.projection);
  const storedTotal = nonNegativeInteger(usage.total);
  return {
    chat,
    projection,
    total: Math.max(storedTotal, chat + projection),
  };
};

const evaluateOrsonQuota = (value, aiFunction) => {
  const usage = normalizeOrsonUsage(value);
  const functionKey = aiFunction === "projection" ? "projection" : "chat";
  if (usage.total >= ORSON_DAILY_LIMITS.total) {
    return {
      allowed: false,
      quota: "total",
      limit: ORSON_DAILY_LIMITS.total,
      used: usage.total,
    };
  }

  if (usage[functionKey] >= ORSON_DAILY_LIMITS[functionKey]) {
    return {
      allowed: false,
      quota: functionKey,
      limit: ORSON_DAILY_LIMITS[functionKey],
      used: usage[functionKey],
    };
  }

  return {
    allowed: true,
    next: {
      ...usage,
      [functionKey]: usage[functionKey] + 1,
      total: usage.total + 1,
    },
  };
};

module.exports = {
  ORSON_DAILY_LIMITS,
  evaluateOrsonQuota,
  normalizeOrsonUsage,
  resolveOrsonAiFunction,
};
