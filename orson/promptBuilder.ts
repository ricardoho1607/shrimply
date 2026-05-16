import {
  ORSON_PRODUCT_PROMISE,
  ORSON_RESPONSE_PRINCIPLES,
  ORSON_STANDARD_RESPONSE_SHAPE,
  ORSON_UNSUPPORTED_CLAIMS,
} from './sourceOfTruth';
import type {
  Orson72HourOutlook,
  OrsonPondMetrics,
  OrsonPromptPackage,
  OrsonPromptPondPayload,
  OrsonRiskReport,
} from './types';

const FARM_SPECIFIC_PATTERNS = [
  /\bmy\s+(pond|farm|shrimp|feed|water|harvest|stock|stocking|biomass)\b/i,
  /\b(this|that|the)\s+(pond|farm|projection|harvest|feed|water)\b/i,
  /\bpond\s+[a-z0-9-]+\b/i,
  /\bhow\s+(is|are)\s+(my|the|this)\b/i,
  /\banaly[sz]e\b/i,
  /\bcheck\b/i,
  /\brisk\b/i,
  /\bfcr\b/i,
  /\bdo\b/i,
  /\bph\b/i,
  /\bmbw\b/i,
  /\bbiomass\b/i,
  /\bsurvival\b/i,
  /\bfeed\b/i,
];

const GENERAL_AQUACULTURE_PATTERNS = [
  /\bwhat\s+is\b/i,
  /\bhow\s+do\s+i\b/i,
  /\bexplain\b/i,
  /\bdefinition\b/i,
  /\bgeneral\b/i,
];

export const ORSON_MODEL_TIMEOUT_MS = 25000;
export const ORSON_RESPONSE_TIMEOUT_MS = 8000;
export const ORSON_FALLBACK_RESPONSE =
  'Orson is having trouble completing the analysis right now. The calculated risk report is still available, but the conversational summary could not be generated.';

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const hashString = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
};

export const isFarmSpecificQuestion = (question: string): boolean => {
  const trimmed = question.trim();
  if (!trimmed) return false;

  if (GENERAL_AQUACULTURE_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  if (FARM_SPECIFIC_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  return trimmed.length > 120;
};

export const buildOrsonCacheKey = (
  question: string,
  payloads: OrsonPromptPondPayload[],
): string | null => {
  if (isFarmSpecificQuestion(question)) return null;
  const normalizedQuestion = question.toLowerCase().trim().replace(/\s+/g, ' ');
  const contextHash = hashString(stableStringify(payloads.map((payload) => ({
    pondId: payload.pondId,
    currentDoc: payload.currentDoc,
    findings: payload.findings.map((finding) => finding.id),
    outlook: payload.outlook.direction,
  }))));
  return `orson_general_${hashString(normalizedQuestion)}_${contextHash}`;
};

export const buildOrsonPromptPayload = (
  metrics: OrsonPondMetrics,
  report: OrsonRiskReport,
  outlook: Orson72HourOutlook,
): OrsonPromptPondPayload => {
  return {
    pondId: metrics.pondId,
    pondName: metrics.pondName,
    currentDoc: metrics.currentDoc,
    latestMbwG: metrics.latestMbwG,
    biomassKg: metrics.estimatedBiomassKg,
    biomassRangeKg: metrics.feedBiomassModel.biomassRangeKg,
    survivalPercent: metrics.estimatedSurvivalPercent,
    survivalConfidence: metrics.feedBiomassModel.survivalAssumption.confidence,
    feedPressureRatio: metrics.feedBiomassModel.feedPressureRatio,
    expectedFeedKg: metrics.feedBiomassModel.expectedFeedKg,
    actualFeedKg: metrics.feedBiomassModel.actualFeedKg,
    baselineFeedKg: metrics.baselineFeedKg,
    operationalFeedKg: metrics.operationalFeedKg,
    dataAssumptions: metrics.dataAssumptions,
    dataCompletenessScore: metrics.dataCompleteness.score,
    outlook: {
      direction: outlook.direction,
      level: outlook.level,
      confidence: outlook.confidence,
      summary: outlook.summary,
      topReason: outlook.topReason,
      nextAction: outlook.nextAction,
    },
    findings: report.findings.slice(0, 5).map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      confidence: finding.confidence,
      summary: finding.summary,
      evidence: finding.evidence.slice(0, 3),
      recommendation: finding.recommendation,
    })),
  };
};

