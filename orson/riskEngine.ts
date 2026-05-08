import type {
  OrsonPondMetrics,
  OrsonRiskFinding,
  OrsonRiskReport,
  OrsonRiskSeverity,
} from './types';

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

export const analyzePondRisks = (metrics: OrsonPondMetrics, generatedAt = new Date()): OrsonRiskReport => {
  const findings: OrsonRiskFinding[] = [];
  const dataScore = metrics.dataCompleteness.score;

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

  if (metrics.appetiteTrend.direction === 'down' && hasNumber(metrics.appetiteTrend.delta) && metrics.appetiteTrend.delta <= -15) {
    findings.push(createFinding({
      id: 'appetite_drop',
      severity: metrics.feedBiomassModel.feedPressureRatio && metrics.feedBiomassModel.feedPressureRatio > 1.1 ? 'warning' : 'watch',
      confidence: confidenceFromCompleteness(0.84, dataScore),
      title: 'Appetite is dropping',
      summary: `Tray clearance dropped by ${Math.abs(metrics.appetiteTrend.delta)} percentage points.`,
      evidence: [
        `Appetite first/last: ${metrics.appetiteTrend.first}% -> ${metrics.appetiteTrend.last}%`,
        `Feed pressure: ${metrics.feedBiomassModel.feedPressureRatio ?? 'unknown'}x`,
      ],
      recommendation: 'Do not increase feed. Hold or reduce feed until tray clearance recovers and water quality is stable.',
      metricRefs: ['appetiteTrend', 'feedBiomassModel.feedPressureRatio'],
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
      recommendation: 'Use tray response as the throttle. Step feed down or hold feed before increasing biomass assumptions.',
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
