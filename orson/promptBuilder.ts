import {
  ORSON_PRODUCT_PROMISE,
  ORSON_RESPONSE_PRINCIPLES,
  ORSON_STANDARD_RESPONSE_SHAPE,
  ORSON_UNSUPPORTED_CLAIMS,
} from './sourceOfTruth';
import { selectOrsonKnowledge } from './knowledge/knowledgeSelector';
import type { SelectedKnowledge } from './knowledge/knowledgeTypes';
import { isMortalityDiagnosticQuestion } from './mortalityDiagnostic';
import type {
  OrsonAnalysisMode,
  Orson72HourOutlook,
  OrsonPondMetrics,
  OrsonPromptPackage,
  OrsonPromptPondPayload,
  OrsonQuestionFocus,
  OrsonQuestionIntent,
  OrsonRiskReport,
  OrsonRiskSeverity,
  OrsonMortalityTrace,
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

const SUMMARY_PATTERNS = [
  /\banaly[sz]e\b/i,
  /\boverview\b/i,
  /\bsummary\b/i,
  /\breport\b/i,
  /\bstatus\b/i,
  /\bhow\s+(is|are)\b/i,
  /\bcheck\b/i,
];

const TOPIC_PATTERNS: { intent: OrsonQuestionIntent; patterns: RegExp[] }[] = [
  { intent: 'lab', patterns: [/\blab\b/i, /\blab\s+report\b/i, /\bplankton\b/i, /\bpathogen\b/i] },
  { intent: 'feed', patterns: [/\bfeed(ing)?\b/i, /\btray\b/i, /\bappetite\b/i, /\bleftover\b/i, /\bfcr\b/i, /\bration\b/i, /\bschedule\b/i] },
  { intent: 'growth', patterns: [/\bgrowth\b/i, /\bmbw\b/i, /\babw\b/i, /\badg\b/i, /\bweight\b/i] },
  { intent: 'water_quality', patterns: [/\bwater\b/i, /\bD\.?O\.?\b/, /\bdissolved\s+oxygen\b/i, /\boxygen\b/i, /\bph\b/i, /\bsalinity\b/i, /\balkalinity\b/i] },
  { intent: 'harvest', patterns: [/\bharvest\b/i, /\bmarket\s*size\b/i, /\bsell\b/i] },
  { intent: 'biomass', patterns: [/\bbiomass\b/i, /\bpopulation\b/i, /\bstock(ing)?\b/i] },
  { intent: 'survival', patterns: [/\bsurvival\b/i, /\bmortality\b/i, /\bdead\b/i] },
  { intent: 'risk', patterns: [/\brisk\b/i, /\bproblem\b/i, /\bwarning\b/i, /\bcritical\b/i, /\balert\b/i] },
];

const PARAMETER_PATTERNS: { key: string; patterns: RegExp[] }[] = [
  { key: 'dissolved_oxygen', patterns: [/\bD\.?O\.?\b/, /\bdissolved\s+oxygen\b/i, /\boxygen\b/i] },
  { key: 'ph', patterns: [/\bph\b/i] },
  { key: 'ammonia', patterns: [/\bammonia\b/i, /\bnh3\b/i, /\bnh4\b/i, /\btan\b/i] },
  { key: 'nitrite', patterns: [/\bnitrite\b/i, /\bno2\b/i] },
  { key: 'salinity', patterns: [/\bsalinity\b/i, /\bsalt\b/i] },
  { key: 'alkalinity', patterns: [/\balkalinity\b/i, /\bkh\b/i, /\bbuffer(ing)?\b/i] },
  { key: 'plankton_transparency', patterns: [/\bplankton\b/i, /\btransparency\b/i, /\bwater\s+color\b/i, /\bbloom\b/i, /\balgae\b/i] },
];

const DECREASE_PATTERNS = [/\bdecrease\b/i, /\blower\b/i, /\breduce\b/i, /\bbring\s+down\b/i, /\btoo\s+high\b/i, /\bhigh\b/i];
const INCREASE_PATTERNS = [/\bincrease\b/i, /\braise\b/i, /\bbring\s+up\b/i, /\btoo\s+low\b/i, /\blow\b/i];
const STABILIZE_PATTERNS = [/\bstabili[sz]e\b/i, /\bbalance\b/i, /\bcontrol\b/i, /\bfix\b/i, /\bmanage\b/i, /\badjust\b/i];

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

const normalizeSearchText = (value: string | null | undefined): string => {
  return ` ${String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
};

const includesSearchTerm = (haystack: string, needle: string | null | undefined): boolean => {
  const normalizedNeedle = normalizeSearchText(needle).trim();
  if (!normalizedNeedle) return false;
  return haystack.includes(` ${normalizedNeedle} `);
};

const severityRank: Record<OrsonRiskSeverity, number> = {
  info: 0,
  watch: 1,
  warning: 2,
  critical: 3,
};

const getHighestPayloadSeverity = (payload: OrsonPromptPondPayload): number => {
  return payload.findings.reduce((highest, finding) => {
    return Math.max(highest, severityRank[finding.severity]);
  }, 0);
};

export const inferOrsonQuestionIntent = (question: string): OrsonQuestionIntent => {
  if (detectRequestedParameter(question) && detectRequestedDirection(question)) return 'parameter_control';
  for (const topic of TOPIC_PATTERNS) {
    if (topic.patterns.some((pattern) => pattern.test(question))) return topic.intent;
  }
  if (SUMMARY_PATTERNS.some((pattern) => pattern.test(question))) return 'summary';
  return 'general';
};

const detectRequestedParameter = (question: string): string | null => {
  const match = PARAMETER_PATTERNS.find((parameter) => parameter.patterns.some((pattern) => pattern.test(question)));
  return match?.key ?? null;
};

const detectRequestedDirection = (question: string): OrsonQuestionFocus['requestedDirection'] => {
  if (DECREASE_PATTERNS.some((pattern) => pattern.test(question))) return 'decrease';
  if (INCREASE_PATTERNS.some((pattern) => pattern.test(question))) return 'increase';
  if (STABILIZE_PATTERNS.some((pattern) => pattern.test(question))) return 'stabilize';
  return null;
};

export const buildOrsonQuestionFocus = (
  question: string,
  payloads: OrsonPromptPondPayload[],
): OrsonQuestionFocus => {
  const normalizedQuestion = normalizeSearchText(question);
  const focusedPayload = payloads.find((payload) => {
    return includesSearchTerm(normalizedQuestion, payload.pondName) ||
      includesSearchTerm(normalizedQuestion, payload.pondId);
  }) ?? null;
  const intent = inferOrsonQuestionIntent(question);
  const requestedParameter = detectRequestedParameter(question);
  const requestedDirection = detectRequestedDirection(question);

  return {
    analysisMode: isMortalityDiagnosticQuestion(question) ? 'mortality_diagnostic' : 'standard',
    intent,
    focusedPondName: focusedPayload?.pondName ?? null,
    focusedPondId: focusedPayload?.pondId ?? null,
    requestedParameter,
    requestedDirection,
    isPondSpecific: focusedPayload !== null,
    shouldSummarize: intent === 'summary' || /\banaly[sz]e\b/i.test(question),
  };
};

const orderPayloadsForQuestion = (
  payloads: OrsonPromptPondPayload[],
  focus: OrsonQuestionFocus,
): OrsonPromptPondPayload[] => {
  if (!focus.isPondSpecific) {
    return [...payloads]
      .sort((a, b) => getHighestPayloadSeverity(b) - getHighestPayloadSeverity(a))
      .slice(0, 10);
  }

  const focused = payloads.find((payload) => {
    return payload.pondName === focus.focusedPondName || payload.pondId === focus.focusedPondId;
  });
  if (!focused) return payloads;

  const supporting = payloads
    .filter((payload) => payload !== focused)
    .sort((a, b) => getHighestPayloadSeverity(b) - getHighestPayloadSeverity(a))
    .slice(0, 2);

  return [focused, ...supporting];
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
    feedAllocationTrend: metrics.feedAllocationTrend,
    baselineFeedKg: metrics.baselineFeedKg,
    operationalFeedKg: metrics.operationalFeedKg,
    dataAssumptions: metrics.dataAssumptions,
    dataCompletenessScore: metrics.dataCompleteness.score,
    calibration: metrics.calibration,
    phSwingLatest: metrics.phSwingLatest,
    doMinimumLatest: metrics.doMinimumLatest,
    salinityTrend: metrics.salinityTrend,
    labContext: metrics.labContext,
    outlook: {
      direction: outlook.direction,
      level: outlook.level,
      confidence: outlook.confidence,
      summary: outlook.summary,
      topReason: outlook.topReason,
      nextAction: outlook.nextAction,
    },
    findings: report.findings.slice(0, 4).map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      confidence: finding.confidence,
      summary: finding.summary,
      evidence: finding.evidence.slice(0, 2),
      recommendation: finding.recommendation,
    })),
  };
};

export const buildOrsonSystemInstruction = (mode: OrsonAnalysisMode = 'standard'): string => {
  return [
    `IDENTITY: You are Orson, Shrimply's aquaculture intelligence assistant.`,
    `PRODUCT PROMISE: ${ORSON_PRODUCT_PROMISE}`,
    '',
    'SOURCE OF TRUTH:',
    '- Use the provided ORSON RISK PAYLOAD as the source of truth.',
    '- The payload is produced by deterministic Shrimply calculations before this model call.',
    '- Do not invent measurements, disease diagnoses, pathogen results, or lab data.',
    '- Do not treat a change in logged daily feed as measured appetite or proof that feed was consumed.',
    '- If a measurement is missing or confidence is low, say so clearly.',
    '- Treat confirmed lab report findings as higher-confidence context than daily field logs, and call out contradictions instead of smoothing them over.',
    '- If data_assumptions mention mid-cycle onboarding, state that pre-onboarding values are estimates and avoid treating them as exact historical records.',
    '- Treat calibration as a bounded company prediction adjustment, not as a change to biological safety thresholds or proof of causation.',
    '',
    'ANSWER ROUTING:',
    '- Answer the user question directly in the first sentence.',
    '- If the question asks about a specific pond, focus on the focused pond and use other ponds only for comparison when useful.',
    '- If the question asks about feed, growth, water quality, lab, harvest, biomass, or survival, lead with that topic instead of giving a full pond summary.',
    '- If ORSON SELECTED KNOWLEDGE is present, use it to give practical farm actions, not generic definitions.',
    '- For parameter-control questions, structure the answer as: immediate action, why it works, what to monitor next, and safety caution.',
    '- Do not repeat the pond summary unless the user asks for overview, status, summary, report, or analysis.',
    '- If the available payload cannot answer the exact question, say what is missing and give the closest supported answer.',
    '',
    'LANGUAGE:',
    '- Detect the primary language of the USER QUESTION and reply in that same language.',
    '- If the user mixes languages, use the language that carries the main request.',
    '- Keep scientific names, pond names, units, and exact field values unchanged.',
    '- If the question is only symbols, numbers, or a pond code with no detectable language, reply in English.',
    '',
    'RESPONSE PRINCIPLES:',
    ...Object.values(ORSON_RESPONSE_PRINCIPLES).map((principle) => `- ${principle}`),
    '',
    'STANDARD RESPONSE SHAPE:',
    ...ORSON_STANDARD_RESPONSE_SHAPE.map((step, index) => `${index + 1}. ${step}`),
    '- Use this full shape only for broad analysis or status questions. For narrow questions, use a direct answer with 1-3 supporting bullets.',
    '',
    'UNSUPPORTED CLAIMS:',
    ...Object.values(ORSON_UNSUPPORTED_CLAIMS).map((claim) => `- ${claim}`),
    '',
    'STYLE:',
    '- Plain text only.',
    '- Use short bullets when listing risks.',
    '- Keep routine answers under 5 sentences unless the user asks for detail.',
    '- Prioritize critical and warning findings before watch/info findings.',
    '- Do not provide exact chemical dose rates unless the app payload includes pond volume, product concentration, and farm protocol.',
    ...(mode === 'mortality_diagnostic' ? [
      '',
      'MORTALITY DIAGNOSTIC SAFETY:',
      '- Use ORSON MORTALITY TRACE to explain the dated sequence across the previous 14 farm-calendar days.',
      '- Rank environmental, operational, and biological contributors by evidence; timing alone does not prove causation.',
      '- A declining feed allocation is only a low-confidence appetite proxy unless direct tray or appetite observations exist.',
      '- Account for partial harvest before interpreting lower feed, biomass, population, survival, or mortality rate.',
      '- Name a pathogen or disease only when confirmed lab evidence explicitly supports it; otherwise use suspected or cannot-be-ruled-out language.',
      '- Separate immediate actions, actions within 24-48 hours, monitoring, missing data, and the 72-hour outlook.',
    ] : []),
  ].join('\n');
};

