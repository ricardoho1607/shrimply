import type {
  OrsonPondMetrics,
  OrsonQuestionFocus,
} from '../types';
import { CROSS_PARAMETER_RULES } from './crossParameterRules';
import { FEED_KNOWLEDGE } from './feedKnowledge';
import { GROWTH_KNOWLEDGE } from './growthKnowledge';
import { LAB_KNOWLEDGE } from './labKnowledge';
import type { CrossParameterRule, ParameterKnowledge, SelectedKnowledge } from './knowledgeTypes';
import { getKnowledgeSourceLabels } from './sources';
import { WATER_QUALITY_KNOWLEDGE } from './waterQualityKnowledge';

const ALL_PARAMETER_KNOWLEDGE = [
  ...WATER_QUALITY_KNOWLEDGE,
  ...FEED_KNOWLEDGE,
  ...GROWTH_KNOWLEDGE,
  ...LAB_KNOWLEDGE,
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
): ParameterKnowledge[] => {
  const selected: ParameterKnowledge[] = [];

  if (focus.requestedParameter) {
    const byId = ALL_PARAMETER_KNOWLEDGE.find((knowledge) => knowledge.id === focus.requestedParameter);
    if (byId) selected.push(byId);
  }

  selected.push(...ALL_PARAMETER_KNOWLEDGE.filter((knowledge) => questionMatchesKnowledge(userMessage, knowledge)));

  if (focus.intent === 'feed') selected.push(...FEED_KNOWLEDGE);
  if (focus.intent === 'growth' || focus.intent === 'biomass' || focus.intent === 'survival') selected.push(...GROWTH_KNOWLEDGE);
  if (focus.intent === 'lab') selected.push(...LAB_KNOWLEDGE);
  if (focus.intent === 'water_quality' || focus.intent === 'parameter_control') {
    selected.push(...WATER_QUALITY_KNOWLEDGE.filter((knowledge) => {
      return ['dissolved_oxygen', 'ph', 'ammonia', 'nitrite', 'salinity', 'alkalinity', 'plankton_transparency'].includes(knowledge.id);
    }));
  }

  return uniqueById(selected).slice(0, 4);
};

const selectCrossParameterRules = (
  parameterGuidance: ParameterKnowledge[],
  metrics: OrsonPondMetrics[],
): CrossParameterRule[] => {
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
  const parameterGuidance = selectParameterKnowledge(params.userMessage, params.questionFocus);
  const crossParameterRules = selectCrossParameterRules(parameterGuidance, params.metrics);
  const sourceIds = [
    ...parameterGuidance.flatMap((knowledge) => knowledge.sourceIds),
    ...crossParameterRules.flatMap((rule) => rule.sourceIds),
  ];

  return {
    parameterGuidance,
    crossParameterRules,
    missingDataQuestions: buildMissingDataQuestions(parameterGuidance, params.metrics),
    sourceLabels: getKnowledgeSourceLabels(sourceIds),
  };
};
