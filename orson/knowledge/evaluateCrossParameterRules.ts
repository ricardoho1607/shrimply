import type { OrsonPondMetrics, OrsonRiskFinding } from '../types';
import { CROSS_PARAMETER_RULES } from './crossParameterRules';

const hasNumber = (value: number | null): value is number => value !== null && Number.isFinite(value);

const getRule = (id: string) => CROSS_PARAMETER_RULES.find((rule) => rule.id === id);

const confidenceFromCompleteness = (score: number) => Math.min(0.9, Math.max(0.4, 0.65 + score * 0.25));

const createFinding = (
  metrics: OrsonPondMetrics,
  ruleId: string,
  evidence: string[],
): OrsonRiskFinding | null => {
  const rule = getRule(ruleId);
  if (!rule) return null;

  return {
    id: 'cross_parameter_risk',
    severity: rule.severity,
    confidence: confidenceFromCompleteness(metrics.dataCompleteness.score),
    title: rule.label,
    summary: `${rule.label}: ${rule.couldLeadTo.join(', ')}.`,
    evidence,
    recommendation: rule.actions.join('; '),
    metricRefs: ['knowledge.crossParameterRules', ...rule.conditions],
  };
};

export const evaluateCrossParameterRules = (metrics: OrsonPondMetrics): OrsonRiskFinding[] => {
  const findings: OrsonRiskFinding[] = [];
  const feedPressureHigh = hasNumber(metrics.feedBiomassModel.feedPressureRatio) && metrics.feedBiomassModel.feedPressureRatio > 1.25;
  const waterQualityWeak = (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5) ||
    (hasNumber(metrics.phSwingLatest) && metrics.phSwingLatest > 0.5);

  if (feedPressureHigh && waterQualityWeak) {
    const finding = createFinding(metrics, 'feed_pressure_poor_water', [
      `Feed pressure: ${metrics.feedBiomassModel.feedPressureRatio}x expected`,
      hasNumber(metrics.doMinimumLatest) ? `DO minimum: ${metrics.doMinimumLatest} mg/L` : `pH swing: ${metrics.phSwingLatest}`,
    ]);
    if (finding) findings.push(finding);
  }

  if (
    metrics.growthEvidence?.adgSource === 'measured' &&
    hasNumber(metrics.smoothedAdgGPerDay) &&
    hasNumber(metrics.currentDoc) &&
    metrics.currentDoc > 10 &&
    hasNumber(metrics.fcr) &&
    metrics.fcr > 1.6
  ) {
    const expectedAdg = metrics.currentDoc <= 30 ? 0.15 : 0.2;
    if (metrics.smoothedAdgGPerDay < expectedAdg * 0.7) {
      const finding = createFinding(metrics, 'slow_growth_high_fcr', [
        `Smoothed ADG: ${metrics.smoothedAdgGPerDay} g/day`,
        `FCR: ${metrics.fcr}`,
      ]);
      if (finding) findings.push(finding);
    }
  }

  return findings;
};
