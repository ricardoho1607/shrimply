import type {
  OrsonLabStatusLevel,
  OrsonPondMetrics,
  OrsonRiskFinding,
  OrsonRiskReport,
  OrsonRiskSeverity,
} from './types';
import { evaluateCrossParameterRules } from './knowledge/evaluateCrossParameterRules';
import { differenceInFarmCalendarDays } from '../shared/farmDate';
import {
  comparePondRiskReports,
  evaluateMeasurementFreshness,
  compareRiskFindings,
} from '../shared/orsonEvidence';

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
    if (finding.isHistorical || finding.status === 'historical') return highest;
    return severityRank[finding.severity] > severityRank[highest] ? finding.severity : highest;
  }, 'info');
};

const confidenceFromCompleteness = (base: number, score: number) => round(Math.min(0.95, Math.max(0.25, base * (0.65 + score * 0.35))));

const createFinding = (finding: OrsonRiskFinding): OrsonRiskFinding => finding;

const evidenceKeysByFinding: Record<string, string[]> = {
  low_do: ['doMinimumMgL'],
  do_decline: ['doMinimumMgL'],
  ammonia_elevated: ['ammoniaMgL'],
  abnormal_shrimp_behaviour: ['shrimpBehaviour'],
  heavy_rain_low_do: ['weatherEvent', 'doMinimumMgL'],
  high_sludge_load: ['sludgeLoad'],
  surface_scum_observed: ['surfaceScum'],
  unsafe_ph: ['phMorning', 'phEvening'],
  ph_instability: ['phSwing'],
  feed_allocation_drop: ['daily_feed'],
  feed_pressure_high: ['daily_feed', 'mbw'],
  feed_pressure_low: ['daily_feed', 'mbw'],
  biomass_model_disagreement: ['daily_feed', 'mbw'],
  slow_growth: ['mbw'],
  high_fcr: ['daily_feed', 'mbw'],
  mortality_spike: ['mortality'],
  low_do_high_temperature: ['doMinimumMgL', 'temperatureC'],
  high_ph_high_tan: ['phMorning', 'phEvening', 'lab'],
  low_do_high_tan: ['doMinimumMgL', 'lab'],
  nh3_elevated: ['lab'],
  high_nitrite_low_do: ['lab', 'doMinimumMgL'],
  low_alkalinity_high_ph_swing: ['lab', 'phSwing'],
  plankton_transparency_instability: ['transparencyCm'],
  salinity_shock: ['salinityPpt'],
  lab_report_risk: ['lab'],
};

const sameDateCompoundFindings = new Set([
  'heavy_rain_low_do',
  'low_do_high_temperature',
  'high_ph_high_tan',
  'low_do_high_tan',
  'high_nitrite_low_do',
  'low_alkalinity_high_ph_swing',
  'plankton_transparency_instability',
]);

