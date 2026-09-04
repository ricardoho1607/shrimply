import type {
  OrsonPondMetrics,
  OrsonQuestionFocus,
} from '../types';
import { ADDITIVE_KNOWLEDGE } from './additiveKnowledge';
import { CROSS_PARAMETER_RULES } from './crossParameterRules';
import { FEED_KNOWLEDGE } from './feedKnowledge';
import { GROWTH_KNOWLEDGE } from './growthKnowledge';
import { LAB_KNOWLEDGE } from './labKnowledge';
import type { CrossParameterRule, ParameterKnowledge, SelectedKnowledge } from './knowledgeTypes';
import { getKnowledgeSourceLabels, KNOWLEDGE_SOURCES } from './sources';
import { WATER_QUALITY_KNOWLEDGE } from './waterQualityKnowledge';
import { DIAGNOSTIC_KNOWLEDGE } from './diagnosticKnowledge';

const ALL_PARAMETER_KNOWLEDGE = [
  ...WATER_QUALITY_KNOWLEDGE,
  ...FEED_KNOWLEDGE,
  ...GROWTH_KNOWLEDGE,
  ...LAB_KNOWLEDGE,
  ...ADDITIVE_KNOWLEDGE,
  ...DIAGNOSTIC_KNOWLEDGE,
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const questionMatchesKnowledge = (question: string, knowledge: ParameterKnowledge) => {
  const normalizedQuestion = ` ${normalize(question)} `;
  return knowledge.aliases.some((alias) => normalizedQuestion.includes(` ${normalize(alias)} `));
};

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const unique: T[] = [];
  items.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    unique.push(item);
  });
  return unique;
};