export const buildOrsonSystemInstruction = (): string => {
  return [
    `IDENTITY: You are Orson, Shrimply's aquaculture intelligence assistant.`,
    `PRODUCT PROMISE: ${ORSON_PRODUCT_PROMISE}`,
    '',
    'SOURCE OF TRUTH:',
    '- Use the provided ORSON RISK PAYLOAD as the source of truth.',
    '- The payload is produced by deterministic Shrimply calculations before this model call.',
    '- Do not invent measurements, disease diagnoses, pathogen results, or lab data.',
    '- If a measurement is missing or confidence is low, say so clearly.',
    '- If data_assumptions mention mid-cycle onboarding, state that pre-onboarding values are estimates and avoid treating them as exact historical records.',
    '',
    'RESPONSE PRINCIPLES:',
    ...Object.values(ORSON_RESPONSE_PRINCIPLES).map((principle) => `- ${principle}`),
    '',
    'STANDARD RESPONSE SHAPE:',
    ...ORSON_STANDARD_RESPONSE_SHAPE.map((step, index) => `${index + 1}. ${step}`),
    '',
    'UNSUPPORTED CLAIMS:',
    ...Object.values(ORSON_UNSUPPORTED_CLAIMS).map((claim) => `- ${claim}`),
    '',
    'STYLE:',
    '- Plain text only.',
    '- Use short bullets when listing risks.',
    '- Keep routine answers under 5 sentences unless the user asks for detail.',
    '- Prioritize critical and warning findings before watch/info findings.',
  ].join('\n');
};

export const buildOrsonPromptContext = (payloads: OrsonPromptPondPayload[]): string => {
  const compactPayloads = payloads.map((payload) => ({
    pond: payload.pondName,
    doc: payload.currentDoc,
    mbw_g: payload.latestMbwG,
    biomass_kg: payload.biomassKg,
    biomass_range_kg: payload.biomassRangeKg,
    survival_pct: payload.survivalPercent,
    survival_confidence: payload.survivalConfidence,
    feed_pressure_ratio: payload.feedPressureRatio,
    expected_feed_kg: payload.expectedFeedKg,
    actual_feed_kg: payload.actualFeedKg,
    baseline_feed_kg: payload.baselineFeedKg,
    operational_feed_kg: payload.operationalFeedKg,
    data_assumptions: payload.dataAssumptions,
    data_completeness_pct: round(payload.dataCompletenessScore * 100, 0),
    outlook: payload.outlook,
    findings: payload.findings,
  }));

  return `ORSON RISK PAYLOAD:\n${JSON.stringify(compactPayloads, null, 2)}`;
};

export const buildOrsonPromptPackage = (params: {
  userMessage: string;
  metrics: OrsonPondMetrics[];
  reports: OrsonRiskReport[];
  outlooks: Orson72HourOutlook[];
}): OrsonPromptPackage => {
  const payloads = params.metrics.map((metrics, index) => buildOrsonPromptPayload(
    metrics,
    params.reports[index],
    params.outlooks[index],
  ));

  return {
    systemInstruction: buildOrsonSystemInstruction(),
    context: buildOrsonPromptContext(payloads),
    userMessage: params.userMessage,
    cacheKey: buildOrsonCacheKey(params.userMessage, payloads),
    isFarmSpecific: isFarmSpecificQuestion(params.userMessage),
  };
};

export const cleanOrsonResponse = (text: string): string => {
  return text
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
};

export const withOrsonTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = ORSON_FALLBACK_RESPONSE,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