const qualifyFindingEvidence = (
  finding: OrsonRiskFinding,
  metrics: OrsonPondMetrics,
  asOf: Date | string,
): OrsonRiskFinding => {
  if (finding.severity === 'info' || finding.id === 'missing_data') return finding;
  const keys = finding.supportingMetricKeys ?? evidenceKeysByFinding[finding.id] ?? [];
  const evidence = keys.map((key) => metrics.evidence?.allMetrics[key] ?? null);
  const validEvidence = evidence.filter((item): item is NonNullable<typeof item> => item !== null);
  const fresh = validEvidence.map((item) => ({
    item,
    freshness: evaluateMeasurementFreshness(item, asOf, {
      domain: item.domain,
      timeZone: metrics.evidence?.timeZone,
    }),
  }));
  const hasAllRequiredEvidence = keys.length > 0 && validEvidence.length === keys.length;
  const allFresh = hasAllRequiredEvidence && fresh.every(({ item, freshness }) => item.isFresh && freshness.isFresh);
  const dates = validEvidence.map((item) => item.date).filter((date): date is string => Boolean(date));
  const requiresSameDate = finding.requiresSameDateEvidence === true
    || (finding.requiresSameDateEvidence !== false && sameDateCompoundFindings.has(finding.id));
  const dateCompatible = !requiresSameDate
    || (dates.length === keys.length && dates.every((date) => date === dates[0]));
  const alreadyHistorical = finding.isHistorical === true || finding.status === 'historical';
  const current = allFresh && dateCompatible && !alreadyHistorical;
  const eventDate = dates.slice().sort().reverse()[0] ?? finding.eventDate;

  if (current) {
    return {
      ...finding,
      eventDate,
      measurementEvidence: validEvidence,
      status: 'current',
      isHistorical: false,
    };
  }

  const reason = !hasAllRequiredEvidence
    ? 'one or more measurements have no dated source record'
    : !dateCompatible
      ? 'combined measurements were recorded on different farm-local dates'
      : fresh.some(({ freshness }) => freshness.isFuture)
        ? 'one or more measurements are future-dated'
        : fresh.some(({ freshness }) => !freshness.valid)
          ? 'one or more measurements have an invalid or missing date'
          : 'one or more measurements are stale';
  const ageText = fresh
    .map(({ freshness }) => freshness.ageDays)
    .filter((age): age is number => age !== null)
    .sort((a, b) => b - a)[0];
  const qualifier = ageText === undefined ? reason : `${reason} (${ageText} farm-local days old)`;
  return {
    ...finding,
    severity: 'watch',
    title: /^historical\b/i.test(finding.title) ? finding.title : `Historical ${finding.title}`,
    summary: `${finding.summary} Current conditions are unverified because ${qualifier}.`,
    recommendation: `${finding.recommendation} Recheck the relevant measurements before treating this as a current condition.`,
    eventDate,
    measurementEvidence: validEvidence,
    status: 'historical',
    isHistorical: true,
  };
};

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
  // Re-evaluate measurement age when producing the report; cached metric evidence
  // may have been calculated before a later risk evaluation.
  const asOfDateKey = generatedAt;
  const timeZone = metrics.evidence?.timeZone;
  const latestPhValues = [metrics.latestPhMorning, metrics.latestPhEvening].filter(hasNumber);
  const latestPhMinimum = latestPhValues.length > 0 ? Math.min(...latestPhValues) : null;
  const latestPhMaximum = latestPhValues.length > 0 ? Math.max(...latestPhValues) : null;
  const latestDoRecord = [...metrics.dailyRecords14d].reverse().find((record) => hasNumber(record.doMinimumMgL)) ?? null;
  const latestPhRecord = [...metrics.dailyRecords14d].reverse().find((record) => hasNumber(record.phMorning) || hasNumber(record.phEvening)) ?? null;
  const latestTemperatureRecord = [...metrics.dailyRecords14d].reverse().find((record) => hasNumber(record.temperatureC)) ?? null;
  const latestAmmoniaRecord = [...metrics.dailyRecords14d].reverse().find((record) => hasNumber(record.ammoniaMgL)) ?? null;
  const latestWeatherRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.weatherEvent !== null) ?? null;
  const latestSludgeRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.sludgeLoad !== null) ?? null;
  const latestScumRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.surfaceScum !== null) ?? null;
  const latestBehaviourRecord = [...metrics.dailyRecords14d].reverse().find((record) => record.shrimpBehaviour !== null) ?? null;

  const doEvidence = metrics.evidence?.allMetrics?.doMinimumMgL ?? null;
  const doDate = latestDoRecord?.date ?? doEvidence?.date ?? null;
  const doFreshness = doEvidence
    ? evaluateMeasurementFreshness(doEvidence, asOfDateKey, { domain: 'water', timeZone })
    : latestDoRecord
      ? evaluateMeasurementFreshness({ date: latestDoRecord.date, observedAt: latestDoRecord.observedAt?.[0] ?? null }, asOfDateKey, { domain: 'water', timeZone })
      : evaluateMeasurementFreshness(null, asOfDateKey, { domain: 'water', timeZone });
  const isDoFresh = Boolean(doFreshness?.isFresh);
  const doAgeDays = doFreshness?.ageDays ?? null;

  const tempEvidence = metrics.evidence?.allMetrics?.temperatureC ?? null;
  const tempDate = latestTemperatureRecord?.date ?? tempEvidence?.date ?? null;
  const tempFreshness = tempEvidence
    ? evaluateMeasurementFreshness(tempEvidence, asOfDateKey, { domain: 'water', timeZone })
    : latestTemperatureRecord
      ? evaluateMeasurementFreshness({ date: latestTemperatureRecord.date, observedAt: latestTemperatureRecord.observedAt?.[0] ?? null }, asOfDateKey, { domain: 'water', timeZone })
      : evaluateMeasurementFreshness(null, asOfDateKey, { domain: 'water', timeZone });
  const isTempFresh = Boolean(tempFreshness?.isFresh);

  const phEvidence = metrics.evidence?.allMetrics?.phSwing ?? null;
  const phDate = latestPhRecord?.date ?? phEvidence?.date ?? null;
  const phFreshness = phEvidence
    ? evaluateMeasurementFreshness(phEvidence, asOfDateKey, { domain: 'water', timeZone })
    : latestPhRecord
      ? evaluateMeasurementFreshness({ date: latestPhRecord.date, observedAt: latestPhRecord.observedAt?.[0] ?? null }, asOfDateKey, { domain: 'water', timeZone })
      : evaluateMeasurementFreshness(null, asOfDateKey, { domain: 'water', timeZone });
  const isPhFresh = Boolean(phFreshness?.isFresh);

  const labEvidence = metrics.evidence?.allMetrics?.lab ?? null;
  const labDate = labWater?.date ?? metrics.labContext.latest?.sampleDate ?? labEvidence?.date ?? null;
  const labFreshness = labWater
    ? evaluateMeasurementFreshness({ date: labWater.date, measuredAt: labWater.measuredAt ?? metrics.labContext.latest?.measuredAt }, asOfDateKey, { domain: 'lab', timeZone })
    : labEvidence
      ? evaluateMeasurementFreshness(labEvidence, asOfDateKey, { domain: 'lab', timeZone })
      : evaluateMeasurementFreshness(null, asOfDateKey, { domain: 'lab', timeZone });
  const isLabFresh = Boolean(labFreshness?.isFresh);

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
      eventDate: latestLab?.sampleDate ?? undefined,
    }));
  }

  if (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5) {
    if (isDoFresh) {
      findings.push(createFinding({
        id: 'low_do',
        severity: metrics.doMinimumLatest < 3.5 ? 'critical' : 'warning',
        confidence: confidenceFromCompleteness(0.92, dataScore),
        title: 'Low dissolved oxygen',
        summary: `Latest DO minimum is ${metrics.doMinimumLatest} mg/L.`,
        evidence: [
          `DO minimum: ${metrics.doMinimumLatest} mg/L`,
          `DO trend: ${metrics.doMinimumTrend.direction}`,
          ...(doDate ? [`Observation date: ${doDate}`] : []),
        ],
        recommendation: 'Increase aeration and recheck DO before the next feeding window, especially before sunrise.',
        metricRefs: ['doMinimumLatest', 'doMinimumTrend'],
        eventDate: latestDoRecord?.date,
      }));
    } else {
      findings.push(createFinding({
        id: 'low_do',
        severity: 'watch',
        confidence: confidenceFromCompleteness(0.65, dataScore),
        title: `Historical low DO (${doAgeDays ?? 'unknown age'}d old - recheck required)`,
        summary: `Low DO (${metrics.doMinimumLatest} mg/L) was recorded ${doAgeDays ?? 'unknown'} days ago on ${latestDoRecord?.date ?? 'an older date'}. Stale abnormal data is historical; recheck DO immediately.`,
        evidence: [
          `Recorded DO minimum: ${metrics.doMinimumLatest} mg/L`,
          `Observation date: ${latestDoRecord?.date ?? 'unknown'} (${doAgeDays ?? 'unknown'} days old - stale)`,
          'Current safety: unverified; stale readings cannot establish current safety or active emergency',
        ],
        recommendation: 'Perform an immediate dissolved oxygen measurement before feeding or adjusting operations. Stale abnormal data cannot confirm current safety.',
        metricRefs: ['doMinimumLatest', 'doMinimumTrend'],
        eventDate: latestDoRecord?.date,
      }));
    }
  }

  if (latestAmmoniaRecord && hasNumber(latestAmmoniaRecord.ammoniaMgL) && latestAmmoniaRecord.ammoniaMgL >= 1) {
    findings.push(createFinding({
      id: 'ammonia_elevated',
      severity: latestAmmoniaRecord.ammoniaMgL > 2 ? 'critical' : 'warning',
      confidence: confidenceFromCompleteness(0.86, dataScore),
      title: 'Field TAN is elevated',
      summary: `Latest field TAN is ${latestAmmoniaRecord.ammoniaMgL} mg/L.`,
      evidence: [`Field TAN: ${latestAmmoniaRecord.ammoniaMgL} mg/L`, `Record date: ${latestAmmoniaRecord.date}`],
      recommendation: 'Protect DO, hold feed increases, and recheck TAN with pH and temperature before choosing a correction.',
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
    && !metrics.dailyRecords14d.some(record => record.date > latestWeatherRecord.date && hasNumber(record.doMinimumMgL) && record.doMinimumMgL >= 5)
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
      supportingMetricKeys: [
        ...(hasNumber(metrics.latestPhMorning) ? ['phMorning'] : []),
        ...(hasNumber(metrics.latestPhEvening) ? ['phEvening'] : []),
      ],
    }));
  }

  if (
    hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5
    && hasNumber(metrics.latestTemperatureC) && metrics.latestTemperatureC > 30
  ) {
    const doTempDiff = (doDate && tempDate) ? Math.abs(differenceInFarmCalendarDays(doDate, tempDate)) : 0;
    const isDoTempCompatible = isDoFresh && isTempFresh && doTempDiff === 0 && Boolean(doDate && tempDate);

    if (isDoTempCompatible) {
      const isCritical = metrics.doMinimumLatest < 3.5 || (metrics.doMinimumLatest < 4 && metrics.latestTemperatureC > 32);
      findings.push(createFinding({
        id: 'low_do_high_temperature',
        severity: isCritical ? 'critical' : 'warning',
        confidence: confidenceFromCompleteness(0.86, dataScore),
        title: 'Low DO combined with high temperature',
        summary: `DO is ${metrics.doMinimumLatest} mg/L while temperature is ${metrics.latestTemperatureC} C.`,
        evidence: [
          `DO minimum: ${metrics.doMinimumLatest} mg/L`,
          `Temperature: ${metrics.latestTemperatureC} C`,
          ...(doDate ? [`Observation date: ${doDate}`] : []),
        ],
        recommendation: 'Increase aeration, avoid feed increases, and recheck early-morning DO and temperature.',
        metricRefs: ['doMinimumLatest', 'latestTemperatureC'],
        eventDate: doDate ?? undefined,
      }));
    } else {
      findings.push(createFinding({
        id: 'low_do_high_temperature',
        severity: 'watch',
        confidence: confidenceFromCompleteness(0.65, dataScore),
        title: 'Historical low DO with high temperature (differing dates)',
        summary: `DO was ${metrics.doMinimumLatest} mg/L on ${doDate ?? 'unknown'} while temperature was ${metrics.latestTemperatureC} C on ${tempDate ?? 'unknown'}. Differing dates represent qualified history; recheck simultaneous conditions.`,
        evidence: [
          `DO minimum: ${metrics.doMinimumLatest} mg/L (${doDate ?? 'unknown'})`,
          `Temperature: ${metrics.latestTemperatureC} C (${tempDate ?? 'unknown'})`,
          'Temporal status: differing observation dates (qualified history)',
        ],
        recommendation: 'Measure DO and water temperature simultaneously in the next morning round.',
        metricRefs: ['doMinimumLatest', 'latestTemperatureC'],
        eventDate: doDate ?? tempDate ?? undefined,
      }));
    }
  }

  if (labWater && hasNumber(labWater.tanMgL) && labWater.tanMgL > 1) {
    if (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 4) {
      const doLabDiff = (doDate && labDate) ? Math.abs(differenceInFarmCalendarDays(doDate, labDate)) : 0;
      const isDoLabCompatible = isDoFresh && isLabFresh && doLabDiff === 0 && Boolean(doDate && labDate);

      if (isDoLabCompatible) {
        findings.push(createFinding({
          id: 'low_do_high_tan',
          severity: 'critical',
          confidence: 0.9,
          title: 'Low DO combined with high TAN',
          summary: `TAN is ${labWater.tanMgL} mg/L while DO is ${metrics.doMinimumLatest} mg/L.`,
          evidence: [
            `TAN: ${labWater.tanMgL} mg/L`,
            `DO minimum: ${metrics.doMinimumLatest} mg/L`,
            ...(doDate ? [`Date: ${doDate}`] : []),
          ],
          recommendation: 'Increase aeration immediately, hold feed increases, inspect organic load, and retest TAN, pH, temperature, and DO.',
          metricRefs: ['labContext.metrics.waterQuality.tanMgL', 'doMinimumLatest'],
          eventDate: doDate ?? undefined,
        }));
      } else {
        findings.push(createFinding({
          id: 'low_do_high_tan',
          severity: 'watch',
          confidence: 0.7,
          title: 'Historical low DO with high TAN (differing dates)',
          summary: `Lab TAN was ${labWater.tanMgL} mg/L on ${labDate ?? 'unknown'} while DO was ${metrics.doMinimumLatest} mg/L on ${doDate ?? 'unknown'}. Differing dates represent qualified history; retest TAN and DO concurrently.`,
          evidence: [
            `TAN: ${labWater.tanMgL} mg/L (${labDate ?? 'unknown'})`,
            `DO minimum: ${metrics.doMinimumLatest} mg/L (${doDate ?? 'unknown'})`,
            'Temporal status: differing observation dates (qualified history)',
          ],
          recommendation: 'Retest TAN concurrently with morning DO before modifying feeding or applying treatments.',
          metricRefs: ['labContext.metrics.waterQuality.tanMgL', 'doMinimumLatest'],
          eventDate: doDate ?? labDate ?? undefined,
        }));
      }
    }
    if (hasNumber(latestPhMaximum) && latestPhMaximum > 8.5) {
      const phLabDiff = (phDate && labDate) ? Math.abs(differenceInFarmCalendarDays(phDate, labDate)) : 0;
      const isPhLabCompatible = isPhFresh && isLabFresh && phLabDiff === 0 && Boolean(phDate && labDate);

      if (isPhLabCompatible) {
        findings.push(createFinding({
          id: 'high_ph_high_tan',
          severity: 'critical',
          confidence: 0.9,
          title: 'High pH combined with high TAN',
          summary: `TAN is ${labWater.tanMgL} mg/L while pH reaches ${latestPhMaximum}.`,
          evidence: [
            `TAN: ${labWater.tanMgL} mg/L`,
            `Highest latest pH: ${latestPhMaximum}`,
            ...(phDate ? [`Date: ${phDate}`] : []),
          ],
          recommendation: 'Do not raise pH or feed pressure; strengthen aeration and retest TAN/NH3 with pH and temperature.',
          metricRefs: ['labContext.metrics.waterQuality.tanMgL', 'latestPhMorning', 'latestPhEvening'],
          eventDate: phDate ?? undefined,
        }));
      } else {
        findings.push(createFinding({
          id: 'high_ph_high_tan',
          severity: 'watch',
          confidence: 0.7,
          title: 'Historical high pH with high TAN (differing dates)',
          summary: `Lab TAN was ${labWater.tanMgL} mg/L on ${labDate ?? 'unknown'} while pH reached ${latestPhMaximum} on ${phDate ?? 'unknown'}. Differing dates represent qualified history; retest TAN and pH concurrently.`,
          evidence: [
            `TAN: ${labWater.tanMgL} mg/L (${labDate ?? 'unknown'})`,
            `Highest latest pH: ${latestPhMaximum} (${phDate ?? 'unknown'})`,
            'Temporal status: differing observation dates (qualified history)',
          ],
          recommendation: 'Retest TAN and pH simultaneously before taking corrective action.',
          metricRefs: ['labContext.metrics.waterQuality.tanMgL', 'latestPhMorning', 'latestPhEvening'],
          eventDate: phDate ?? labDate ?? undefined,
        }));
      }
    }
  }

  if (labWater && hasNumber(labWater.nh3MgL) && labWater.nh3MgL >= 0.01) {
    findings.push(createFinding({
      id: 'nh3_elevated',
      severity: labWater.nh3MgL > 0.05 ? 'critical' : 'warning',
      confidence: 0.92,
      title: 'Unionized ammonia is elevated',
      summary: `Confirmed lab NH3 is ${labWater.nh3MgL} mg/L.`,
      evidence: [`NH3: ${labWater.nh3MgL} mg/L`, ...(labDate ? [`Sample date: ${labDate}`] : [])],
      recommendation: 'Hold feed increases, protect DO, reduce organic-load drivers, and follow the confirmed lab recommendation.',
      metricRefs: ['labContext.metrics.waterQuality.nh3MgL'],
      eventDate: labDate ?? undefined,
    }));
  }

  if (
    labWater && hasNumber(labWater.nitriteMgL) && labWater.nitriteMgL > 0.3
    && hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5
  ) {
    const doLabDiff = (doDate && labDate) ? Math.abs(differenceInFarmCalendarDays(doDate, labDate)) : 0;
    const isDoLabCompatible = isDoFresh && isLabFresh && doLabDiff === 0 && Boolean(doDate && labDate);

    if (isDoLabCompatible) {
      findings.push(createFinding({
        id: 'high_nitrite_low_do',
        severity: 'critical',
        confidence: 0.9,
        title: 'High nitrite combined with low DO',
        summary: `Nitrite is ${labWater.nitriteMgL} mg/L while DO is ${metrics.doMinimumLatest} mg/L.`,
        evidence: [
          `NO2: ${labWater.nitriteMgL} mg/L`,
          `DO minimum: ${metrics.doMinimumLatest} mg/L`,
          ...(doDate ? [`Date: ${doDate}`] : []),
        ],
        recommendation: 'Increase aeration, reduce feed pressure, check alkalinity and organic load, and retest nitrite.',
        metricRefs: ['labContext.metrics.waterQuality.nitriteMgL', 'doMinimumLatest'],
        eventDate: doDate ?? undefined,
      }));
    } else {
      findings.push(createFinding({
        id: 'high_nitrite_low_do',
        severity: 'watch',
        confidence: 0.7,
        title: 'Historical high nitrite with low DO (differing dates)',
        summary: `Lab nitrite was ${labWater.nitriteMgL} mg/L on ${labDate ?? 'unknown'} while DO was ${metrics.doMinimumLatest} mg/L on ${doDate ?? 'unknown'}. Differing dates represent qualified history; retest nitrite and DO concurrently.`,
        evidence: [
          `NO2: ${labWater.nitriteMgL} mg/L (${labDate ?? 'unknown'})`,
          `DO minimum: ${metrics.doMinimumLatest} mg/L (${doDate ?? 'unknown'})`,
          'Temporal status: differing observation dates (qualified history)',
        ],
        recommendation: 'Retest nitrite concurrently with morning DO before modifying feeding or applying treatments.',
        metricRefs: ['labContext.metrics.waterQuality.nitriteMgL', 'doMinimumLatest'],
        eventDate: doDate ?? labDate ?? undefined,
      }));
    }
  }

  if (
    labWater && hasNumber(labWater.alkalinityMgL) && labWater.alkalinityMgL < 80
    && hasNumber(metrics.phSwingLatest) && metrics.phSwingLatest > 0.5
  ) {
    const phLabDiff = (phDate && labDate) ? Math.abs(differenceInFarmCalendarDays(phDate, labDate)) : 0;
    const isPhLabCompatible = isPhFresh && isLabFresh && phLabDiff === 0 && Boolean(phDate && labDate);

    if (isPhLabCompatible) {
      findings.push(createFinding({
        id: 'low_alkalinity_high_ph_swing',
        severity: 'warning',
        confidence: 0.88,
        title: 'Low alkalinity combined with unstable pH',
        summary: `Alkalinity is ${labWater.alkalinityMgL} mg/L while pH swing is ${metrics.phSwingLatest}.`,
        evidence: [
          `Alkalinity: ${labWater.alkalinityMgL} mg/L`,
          `pH swing: ${metrics.phSwingLatest}`,
          ...(phDate ? [`Date: ${phDate}`] : []),
        ],
        recommendation: 'Use the farm-approved gradual buffering protocol and monitor morning and evening pH after correction.',
        metricRefs: ['labContext.metrics.waterQuality.alkalinityMgL', 'phSwingLatest'],
        eventDate: phDate ?? undefined,
      }));
    } else {
      findings.push(createFinding({
        id: 'low_alkalinity_high_ph_swing',
        severity: 'watch',
        confidence: 0.7,
        title: 'Historical low alkalinity with unstable pH (differing dates)',
        summary: `Lab alkalinity was ${labWater.alkalinityMgL} mg/L on ${labDate ?? 'unknown'} while pH swing was ${metrics.phSwingLatest} on ${phDate ?? 'unknown'}. Differing dates represent qualified history; retest alkalinity and pH concurrently.`,
        evidence: [
          `Alkalinity: ${labWater.alkalinityMgL} mg/L (${labDate ?? 'unknown'})`,
          `pH swing: ${metrics.phSwingLatest} (${phDate ?? 'unknown'})`,
          'Temporal status: differing observation dates (qualified history)',
        ],
        recommendation: 'Retest alkalinity and diurnal pH together before adding buffer additives.',
        metricRefs: ['labContext.metrics.waterQuality.alkalinityMgL', 'phSwingLatest'],
        eventDate: phDate ?? labDate ?? undefined,
      }));
    }
  }

  const transparencyOutsideTarget = hasNumber(metrics.latestTransparencyCm)
    && (metrics.latestTransparencyCm < 25 || metrics.latestTransparencyCm > 45);
  const waterUnstable = (hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5)
    || (hasNumber(metrics.phSwingLatest) && metrics.phSwingLatest > 0.5);
  if (transparencyOutsideTarget && waterUnstable) {
    const unstableMetric = hasNumber(metrics.doMinimumLatest) && metrics.doMinimumLatest < 5
      ? 'doMinimumMgL'
      : 'phSwing';
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
      supportingMetricKeys: ['transparencyCm', unstableMetric],
      requiresSameDateEvidence: true,
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
      supportingMetricKeys: ['phSwing'],
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

  if (metrics.growthEvidence?.adgSource === 'measured' && hasNumber(metrics.smoothedAdgGPerDay) && hasNumber(metrics.currentDoc) && metrics.currentDoc > 10) {
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

  const qualifiedFindings = findings.map((finding) => qualifyFindingEvidence(
    finding,
    metrics,
    generatedAt,
  ));
  qualifiedFindings.sort(compareRiskFindings);

  return {
    pondId: metrics.pondId,
    pondName: metrics.pondName,
    overallSeverity: highestSeverity(qualifiedFindings),
    findings: qualifiedFindings,
    generatedAt: generatedAt.toISOString(),
  };
};

export const compareWholeFarmRiskReports = (a: OrsonRiskReport, b: OrsonRiskReport): number =>
  comparePondRiskReports(a, b);

export const analyzePondsRisks = (metrics: OrsonPondMetrics[], generatedAt = new Date()): OrsonRiskReport[] => {
  const reports = metrics.map((pondMetrics) => analyzePondRisks(pondMetrics, generatedAt));
  return reports.sort(compareWholeFarmRiskReports);
};
