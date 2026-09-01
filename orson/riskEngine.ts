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

const hasNumber = (value: number | null | undefined): value is number => value !== null && value !== undefined && Number.isFinite(value);

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

const latestLabWaterMetrics = (metrics: OrsonPondMetrics) => {
  const statuses = [
    ...(metrics.labContext.latest ? [metrics.labContext.latest] : []),
    ...metrics.labContext.byType,
  ].sort((a, b) => (b.sampleDate ?? '').localeCompare(a.sampleDate ?? ''));
  return statuses.find((status) => status.metrics?.waterQuality)?.metrics?.waterQuality ?? null;
};

export const analyzePondRisks = (metrics: OrsonPondMetrics, generatedAt = new Date()): OrsonRiskReport => {
  const findings: OrsonRiskFinding[] = [...evaluateCrossParameterRules(metrics)];
  const dataScore = metrics.dataCompleteness.score;
  const labSeverity = severityFromLabStatus(metrics.labContext.worstStatus);
  const labWater = latestLabWaterMetrics(metrics);
  const latestPhValues = [metrics.latestPhMorning, metrics.latestPhEvening].filter(hasNumber);
  const latestPhMinimum = latestPhValues.length > 0 ? Math.min(...latestPhValues) : null;
  const latestPhMaximum = latestPhValues.length > 0 ? Math.max(...latestPhValues) : null;
  const latestDoRecord = [...metrics.dailyRecords14d].reverse().find((record) => hasNumber(record.doMinimumMgL)) ?? null;
  const latestAmmoniaRecord = [...metrics.dailyRecords14d].reverse().find((record) => hasNumber(record.ammoniaMgL)) ?? null;
  const latestWeatherRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.weatherEvent !== null) ?? null;
  const latestSludgeRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.sludgeLoad !== null) ?? null;
  const latestScumRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.surfaceScum !== null) ?? null;
  const latestBehaviourRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.shrimpBehaviour !== null) ?? null;

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

  if (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5) {
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
      eventDate: latestDoRecord?.date,
    }));
  }

  if (latestAmmoniaRecord && hasNumber(latestAmmoniaRecord.ammoniaMgL) && latestAmmoniaRecord.ammoniaMgL >= 0.01) {
    findings.push(createFinding({
      id: 'ammonia_elevated',
      severity: 'warning',
      confidence: confidenceFromCompleteness(0.86, dataScore),
      title: 'Field ammonia reading needs verification',
      summary: `Latest field ammonia is ${latestAmmoniaRecord.ammoniaMgL} mg/L; its TAN or NH3 basis is not recorded.`,
      evidence: [`Field ammonia: ${latestAmmoniaRecord.ammoniaMgL} mg/L`, `Record date: ${latestAmmoniaRecord.date}`],
      recommendation: 'Protect DO, hold feed increases, and confirm whether the field result is TAN or NH3 with pH and temperature before choosing a correction.',
      metricRefs: ['dailyRecords14d.ammoniaMgL'],
      eventDate: latestAmmoniaRecord.date,
    }));
  }

  if (latestBehaviourRecord?.shrimpBehaviour === 'abnormal') {
    findings.push(createFinding({
      id: 'abnormal_shrimp_behaviour',
      severity: 'warning',
      confidence: 0.92,
      title: 'Abnormal shrimp behaviour recorded',
      summary: `Abnormal shrimp behaviour was recorded on ${latestBehaviourRecord.date}.`,
      evidence: [`Shrimp behaviour: abnormal`, `Record date: ${latestBehaviourRecord.date}`],
      recommendation: 'Check DO, feed response, mortality, and pond-edge observations promptly; escalate under the farm health SOP if the behaviour continues.',
      metricRefs: ['dailyRecords14d.shrimpBehaviour'],
      eventDate: latestBehaviourRecord.date,
    }));
  }

  if (
    latestWeatherRecord?.weatherEvent === 'heavy_rain'
    && hasNumber(latestWeatherRecord.doMinimumMgL)
    && latestWeatherRecord.doMinimumMgL < 5
  ) {
    findings.push(createFinding({
      id: 'heavy_rain_low_do',
      severity: latestWeatherRecord.doMinimumMgL < 3.5 ? 'critical' : 'warning',
      confidence: 0.88,
      title: 'Heavy rain combined with low DO',
      summary: `Heavy rain and DO of ${latestWeatherRecord.doMinimumMgL} mg/L were recorded on ${latestWeatherRecord.date}.`,
      evidence: [
        `Weather event: heavy rain`,
        `DO minimum: ${latestWeatherRecord.doMinimumMgL} mg/L`,
        `Water exchange: ${latestWeatherRecord.waterExchangePercent !== null && latestWeatherRecord.waterExchangePercent !== undefined ? `${latestWeatherRecord.waterExchangePercent}%` : 'not recorded'}`,
      ],
      recommendation: 'Protect aeration, recheck DO and pH after the rain, and avoid feed increases until the pond is stable.',
      metricRefs: ['dailyRecords14d.weatherEvent', 'dailyRecords14d.doMinimumMgL', 'dailyRecords14d.waterExchangePercent'],
      eventDate: latestWeatherRecord.date,
    }));
  }

  if (latestSludgeRecord?.sludgeLoad === 'high') {
    findings.push(createFinding({
      id: 'high_sludge_load',
      severity: 'warning',
      confidence: 0.9,
      title: 'High sludge load recorded',
      summary: `High sludge load was recorded on ${latestSludgeRecord.date}.`,
      evidence: [`Sludge load: high`, `Record date: ${latestSludgeRecord.date}`],
      recommendation: 'Protect aeration, review feed waste, and follow the farm sludge-management procedure.',
      metricRefs: ['dailyRecords14d.sludgeLoad'],
      eventDate: latestSludgeRecord.date,
    }));
  }

  if (latestScumRecord?.surfaceScum === true) {
    findings.push(createFinding({
      id: 'surface_scum_observed',
      severity: 'warning',
      confidence: 0.88,
      title: 'Surface scum observed',
      summary: `Surface scum was recorded on ${latestScumRecord.date}.`,
      evidence: [`Surface scum: observed`, `Record date: ${latestScumRecord.date}`],
      recommendation: 'Inspect pond colour and plankton condition, protect DO, and avoid abrupt bloom-control changes.',
      metricRefs: ['dailyRecords14d.surfaceScum'],
      eventDate: latestScumRecord.date,
    }));
  }

  const phCritical = (hasNumber(latestPhMinimum) && latestPhMinimum < 7)
    || (hasNumber(latestPhMaximum) && latestPhMaximum > 9);
  const phWarning = (hasNumber(latestPhMinimum) && latestPhMinimum >= 7 && latestPhMinimum <= 7.4)
    || (hasNumber(latestPhMaximum) && latestPhMaximum >= 8.6 && latestPhMaximum <= 9);
  if (phCritical || phWarning) {
    findings.push(createFinding({
      id: 'unsafe_ph',
      severity: phCritical ? 'critical' : 'warning',
      confidence: confidenceFromCompleteness(0.9, dataScore),
      title: 'pH is outside the safe operating range',
      summary: `Latest pH is outside the 7.5-8.5 target range.`,
      evidence: [
        `Morning pH: ${metrics.latestPhMorning ?? 'missing'}`,
        `Evening pH: ${metrics.latestPhEvening ?? 'missing'}`,
      ],
      recommendation: 'Recheck pH and alkalinity before changing feed or water-management inputs; avoid abrupt chemical correction.',
      metricRefs: ['latestPhMorning', 'latestPhEvening'],
    }));
  }

  if (
    hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5
    && hasNumber(metrics.latestTemperatureC) && metrics.latestTemperatureC > 30
  ) {
    findings.push(createFinding({
      id: 'low_do_high_temperature',
      severity: 'warning',
      confidence: confidenceFromCompleteness(0.86, dataScore),
      title: 'Low DO combined with high temperature',
      summary: `DO is ${metrics.doMinimumLatest} mg/L while temperature is ${metrics.latestTemperatureC} C.`,
      evidence: [`DO minimum: ${metrics.doMinimumLatest} mg/L`, `Temperature: ${metrics.latestTemperatureC} C`],
      recommendation: 'Increase aeration, avoid feed increases, and recheck early-morning DO and temperature.',
      metricRefs: ['doMinimumLatest', 'latestTemperatureC'],
    }));
  }

  if (labWater && hasNumber(labWater.tanMgL) && labWater.tanMgL > 1) {
    if (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 4) {
      findings.push(createFinding({
        id: 'low_do_high_tan',
        severity: 'critical',
        confidence: 0.9,
        title: 'Low DO combined with high TAN',
        summary: `TAN is ${labWater.tanMgL} mg/L while DO is ${metrics.doMinimumLatest} mg/L.`,
        evidence: [`TAN: ${labWater.tanMgL} mg/L`, `DO minimum: ${metrics.doMinimumLatest} mg/L`],
        recommendation: 'Increase aeration immediately, hold feed increases, inspect organic load, and retest TAN, pH, temperature, and DO.',
        metricRefs: ['labContext.metrics.waterQuality.tanMgL', 'doMinimumLatest'],
      }));
    }
    if (hasNumber(latestPhMaximum) && latestPhMaximum > 8.5) {
      findings.push(createFinding({
        id: 'high_ph_high_tan',
        severity: 'critical',
        confidence: 0.9,
        title: 'High pH combined with high TAN',
        summary: `TAN is ${labWater.tanMgL} mg/L while pH reaches ${latestPhMaximum}.`,
        evidence: [`TAN: ${labWater.tanMgL} mg/L`, `Highest latest pH: ${latestPhMaximum}`],
        recommendation: 'Do not raise pH or feed pressure; strengthen aeration and retest TAN/NH3 with pH and temperature.',
        metricRefs: ['labContext.metrics.waterQuality.tanMgL', 'latestPhMorning', 'latestPhEvening'],
      }));
    }
  }

  if (labWater && hasNumber(labWater.nh3MgL) && labWater.nh3MgL >= 0.01) {
    findings.push(createFinding({
      id: 'nh3_elevated',
      severity: labWater.nh3MgL > 0.05 ? 'critical' : 'warning',
      confidence: 0.92,
      title: 'Unionized ammonia is elevated',
      summary: `Confirmed lab NH3 is ${labWater.nh3MgL} mg/L.`,
      evidence: [`NH3: ${labWater.nh3MgL} mg/L`],
      recommendation: 'Hold feed increases, protect DO, reduce organic-load drivers, and follow the confirmed lab recommendation.',
      metricRefs: ['labContext.metrics.waterQuality.nh3MgL'],
    }));
  }

  if (
    labWater && hasNumber(labWater.nitriteMgL) && labWater.nitriteMgL > 0.3
    && hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5
  ) {
    findings.push(createFinding({
      id: 'high_nitrite_low_do',
      severity: 'critical',
      confidence: 0.9,
      title: 'High nitrite combined with low DO',
      summary: `Nitrite is ${labWater.nitriteMgL} mg/L while DO is ${metrics.doMinimumLatest} mg/L.`,
      evidence: [`NO2: ${labWater.nitriteMgL} mg/L`, `DO minimum: ${metrics.doMinimumLatest} mg/L`],
      recommendation: 'Increase aeration, reduce feed pressure, check alkalinity and organic load, and retest nitrite.',
      metricRefs: ['labContext.metrics.waterQuality.nitriteMgL', 'doMinimumLatest'],
    }));
  }

  if (
    labWater && hasNumber(labWater.alkalinityMgL) && labWater.alkalinityMgL < 80
    && hasNumber(metrics.phSwingLatest) && metrics.phSwingLatest > 0.5
  ) {
    findings.push(createFinding({
      id: 'low_alkalinity_high_ph_swing',
      severity: 'warning',
      confidence: 0.88,
      title: 'Low alkalinity combined with unstable pH',
      summary: `Alkalinity is ${labWater.alkalinityMgL} mg/L while pH swing is ${metrics.phSwingLatest}.`,
      evidence: [`Alkalinity: ${labWater.alkalinityMgL} mg/L`, `pH swing: ${metrics.phSwingLatest}`],
      recommendation: 'Use the farm-approved gradual buffering protocol and monitor morning and evening pH after correction.',
      metricRefs: ['labContext.metrics.waterQuality.alkalinityMgL', 'phSwingLatest'],
    }));
  }

  const transparencyOutsideTarget = hasNumber(metrics.latestTransparencyCm)
    && (metrics.latestTransparencyCm < 25 || metrics.latestTransparencyCm > 45);
  const waterUnstable = (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5)
    || (hasNumber(metrics.phSwingLatest) && metrics.phSwingLatest > 0.5);
  if (transparencyOutsideTarget && waterUnstable) {
    findings.push(createFinding({
      id: 'plankton_transparency_instability',
      severity: 'watch',
      confidence: confidenceFromCompleteness(0.78, dataScore),
      title: 'Transparency and water stability need attention',
      summary: `Transparency is ${metrics.latestTransparencyCm} cm while DO or pH is unstable.`,
      evidence: [
        `Transparency: ${metrics.latestTransparencyCm} cm`,
        `DO minimum: ${metrics.doMinimumLatest ?? 'missing'} mg/L; pH swing: ${metrics.phSwingLatest ?? 'missing'}`,
      ],
      recommendation: 'Check pond color and plankton condition, maintain aeration, and avoid abrupt bloom-control or feed changes.',
      metricRefs: ['latestTransparencyCm', 'doMinimumLatest', 'phSwingLatest'],
    }));
  }

  if (metrics.mbwOutlierDates.length > 0) {
    findings.push(createFinding({
      id: 'mbw_outlier',
      severity: 'info',
      confidence: metrics.mbwOutlierDates.length > 0 && metrics.smoothedAdgGPerDay === null ? 0.5 : 0.72,
      title: 'A suspicious MBW sample was excluded from the growth trend',
      summary: `Orson excluded ${metrics.mbwOutlierDates.length} suspicious MBW sample${metrics.mbwOutlierDates.length === 1 ? '' : 's'} from smoothed ADG.`,
      evidence: [`Outlier dates: ${metrics.mbwOutlierDates.join(', ')}`],
      recommendation: 'Keep the raw record for audit and verify sampling method or repeat the MBW check before changing feed.',
      metricRefs: ['mbwOutlierDates', 'smoothedAdgGPerDay'],
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

  const mortalityWarningFloor = hasNumber(metrics.estimatedCurrentPopulation)
    ? Math.max(100, metrics.estimatedCurrentPopulation * 0.002)
    : 100;
  if (hasNumber(metrics.latestMortalityCount) && metrics.latestMortalityCount > mortalityWarningFloor) {
    findings.push(createFinding({
      id: 'mortality_spike',
      severity: 'warning',
      confidence: confidenceFromCompleteness(0.72, dataScore),
      title: 'Mortality exceeds the pond warning floor',
      summary: `Latest mortality is ${metrics.latestMortalityCount}${hasNumber(metrics.latestMortalityPercent) ? ` (${metrics.latestMortalityPercent}% of estimated population)` : ''}.`,
      evidence: [
        `Warning floor: ${round(mortalityWarningFloor, 0)} shrimp`,
        `Record date: ${metrics.latestMortalityDate ?? 'missing'}`,
      ],
      recommendation: 'Inspect pond edge, check DO before sunrise, and pause feed increases until mortality stabilizes.',
      metricRefs: ['latestMortalityCount', 'latestMortalityPercent', 'estimatedCurrentPopulation'],
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