export const buildOrsonPromptContext = (
  payloads: OrsonPromptPondPayload[],
  questionFocus: OrsonQuestionFocus,
  selectedKnowledge: SelectedKnowledge,
  totalPondCount = payloads.length,
  mortalityTrace: OrsonMortalityTrace | null = null,
): string => {
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
    feed_allocation_trend: {
      direction: payload.feedAllocationTrend.direction,
      first_kg: payload.feedAllocationTrend.first,
      last_kg: payload.feedAllocationTrend.last,
      points: payload.feedAllocationTrend.points,
    },
    baseline_feed_kg: payload.baselineFeedKg,
    operational_feed_kg: payload.operationalFeedKg,
    data_assumptions: payload.dataAssumptions,
    data_completeness_pct: round(payload.dataCompletenessScore * 100, 0),
    calibration: payload.calibration,
    water_metrics: {
      ph_swing_latest: payload.phSwingLatest,
      do_minimum_latest_mg_l: payload.doMinimumLatest,
      salinity_trend: payload.salinityTrend,
    },
    lab_context: {
      latest: payload.labContext.latest,
      by_type: payload.labContext.byType,
      unresolved_risks: payload.labContext.unresolvedRisks,
      recommendations: payload.labContext.recommendations,
      worst_status: payload.labContext.worstStatus,
    },
    outlook: payload.outlook,
    findings: payload.findings,
  }));

  return [
    'ORSON FARM SCOPE:',
    JSON.stringify({
      active_pond_count: totalPondCount,
      included_pond_count: payloads.length,
      selection: totalPondCount > payloads.length
        ? 'Highest-risk ponds were selected to keep large-farm analysis bounded.'
        : 'All active ponds are included.',
    }, null, 2),
    '',
    'ORSON QUESTION FOCUS:',
    JSON.stringify({
      intent: questionFocus.intent,
      focused_pond: questionFocus.focusedPondName,
      requested_parameter: questionFocus.requestedParameter,
      requested_direction: questionFocus.requestedDirection,
      is_pond_specific: questionFocus.isPondSpecific,
      should_summarize: questionFocus.shouldSummarize,
      ...(questionFocus.analysisMode === 'mortality_diagnostic' ? { analysis_mode: questionFocus.analysisMode } : {}),
    }, null, 2),
    '',
    'ORSON SELECTED KNOWLEDGE:',
    JSON.stringify({
      parameter_guidance: selectedKnowledge.parameterGuidance.map((guidance) => ({
        id: guidance.id,
        label: guidance.label,
        target: guidance.target,
        warning: guidance.warning,
        critical: guidance.critical,
        evidence_base: guidance.evidenceBase,
        actions: guidance.actions,
        monitor: guidance.monitor,
        cautions: guidance.cautions,
      })),
      cross_parameter_rules: selectedKnowledge.crossParameterRules.map((rule) => ({
        id: rule.id,
        label: rule.label,
        severity: rule.severity,
        conditions: rule.conditions,
        could_lead_to: rule.couldLeadTo,
        actions: rule.actions,
        cautions: rule.cautions,
      })),
      missing_data_questions: selectedKnowledge.missingDataQuestions,
      source_labels: selectedKnowledge.sourceLabels,
    }),
    '',
    ...(mortalityTrace ? [
      `ORSON MORTALITY TRACE:\n${JSON.stringify(mortalityTrace)}`,
      '',
    ] : []),
    `ORSON RISK PAYLOAD:\n${JSON.stringify(compactPayloads, null, 2)}`,
  ].join('\n');
};