const selectParameterKnowledge = (
  userMessage: string,
  focus: OrsonQuestionFocus,
  metrics: OrsonPondMetrics[],
): ParameterKnowledge[] => {
  const evidenceTopics = new Set<string>();
  const nitrogenObservations = metrics.flatMap(metric => metric.diagnosticContext.history.observations ?? []);
  const hasUnverifiedNitrite = nitrogenObservations.some(record => record.nitriteMgL !== undefined
    && !['NO2', 'NO2-N', 'NO2 as N'].includes(record.nitrogenBasis ?? ''));
  if (focus.analysisMode !== 'standard' && focus.route === 'farm_analysis') metrics.forEach(metric => {
    metric.diagnosticContext.signals.forEach(signal => {
      if (signal.type.startsWith('ADG_')) evidenceTopics.add('growth_performance');
      if (signal.type.startsWith('DAILY_FEED_')) evidenceTopics.add('feed_control');
      if (signal.type.startsWith('MORNING_DO_')) evidenceTopics.add('dissolved_oxygen');
      if (signal.type.startsWith('PH_SWING_')) { evidenceTopics.add('ph'); evidenceTopics.add('alkalinity'); evidenceTopics.add('plankton_transparency'); }
      if (signal.type.startsWith('ALKALINITY_')) evidenceTopics.add('alkalinity');
      if (signal.type.startsWith('SALINITY_')) evidenceTopics.add('salinity');
      if (signal.type.startsWith('FCR_')) evidenceTopics.add('fcr');
    });
    if (metric.doMinimumLatest !== null && metric.doMinimumLatest < 5) evidenceTopics.add('dissolved_oxygen');
    if (metric.latestMortalityCount !== null && metric.latestMortalityCount > 0) { evidenceTopics.add('mortality'); evidenceTopics.add('disease_warning_signs'); }
    if (metric.latestTemperatureC !== null) evidenceTopics.add('temperature');
    const observations = metric.diagnosticContext.history.observations ?? [];
    if (observations.some(record => record.tanMgL !== undefined)) evidenceTopics.add('ammonia');
    if (observations.some(record => record.nitriteMgL !== undefined)) evidenceTopics.add('nitrite');
  });
  const waterIds = ['dissolved_oxygen', 'ph', 'ammonia', 'nitrite', 'salinity', 'alkalinity', 'plankton_transparency'];
  const score = (knowledge: ParameterKnowledge): number => {
    let value = 0;
    if (evidenceTopics.has(knowledge.id)) value += 80;
    if (focus.requestedParameter === knowledge.id) value += 120;
    if (questionMatchesKnowledge(userMessage, knowledge)) value += 100;
    if (focus.intent === 'feed' && knowledge.domain === 'feed') value += 50;
    if ((focus.intent === 'growth' || focus.intent === 'biomass' || focus.intent === 'survival') && knowledge.domain === 'growth') value += 50;
    if (focus.intent === 'lab' && knowledge.domain === 'lab') value += 50;
    if ((focus.intent === 'water_quality' || focus.intent === 'parameter_control') && waterIds.includes(knowledge.id)) value += 20;
    if (focus.route === 'inventory_product' && knowledge.domain === 'additive' && questionMatchesKnowledge(userMessage, knowledge)) value += 50;
    return value;
  };

  return ALL_PARAMETER_KNOWLEDGE
    .map((knowledge, index) => ({ knowledge, index, score: score(knowledge) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .map((item) => item.knowledge)
    .slice(0, 6)
    .map(knowledge => knowledge.id === 'nitrite' && hasUnverifiedNitrite ? {
      ...knowledge,
      target: undefined,
      warning: undefined,
      critical: undefined,
      evidenceBase: 'Nitrite was recorded with an unspecified analyte basis. Its risk category and toxicity are unavailable until NO2 versus NO2-N and the source unit are verified.',
      actions: { investigate: ['Confirm nitrite analyte basis, unit and method before comparing values to any numerical threshold.'] },
      cautions: ['Do not classify the unverified values as safe, warning, critical or toxic, and do not calculate a treatment from them.'],
    } : knowledge);
};

const selectCrossParameterRules = (
  parameterGuidance: ParameterKnowledge[],
  metrics: OrsonPondMetrics[],
  focus: OrsonQuestionFocus,
): CrossParameterRule[] => {
  if (focus.route !== 'farm_analysis') return [];
  const ids = new Set(parameterGuidance.map((knowledge) => knowledge.id));
  const selected: CrossParameterRule[] = [];
  const hasLowDo = metrics.some((metric) => metric.doMinimumLatest !== null && metric.doMinimumLatest < 5);
  const hasHighPhSwing = metrics.some((metric) => metric.phSwingLatest !== null && metric.phSwingLatest > 0.5);
  const hasFeedPressure = metrics.some((metric) => metric.feedBiomassModel.feedPressureRatio !== null && metric.feedBiomassModel.feedPressureRatio > 1.25);
  const hasSlowGrowth = metrics.some((metric) => metric.smoothedAdgGPerDay !== null && metric.smoothedAdgGPerDay < 0.15);

  CROSS_PARAMETER_RULES.forEach((rule) => {
    const text = normalize(`${rule.label} ${rule.conditions.join(' ')}`);
    const matchesKnowledge = Array.from(ids).some((id) => text.includes(normalize(id.replace(/_/g, ' '))));
    if (matchesKnowledge) selected.push(rule);
  });

  if (hasLowDo) selected.push(...CROSS_PARAMETER_RULES.filter((rule) => rule.id.includes('low_do')));
  if (hasFeedPressure) selected.push(CROSS_PARAMETER_RULES.find((rule) => rule.id === 'feed_pressure_poor_water')!);
  if (hasSlowGrowth) selected.push(CROSS_PARAMETER_RULES.find((rule) => rule.id === 'slow_growth_high_fcr')!);
  if (hasHighPhSwing) selected.push(CROSS_PARAMETER_RULES.find((rule) => rule.id === 'low_alkalinity_high_ph_swing')!);

  return uniqueById(selected.filter(Boolean)).slice(0, 5);
};

const buildMissingDataQuestions = (
  parameterGuidance: ParameterKnowledge[],
  metrics: OrsonPondMetrics[],
): string[] => {
  const questions: string[] = [];
  const selectedIds = new Set(parameterGuidance.map((knowledge) => knowledge.id));
  const hasPh = metrics.some((metric) => metric.phSwingLatest !== null);
  const hasDo = metrics.some((metric) => metric.doMinimumLatest !== null);
  const hasLabRisk = metrics.some((metric) => metric.labContext.latest !== null);

  if (selectedIds.has('ammonia')) {
    questions.push('TAN/NH3, pH, temperature, and DO are needed to confirm ammonia toxicity.');
  }
  if (selectedIds.has('nitrite')) {
    questions.push('NO2, DO, alkalinity, feed input, and appetite are needed to confirm nitrite stress.');
  }
  if (selectedIds.has('ph') && !hasPh) {
    questions.push('Morning and afternoon pH are needed to judge pH swing.');
  }
  if (selectedIds.has('dissolved_oxygen') && !hasDo) {
    questions.push('Morning and evening DO are needed to judge oxygen risk.');
  }
  if (selectedIds.has('microbial_lab_interpretation') && !hasLabRisk) {
    questions.push('Sample source, method, unit, date, and trend are needed before treating lab values as disease evidence.');
  }

  return Array.from(new Set(questions)).slice(0, 4);
};

export const selectOrsonKnowledge = (params: {
  userMessage: string;
  questionFocus: OrsonQuestionFocus;
  metrics: OrsonPondMetrics[];
}): SelectedKnowledge => {
  const parameterGuidance = selectParameterKnowledge(params.userMessage, params.questionFocus, params.metrics);
  const crossParameterRules = selectCrossParameterRules(parameterGuidance, params.metrics, params.questionFocus);
  const sourceIds = [
    ...parameterGuidance.flatMap((knowledge) => knowledge.sourceIds),
    ...crossParameterRules.flatMap((rule) => rule.sourceIds),
  ];

  return {
    parameterGuidance,
    crossParameterRules,
    missingDataQuestions: buildMissingDataQuestions(parameterGuidance, params.metrics),
    sourceLabels: getKnowledgeSourceLabels(sourceIds),
    sources: KNOWLEDGE_SOURCES.filter(source => sourceIds.includes(source.id)),
  };
};
