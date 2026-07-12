import type {
  OrsonLabStatusLevel,
  OrsonPondMetrics,
  OrsonRiskFinding,
  OrsonRiskReport,
  OrsonRiskSeverity,
} from './types';
import { evaluateCrossParameterRules } from './knowledge/evaluateCrossParameterRules';

const severityRank: Record<OrsonRiskSeverity, number> = {
  info: 0,
  watch: 1,
  warning: 2,
  critical: 3,
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const hasNumber = (value: number | null): value is number => value !== null && Number.isFinite(value);

const highestSeverity = (findings: OrsonRiskFinding[]): OrsonRiskSeverity => {
  return findings.reduce<OrsonRiskSeverity>((highest, finding) => {
    return severityRank[finding.severity] > severityRank[highest] ? finding.severity : highest;
  }, 'info');
};

const confidenceFromCompleteness = (base: number, score: number) => round(Math.min(0.95, Math.max(0.25, base * (0.65 + score * 0.35))));

const createFinding = (finding: OrsonRiskFinding): OrsonRiskFinding => finding;

const severityFromLabStatus = (status: OrsonLabStatusLevel | null): OrsonRiskSeverity | null => {
  if (status === 'critical') return 'critical';
  if (status === 'warning') return 'warning';
  if (status === 'watch') return 'watch';
  return null;
};

export const analyzePondRisks = (metrics: OrsonPondMetrics, generatedAt = new Date()): OrsonRiskReport => {
  const findings: OrsonRiskFinding[] = [...evaluateCrossParameterRules(metrics)];
  const dataScore = metrics.dataCompleteness.score;
  const labSeverity = severityFromLabStatus(metrics.labContext.worstStatus);

  if (labSeverity) {
    const latestLab = metrics.labContext.latest ?? metrics.labContext.byType[0] ?? null;
    const labLabel = latestLab?.reportType ? `${latestLab.reportType.replace(/_/g, ' ')} lab` : 'Latest lab report';
    const issue = latestLab?.mainIssue ?? metrics.labContext.unresolvedRisks[0] ?? 'A lab result needs attention.';
    const evidence = [
      latestLab?.sampleDate ? `Sample date: ${latestLab.sampleDate}` : null,
      latestLab?.status ? `Lab status: ${latestLab.status}` : null,
      ...metrics.labContext.unresolvedRisks.slice(0, 3).map((risk) => `Lab risk: ${risk}`),
    ].filter((item): item is string => Boolean(item));

    findings.push(createFinding({
      id: 'lab_report_risk',
      severity: labSeverity,
      confidence: 0.9,
      title: 'Lab report needs attention',
      summary: `${labLabel} is marked ${metrics.labContext.worstStatus}: ${issue}`,
      evidence,
      recommendation: metrics.labContext.recommendations[0] ??
        'Treat the confirmed lab finding as high-confidence context and compare it with the latest water quality, growth, appetite, and mortality trends.',
      metricRefs: ['labContext'],
    }));
  }

  if (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 4) {
    findings.push(createFinding({
      id: 'low_do',
      severity: metrics.doMinimumLatest < 3.5 ? 'critical' : 'warning',
      confidence: confidenceFromCompleteness(0.92, dataScore),
      title: 'Low dissolved oxygen',
      summary: `Latest DO minimum is ${metrics.doMinimumLatest} mg/L.`,
      evidence: [
        `DO minimum: ${metrics.doMinimumLatest} mg/L`,
        `DO trend: ${metrics.doMinimumTrend.direction}`,
      ],
      recommendation: 'Increase aeration and recheck DO before the next feeding window, especially before sunrise.',
      metricRefs: ['doMinimumLatest', 'doMinimumTrend'],
    }));
  }

  if (metrics.doMinimumTrend.direction === 'down' && hasNumber(metrics.doMinimumTrend.delta) && metrics.doMinimumTrend.delta <= -0.5) {
    findings.push(createFinding({
      id: 'do_decline',
      severity: hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 4.2 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.78, dataScore),
      title: 'DO trend is declining',
      summary: `DO minimum is trending down by ${Math.abs(metrics.doMinimumTrend.delta)} mg/L across recent records.`,
      evidence: [
        `DO first/last: ${metrics.doMinimumTrend.first} -> ${metrics.doMinimumTrend.last} mg/L`,
        `Slope: ${metrics.doMinimumTrend.slopePerDay} mg/L/day`,
      ],
      recommendation: 'Avoid increasing feed until DO stabilizes; inspect aeration coverage and sludge load.',
      metricRefs: ['doMinimumTrend'],
    }));
  }

  if (hasNumber(metrics.phSwingLatest) && metrics.phSwingLatest > 0.7) {
    findings.push(createFinding({
      id: 'ph_instability',
      severity: metrics.phSwingLatest > 1 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.82, dataScore),
      title: 'Large pH swing',
      summary: `Latest morning/evening pH swing is ${metrics.phSwingLatest}.`,
      evidence: [
        `pH swing: ${metrics.phSwingLatest}`,
        `pH swing trend: ${metrics.phSwingTrend.direction}`,
      ],
      recommendation: 'Check alkalinity and plankton stability before pushing feed; large pH swings can signal algae instability.',
      metricRefs: ['phSwingLatest', 'phSwingTrend'],
    }));
  }

  if (metrics.phSwingTrend.direction === 'up' && hasNumber(metrics.phSwingTrend.delta) && metrics.phSwingTrend.delta >= 0.3) {
    findings.push(createFinding({
      id: 'unsafe_ph',
      severity: 'watch',
      confidence: confidenceFromCompleteness(0.72, dataScore),
      title: 'pH volatility increasing',
      summary: `pH swing increased by ${metrics.phSwingTrend.delta} across recent records.`,
      evidence: [
        `pH swing first/last: ${metrics.phSwingTrend.first} -> ${metrics.phSwingTrend.last}`,
      ],
      recommendation: 'Monitor morning pH and alkalinity closely; avoid sudden feed or water-management changes.',
      metricRefs: ['phSwingTrend'],
    }));
  }

  const feedTrendFirst = metrics.feedAllocationTrend.first;
  const feedTrendDelta = metrics.feedAllocationTrend.delta;
  const feedChangeRatio = hasNumber(feedTrendFirst) && feedTrendFirst > 0 && hasNumber(feedTrendDelta)
    ? feedTrendDelta / feedTrendFirst
    : null;

  if (metrics.feedAllocationTrend.direction === 'down' && hasNumber(feedChangeRatio) && feedChangeRatio <= -0.1) {
    findings.push(createFinding({
      id: 'feed_allocation_drop',
      severity: hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 4 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.84, dataScore),
      title: 'Feed allocation decreased',
      summary: `Logged daily feed decreased by ${round(Math.abs(feedChangeRatio) * 100, 1)}% across recent records.`,
      evidence: [
        `Daily feed first/last: ${metrics.feedAllocationTrend.first} -> ${metrics.feedAllocationTrend.last} kg`,
        `Feed pressure: ${metrics.feedBiomassModel.feedPressureRatio ?? 'unknown'}x`,
      ],
      recommendation: 'Confirm whether this was a planned schedule change, then review MBW, mortality, and water quality before increasing feed again.',
      metricRefs: ['feedAllocationTrend', 'feedBiomassModel.feedPressureRatio'],
    }));
  }

  if (hasNumber(metrics.feedBiomassModel.feedPressureRatio) && metrics.feedBiomassModel.feedPressureRatio > 1.25) {
    findings.push(createFinding({
      id: 'feed_pressure_high',
      severity: metrics.feedBiomassModel.feedPressureRatio > 1.75 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.86, dataScore),
      title: 'Feed pressure is high',
      summary: `Actual feed is ${metrics.feedBiomassModel.feedPressureRatio}x the expected feed for current biomass assumptions.`,
      evidence: [
        `Expected feed: ${metrics.feedBiomassModel.expectedFeedKg} kg`,
        `Actual feed: ${metrics.feedBiomassModel.actualFeedKg} kg`,
        `Feed rate: ${metrics.feedBiomassModel.feedRatePercent}% of biomass`,
      ],
      recommendation: 'Review the latest MBW, population assumptions, mortality, and water quality before increasing feed further.',
      metricRefs: ['feedBiomassModel.feedPressureRatio', 'feedBiomassModel.expectedFeedKg', 'feedBiomassModel.actualFeedKg'],
    }));
  }

  if (hasNumber(metrics.feedBiomassModel.feedPressureRatio) && metrics.feedBiomassModel.feedPressureRatio < 0.75) {
    findings.push(createFinding({
      id: 'feed_pressure_low',
      severity: 'watch',
      confidence: confidenceFromCompleteness(0.7, dataScore),
      title: 'Feed pressure is low',
      summary: `Actual feed is ${metrics.feedBiomassModel.feedPressureRatio}x the expected feed.`,
      evidence: [
        `Expected feed: ${metrics.feedBiomassModel.expectedFeedKg} kg`,
        `Actual feed: ${metrics.feedBiomassModel.actualFeedKg} kg`,
      ],
      recommendation: 'Check whether biomass, MBW, or survival assumptions are too high before changing feeding.',
      metricRefs: ['feedBiomassModel.feedPressureRatio'],
    }));
  }

  if (
    hasNumber(metrics.feedBiomassModel.feedBasedPopulation)
    && hasNumber(metrics.estimatedCurrentPopulation)
    && metrics.estimatedCurrentPopulation > 0
  ) {
    const differenceRatio = Math.abs(metrics.feedBiomassModel.feedBasedPopulation - metrics.estimatedCurrentPopulation) / metrics.estimatedCurrentPopulation;
    if (differenceRatio > 0.35) {
      findings.push(createFinding({
        id: 'biomass_model_disagreement',
        severity: differenceRatio > 0.75 ? 'warning' : 'watch',
        confidence: confidenceFromCompleteness(0.8, dataScore),
        title: 'Biomass model disagreement',
        summary: `Feed-based population and mortality-based population differ by ${round(differenceRatio * 100, 1)}%.`,
        evidence: [
          `Mortality-based population: ${metrics.estimatedCurrentPopulation}`,
          `Feed-based population: ${metrics.feedBiomassModel.feedBasedPopulation}`,
          `Biomass range: ${metrics.feedBiomassModel.biomassRangeKg.low}-${metrics.feedBiomassModel.biomassRangeKg.high} kg`,
        ],
        recommendation: 'Treat biomass as a range. Verify sampling accuracy and tray clearance before increasing feed.',
        metricRefs: ['estimatedCurrentPopulation', 'feedBiomassModel.feedBasedPopulation', 'feedBiomassModel.biomassRangeKg'],
      }));
    }
  }

  if (hasNumber(metrics.smoothedAdgGPerDay) && hasNumber(metrics.currentDoc) && metrics.currentDoc > 10) {
    const expectedAdg = metrics.currentDoc <= 30 ? 0.15 : 0.2;
    if (metrics.smoothedAdgGPerDay < expectedAdg * 0.7) {
      findings.push(createFinding({
        id: 'slow_growth',
        severity: 'watch',
        confidence: confidenceFromCompleteness(0.68, dataScore),
        title: 'Slow growth signal',
        summary: `Smoothed ADG is ${metrics.smoothedAdgGPerDay} g/day, below the current expected baseline.`,
        evidence: [
          `Smoothed ADG: ${metrics.smoothedAdgGPerDay} g/day`,
          `Expected baseline: ${round(expectedAdg, 2)} g/day`,
          ...(metrics.labContext.unresolvedRisks.length > 0
            ? [`Recent lab context: ${metrics.labContext.unresolvedRisks.slice(0, 2).join('; ')}`]
            : []),
        ],
        recommendation: 'Review feed conversion, water stability, and sampling consistency before adjusting feed upward.',
        metricRefs: ['smoothedAdgGPerDay', 'currentDoc'],
      }));
    }
  }

  if (hasNumber(metrics.fcr) && metrics.fcr > 1.6) {
    findings.push(createFinding({
      id: 'high_fcr',
      severity: metrics.fcr > 2 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.76, dataScore),
      title: 'High FCR',
      summary: `Estimated FCR is ${metrics.fcr}.`,
      evidence: [
        `FCR: ${metrics.fcr}`,
        `Total feed: ${metrics.totalFeedKg} kg`,
        `Biomass gain: ${metrics.biomassGainKg ?? 'unknown'} kg`,
      ],
      recommendation: 'Check feed waste, tray clearance, and biomass estimate; high FCR often means feed is outrunning real biomass gain.',
      metricRefs: ['fcr', 'totalFeedKg', 'biomassGainKg'],
    }));
  }

  if (metrics.mortalityTrend.direction === 'up' && hasNumber(metrics.mortalityTrend.delta) && metrics.mortalityTrend.delta > 0) {
    findings.push(createFinding({
      id: 'mortality_spike',
      severity: metrics.mortalityTrend.delta > 500 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.72, dataScore),
      title: 'Mortality is increasing',
      summary: `Mortality increased by ${metrics.mortalityTrend.delta} across recent records.`,
      evidence: [
        `Mortality first/last: ${metrics.mortalityTrend.first} -> ${metrics.mortalityTrend.last}`,
      ],
      recommendation: 'Inspect pond edge, check DO before sunrise, and pause feed increases until mortality stabilizes.',
      metricRefs: ['mortalityTrend'],
    }));
  }

  if (hasNumber(metrics.salinityTrend.delta) && Math.abs(metrics.salinityTrend.delta) >= 5) {
    findings.push(createFinding({
      id: 'salinity_shock',
      severity: Math.abs(metrics.salinityTrend.delta) >= 8 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.7, dataScore),
      title: 'Salinity shift detected',
      summary: `Salinity changed by ${Math.abs(metrics.salinityTrend.delta)} ppt across recent records.`,
      evidence: [
        `Salinity first/last: ${metrics.salinityTrend.first} -> ${metrics.salinityTrend.last} ppt`,
      ],
      recommendation: 'Avoid abrupt water exchange and watch appetite response after salinity movement.',
      metricRefs: ['salinityTrend'],
    }));
  }

  if (metrics.dataCompleteness.score < 0.7 || metrics.dataCompleteness.missingFields.includes('latestWaterQuality')) {
    findings.push(createFinding({
      id: 'missing_data',
      severity: 'info',
      confidence: 0.95,
      title: 'Orson confidence is limited',
      summary: `Data completeness is ${round(metrics.dataCompleteness.score * 100, 0)}%.`,
      evidence: [
        `Missing: ${metrics.dataCompleteness.missingFields.join(', ') || 'none'}`,
      ],
      recommendation: 'Add the missing measurements so Orson can raise confidence and reduce guesswork.',
      metricRefs: ['dataCompleteness'],
    }));
  }

  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence);

  return {
    pondId: metrics.pondId,
    pondName: metrics.pondName,
    overallSeverity: highestSeverity(findings),
    findings,
    generatedAt: generatedAt.toISOString(),
  };
};

export const analyzePondsRisks = (metrics: OrsonPondMetrics[], generatedAt = new Date()): OrsonRiskReport[] => {
  return metrics.map((pondMetrics) => analyzePondRisks(pondMetrics, generatedAt));
};