export const buildOrsonPromptPackage = (params: {
  userMessage: string;
  metrics: OrsonPondMetrics[];
  reports: OrsonRiskReport[];
  outlooks: Orson72HourOutlook[];
  mortalityTrace?: OrsonMortalityTrace | null;
}): OrsonPromptPackage => {
  const payloads = params.metrics.map((metrics, index) => buildOrsonPromptPayload(
    metrics,
    params.reports[index],
    params.outlooks[index],
  ));
  const detectedFocus = buildOrsonQuestionFocus(params.userMessage, payloads);
  const questionFocus = params.mortalityTrace
    ? {
        ...detectedFocus,
        analysisMode: 'mortality_diagnostic' as const,
        focusedPondName: params.mortalityTrace.pondName,
        focusedPondId: params.mortalityTrace.pondId,
        isPondSpecific: true,
      }
    : detectedFocus;
  const orderedPayloads = orderPayloadsForQuestion(payloads, questionFocus);
  const selectedKnowledge = selectOrsonKnowledge({
    userMessage: params.userMessage,
    questionFocus,
    metrics: params.metrics,
  });

  return {
    systemInstruction: buildOrsonSystemInstruction(questionFocus.analysisMode),
    context: buildOrsonPromptContext(
      orderedPayloads,
      questionFocus,
      selectedKnowledge,
      params.metrics.length,
      params.mortalityTrace ?? null,
    ),
    userMessage: params.userMessage,
    cacheKey: questionFocus.analysisMode === 'mortality_diagnostic'
      ? null
      : buildOrsonCacheKey(params.userMessage, orderedPayloads),
    isFarmSpecific: questionFocus.analysisMode === 'mortality_diagnostic'
      ? true
      : isFarmSpecificQuestion(params.userMessage),
    questionFocus,
    mortalityTrace: params.mortalityTrace ?? null,
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
