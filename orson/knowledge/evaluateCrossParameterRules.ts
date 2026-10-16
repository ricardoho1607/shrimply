import type { OrsonPondMetrics, OrsonRiskFinding } from '../types';
import { CROSS_PARAMETER_RULES } from './crossParameterRules';
import { differenceInFarmCalendarDays } from '../../shared/farmDate';
import { evaluateMeasurementFreshness } from '../../shared/orsonEvidence';

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
    summary: `${rule.label}. Possible consequences, not confirmed observations: ${rule.couldLeadTo.join(', ')}.`,
    evidence,
    recommendation: rule.actions.join('; '),
    metricRefs: ['knowledge.crossParameterRules', ...rule.conditions],
  };
};

export const evaluateCrossParameterRules = (metrics: OrsonPondMetrics): OrsonRiskFinding[] => {
  const findings: OrsonRiskFinding[] = [];
  const asOfDateKey = metrics.evidence?.asOfTimestamp ?? metrics.evidence?.asOfDate ?? new Date();
  const timeZone = metrics.evidence?.timeZone;
  const feedPressureHigh = hasNumber(metrics.feedBiomassModel.feedPressureRatio) && metrics.feedBiomassModel.feedPressureRatio > 1.25;
  const waterQualityWeak = (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5) ||
    (hasNumber(metrics.phSwingLatest) && metrics.phSwingLatest > 0.5);

  if (feedPressureHigh && waterQualityWeak) {
    const feedEvidence = metrics.evidence?.allMetrics?.daily_feed ?? metrics.evidence?.dailyFeed ?? null;
    const waterEvidence = hasNumber(metrics.doMinimumLatest)
      ? metrics.evidence?.allMetrics?.doMinimumMgL ?? null
      : metrics.evidence?.allMetrics?.phSwing ?? null;
    const feedDate = feedEvidence?.date ?? null;
    const waterDate = waterEvidence?.date ?? null;
    const feedFresh = Boolean(feedEvidence?.isFresh && feedDate && evaluateMeasurementFreshness(feedEvidence, asOfDateKey, { domain: 'dailyFeed', timeZone }).isFresh);
    const waterFresh = Boolean(waterEvidence?.isFresh && waterDate && evaluateMeasurementFreshness(waterEvidence, asOfDateKey, { domain: 'water', timeZone }).isFresh);
    const dayDiff = (feedDate && waterDate) ? Math.abs(differenceInFarmCalendarDays(feedDate, waterDate)) : 0;
    const isCompatible = feedFresh && waterFresh && dayDiff === 0 && Boolean(feedDate && waterDate);

    if (isCompatible) {
      const finding = createFinding(metrics, 'feed_pressure_poor_water', [
        `Feed pressure: ${metrics.feedBiomassModel.feedPressureRatio}x expected`,
        hasNumber(metrics.doMinimumLatest) ? `DO minimum: ${metrics.doMinimumLatest} mg/L` : `pH swing: ${metrics.phSwingLatest}`,
        ...(waterDate ? [`Observation date: ${waterDate}`] : []),
      ]);
      if (finding) {
        if (waterDate) finding.eventDate = waterDate;
        findings.push({
          ...finding,
          supportingMetricKeys: ['daily_feed', hasNumber(metrics.doMinimumLatest) ? 'doMinimumMgL' : 'phSwing'],
          requiresSameDateEvidence: true,
        });
      }
    } else {
      const rule = getRule('feed_pressure_poor_water');
      if (rule) {
        findings.push({
          id: 'cross_parameter_risk',
          severity: 'watch',
          confidence: confidenceFromCompleteness(metrics.dataCompleteness.score) * 0.8,
          title: `${rule.label} (differing dates)`,
          summary: `${rule.label}: differing observation dates between feed pressure (${feedDate ?? 'unknown'}) and water quality (${waterDate ?? 'unknown'}); qualified history.`,
          evidence: [
            `Feed pressure: ${metrics.feedBiomassModel.feedPressureRatio}x expected on ${feedDate ?? 'unknown'}`,
            hasNumber(metrics.doMinimumLatest) ? `DO minimum: ${metrics.doMinimumLatest} mg/L on ${waterDate ?? 'unknown'}` : `pH swing: ${metrics.phSwingLatest} on ${waterDate ?? 'unknown'}`,
            'Temporal status: differing observation dates (qualified history)',
          ],
          recommendation: 'Check simultaneous water quality and feed response before modifying feed schedules.',
          metricRefs: ['knowledge.crossParameterRules', ...rule.conditions],
          supportingMetricKeys: ['daily_feed', hasNumber(metrics.doMinimumLatest) ? 'doMinimumMgL' : 'phSwing'],
          requiresSameDateEvidence: true,
          eventDate: waterDate ?? feedDate ?? undefined,
          isHistorical: true,
          status: 'historical',
        });
      }
    }
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
      const mbwEvidence = metrics.evidence?.allMetrics?.mbw ?? metrics.evidence?.mbw ?? null;
      const mbwDate = mbwEvidence?.date ?? metrics.latestMbwDate ?? null;
      const isMbwFresh = Boolean(mbwEvidence?.isFresh && mbwDate && evaluateMeasurementFreshness(mbwEvidence, asOfDateKey, { domain: 'mbw', timeZone }).isFresh);

      const rule = getRule('slow_growth_high_fcr');
      if (rule) {
        if (isMbwFresh) {
          const finding = createFinding(metrics, 'slow_growth_high_fcr', [
            `Smoothed ADG: ${metrics.smoothedAdgGPerDay} g/day`,
            `FCR: ${metrics.fcr}`,
            ...(mbwDate ? [`Latest MBW date: ${mbwDate}`] : []),
          ]);
          if (finding) {
            if (mbwDate) finding.eventDate = mbwDate;
            findings.push({ ...finding, supportingMetricKeys: ['mbw'] });
          }
        } else {
          findings.push({
            id: 'cross_parameter_risk',
            severity: 'watch',
            confidence: confidenceFromCompleteness(metrics.dataCompleteness.score) * 0.8,
            title: `${rule.label} (historical)`,
            summary: `${rule.label}: MBW sample is ${mbwDate ? 'from ' + mbwDate : 'stale'}; qualified history.`,
            evidence: [
              `Smoothed ADG: ${metrics.smoothedAdgGPerDay} g/day`,
              `FCR: ${metrics.fcr}`,
              'Temporal status: stale growth observation (qualified history)',
            ],
            recommendation: 'Sample MBW again to verify current growth rate and feed conversion before altering feed allocation.',
            metricRefs: ['knowledge.crossParameterRules', ...rule.conditions],
            supportingMetricKeys: ['mbw'],
            eventDate: mbwDate ?? undefined,
            isHistorical: true,
            status: 'historical',
          });
        }
      }
    }
  }

  return findings;
};
