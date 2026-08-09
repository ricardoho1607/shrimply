import { getFeedRateFromMbw } from '../shared/pondCalculations';
import type {
  OrsonAppetiteProxy,
  OrsonDiagnosticHypothesis,
  OrsonMortalityBaseline,
  OrsonMortalityDiagnosticContext,
  OrsonMortalityTimelineDay,
  OrsonMortalityTrace,
  OrsonNormalizedPond,
  OrsonPondMetrics,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

const MORTALITY_PATTERNS = [
  /\bmortality\b/i, /\bdead\b/i, /\bdying\b/i, /\bdeaths?\b/i, /\bdie[- ]?off\b/i,
  /\bkematian\b/i, /\bmati\b/i, /tử vong/i, /\bchết\b/i, /ตาย/u, /การตาย/u, /死亡/u, /死虾/u, /死蝦/u,
];

const INVESTIGATION_PATTERNS = [
  /\bwhy\b/i, /\bcause[ds]?\b/i, /\breasons?\b/i, /\binvestigat(e|ion)\b/i, /\bdiagnos(e|is|tic)\b/i,
  /\btrace(?: back)?\b/i, /\blook back\b/i, /\bpinpoint\b/i, /\bwhat (?:has )?happened\b/i, /\bwhat might happen\b/i,
  /\bkenapa\b/i, /\bmengapa\b/i, /\bpenyebab\b/i, /\btelusuri\b/i, /tại sao/i, /nguyên nhân/i,
  /điều tra/i, /ทำไม/u, /สาเหตุ/u, /ตรวจสอบ/u, /为什么/u, /為什麼/u, /原因/u, /调查/u, /調查/u,
];

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const hasNumber = (value: number | null | undefined): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const dateKey = (value: Date) => value.toISOString().slice(0, 10);

const shiftDate = (value: string, days: number) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return dateKey(new Date(parsed.getTime() + days * DAY_MS));
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export const isMortalityDiagnosticQuestion = (question: string): boolean => (
  MORTALITY_PATTERNS.some((pattern) => pattern.test(question))
  && INVESTIGATION_PATTERNS.some((pattern) => pattern.test(question))
);

export const selectMortalityDiagnosticPond = (
  ponds: OrsonNormalizedPond[],
  focusedPondId: string | null,
): { pond: OrsonNormalizedPond | null; status: 'selected' | 'missing' | 'ambiguous' } => {
  if (focusedPondId) {
    const focused = ponds.find((pond) => pond.id === focusedPondId) ?? null;
    return { pond: focused, status: focused ? 'selected' : 'missing' };
  }

  const latestPositiveByPond = ponds.map((pond) => ({
    pond,
    record: [...pond.records]
      .reverse()
      .find((record) => hasNumber(record.mortalityObservedCount) && record.mortalityObservedCount > 0 && record.date),
  })).filter((item) => item.record?.date);

  if (latestPositiveByPond.length === 0) return { pond: null, status: 'missing' };
  const latestDate = latestPositiveByPond.reduce((latest, item) => (
    (item.record?.date ?? '') > latest ? item.record?.date ?? latest : latest
  ), '');
  const candidates = latestPositiveByPond.filter((item) => item.record?.date === latestDate);
  if (candidates.length !== 1) return { pond: null, status: 'ambiguous' };
  return { pond: candidates[0].pond, status: 'selected' };
};

type MutableDay = OrsonMortalityTimelineDay & {
  hasMortalityObservation: boolean;
};

const calculateBaseline = (timeline: MutableDay[], eventDate: string | null): OrsonMortalityBaseline => {
  const event = eventDate ? timeline.find((day) => day.date === eventDate) : null;
  const latestRate = event?.mortalityRatePer100k ?? null;
  const prior = timeline
    .filter((day) => day.date !== eventDate && day.hasMortalityObservation && hasNumber(day.mortalityRatePer100k))
    .map((day) => day.mortalityRatePer100k as number);
  const baselineMedian = median(prior);
  const baselineMad = baselineMedian === null ? null : median(prior.map((value) => Math.abs(value - baselineMedian)));
  const increaseRatio = hasNumber(latestRate) && hasNumber(baselineMedian) && baselineMedian > 0
    ? latestRate / baselineMedian
    : null;
  const robustZ = hasNumber(latestRate) && hasNumber(baselineMedian) && hasNumber(baselineMad)
    ? baselineMad === 0
      ? latestRate > baselineMedian ? 999 : 0
      : (0.6745 * (latestRate - baselineMedian)) / baselineMad
    : null;

  let isSpike = false;
  let confidence: OrsonMortalityBaseline['confidence'] = 'low';
  let reason = 'Fewer than three prior mortality observations are available, so Orson cannot establish what is usual.';
  if (prior.length >= 5) {
    isSpike = hasNumber(robustZ) && robustZ >= 3.5;
    confidence = 'high';
    reason = isSpike
      ? 'The latest population-adjusted mortality rate is a robust statistical spike against at least five prior observations.'
      : 'At least five prior observations are available and the latest rate does not cross the robust spike threshold.';
  } else if (prior.length >= 3) {
    const priorMax = Math.max(...prior);
    isSpike = hasNumber(latestRate) && hasNumber(baselineMedian) && latestRate > priorMax && latestRate >= baselineMedian * 2;
    confidence = 'medium';
    reason = isSpike
      ? 'The latest rate is above every prior observation and at least twice the recorded median.'
      : 'Three or four prior observations are available, but the latest rate does not meet the limited-baseline spike rule.';
  }

  return {
    observationCount: prior.length,
    medianRatePer100k: hasNumber(baselineMedian) ? round(baselineMedian) : null,
    madRatePer100k: hasNumber(baselineMad) ? round(baselineMad) : null,
    latestRatePer100k: hasNumber(latestRate) ? round(latestRate) : null,
    increaseRatio: hasNumber(increaseRatio) ? round(increaseRatio) : null,
    robustZScore: hasNumber(robustZ) ? round(robustZ) : null,
    isSpike,
    confidence,
    reason,
  };
};

const calculateAppetiteProxy = (
  timeline: MutableDay[],
  harvests: OrsonMortalityDiagnosticContext['harvests'],
): OrsonAppetiteProxy => {
  const feedDays = timeline.filter((day) => hasNumber(day.feedKg) && (day.feedKg as number) > 0);
  const latestHarvest = [...harvests].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  if (latestHarvest) {
    const before = [...feedDays].reverse().find((day) => day.date < latestHarvest.date);
    const after = feedDays.find((day) => day.date >= latestHarvest.date);
    if (before && after && hasNumber(before.feedKg) && hasNumber(after.feedKg) && before.feedKg > 0) {
      const feedChange = ((after.feedKg - before.feedKg) / before.feedKg) * 100;
      const pressureChange = hasNumber(before.feedPressureRatio) && before.feedPressureRatio > 0 && hasNumber(after.feedPressureRatio)
        ? ((after.feedPressureRatio - before.feedPressureRatio) / before.feedPressureRatio) * 100
        : null;
      if (feedChange <= -10 && hasNumber(pressureChange) && Math.abs(pressureChange) <= 15) {
        return {
          status: 'explained_by_harvest',
          confidence: 'low',
          feedChangePercent: round(feedChange, 1),
          feedPressureChangePercent: round(pressureChange, 1),
          evidence: [
            `Feed allocation changed ${round(feedChange, 1)}% across the ${latestHarvest.date} partial-harvest boundary.`,
            `Biomass-adjusted feed pressure changed only ${round(pressureChange, 1)}%.`,
          ],
        };
      }
    }
  }

  const segment = latestHarvest ? feedDays.filter((day) => day.date >= latestHarvest.date) : feedDays;
  const recent = segment.slice(-5);
  if (recent.length < 3) {
    return {
      status: 'insufficient_data',
      confidence: 'low',
      feedChangePercent: null,
      feedPressureChangePercent: null,
      evidence: ['Fewer than three valid daily feed totals are available after the latest partial harvest.'],
    };
  }

  const first = recent[0];
  const last = recent[recent.length - 1];
  const feedChange = hasNumber(first.feedKg) && first.feedKg > 0 && hasNumber(last.feedKg)
    ? ((last.feedKg - first.feedKg) / first.feedKg) * 100
    : null;
  const pressureChange = hasNumber(first.feedPressureRatio) && first.feedPressureRatio > 0 && hasNumber(last.feedPressureRatio)
    ? ((last.feedPressureRatio - first.feedPressureRatio) / first.feedPressureRatio) * 100
    : null;
  const possibleDecline = hasNumber(feedChange) && feedChange <= -10 && hasNumber(pressureChange) && pressureChange <= -10;

  return {
    status: possibleDecline ? 'possible_decline' : 'no_signal',
    confidence: 'low',
    feedChangePercent: hasNumber(feedChange) ? round(feedChange, 1) : null,
    feedPressureChangePercent: hasNumber(pressureChange) ? round(pressureChange, 1) : null,
    evidence: possibleDecline
      ? [
          `Feed allocation decreased ${round(Math.abs(feedChange), 1)}% across ${recent.length} recent records.`,
          `Biomass-adjusted feed pressure decreased ${round(Math.abs(pressureChange), 1)}%. This may reflect reduced appetite or a management response; consumption was not measured.`,
        ]
      : ['Recent feed allocation does not show an unexplained biomass-adjusted decline of at least 10%.'],
  };
};

const buildHypotheses = (
  timeline: MutableDay[],
  eventDate: string | null,
  metrics: OrsonPondMetrics,
  context: OrsonMortalityDiagnosticContext,
): OrsonDiagnosticHypothesis[] => {
  if (!eventDate) return [];
  const recentStart = shiftDate(eventDate, -3);
  const recent = timeline.filter((day) => day.date >= recentStart && day.date <= eventDate);
  const hypotheses: OrsonDiagnosticHypothesis[] = [];
  const doValues = recent.filter((day) => hasNumber(day.doMinimumMgL));
  const lowestDo = doValues.reduce<number | null>((lowest, day) => (
    !hasNumber(lowest) || (day.doMinimumMgL as number) < lowest ? day.doMinimumMgL as number : lowest
  ), null);
  if (hasNumber(lowestDo) && lowestDo < 4) {
    hypotheses.push({
      id: 'oxygen_stress', category: 'environmental', title: 'Oxygen stress',
      severity: lowestDo < 3.5 ? 'critical' : 'warning', confidence: lowestDo < 3.5 ? 'high' : 'medium',
      supportingEvidence: [`DO reached ${round(lowestDo)} mg/L within three days before the mortality event.`],
      opposingEvidence: [], confirmationNeeded: ['Recheck DO before sunrise and verify aerator coverage.'],
      recommendation: 'Increase aeration, avoid feed increases, and recheck DO before the next feeding window.',
    });
  }

  const highestPhSwing = recent.reduce<number | null>((highest, day) => (
    hasNumber(day.phSwing) && (!hasNumber(highest) || day.phSwing > highest) ? day.phSwing : highest
  ), null);
  if (hasNumber(highestPhSwing) && highestPhSwing > 0.7) {
    hypotheses.push({
      id: 'ph_plankton_instability', category: 'environmental', title: 'pH or plankton instability',
      severity: highestPhSwing > 1 ? 'warning' : 'watch', confidence: 'medium',
      supportingEvidence: [`Morning/evening pH swing reached ${round(highestPhSwing)} before the mortality event.`],
      opposingEvidence: [], confirmationNeeded: ['Check alkalinity, transparency, water color, and morning DO.'],
      recommendation: 'Avoid abrupt chemistry changes and verify plankton and alkalinity stability.',
    });
  }

  const salinityValues = timeline.filter((day) => hasNumber(day.salinityPpt));
  if (salinityValues.length >= 2) {
    const delta = (salinityValues[salinityValues.length - 1].salinityPpt as number) - (salinityValues[0].salinityPpt as number);
    if (Math.abs(delta) >= 5) {
      hypotheses.push({
        id: 'salinity_shift', category: 'environmental', title: 'Salinity stress',
        severity: Math.abs(delta) >= 8 ? 'warning' : 'watch', confidence: 'medium',
        supportingEvidence: [`Salinity moved ${round(Math.abs(delta))} ppt across the diagnostic window.`],
        opposingEvidence: [], confirmationNeeded: ['Confirm source-water salinity and the timing of exchanges or rainfall.'],
        recommendation: 'Avoid abrupt correction and stabilize salinity gradually.',
      });
    }
  }

  if (hasNumber(metrics.feedBiomassModel.feedPressureRatio) && metrics.feedBiomassModel.feedPressureRatio > 1.25) {
    hypotheses.push({
      id: 'feed_organic_pressure', category: 'operational', title: 'Feed and organic-load pressure',
      severity: metrics.feedBiomassModel.feedPressureRatio > 1.75 ? 'warning' : 'watch', confidence: 'medium',
      supportingEvidence: [`Latest logged feed is ${metrics.feedBiomassModel.feedPressureRatio}x the biomass-based expectation.`],
      opposingEvidence: [], confirmationNeeded: ['Verify biomass, tray condition, sludge load, TAN/NH3, and nitrite.'],
      recommendation: 'Hold feed increases until biomass assumptions and water quality are verified.',
    });
  }

  const labLookbackStart = shiftDate(eventDate, -30);
  const relevantLabs = context.labHistory.filter((lab) => lab.sampleDate && lab.sampleDate >= labLookbackStart && lab.sampleDate <= eventDate && (
    lab.status === 'watch' || lab.status === 'warning' || lab.status === 'critical'
  ));
  if (relevantLabs.length > 0) {
    const lab = relevantLabs[0];
    hypotheses.push({
      id: 'lab_supported_biological_risk', category: 'biological', title: 'Lab-supported biological or water-quality risk',
      severity: lab.status === 'critical' ? 'critical' : lab.status === 'warning' ? 'warning' : 'watch',
      confidence: lab.status === 'critical' || lab.status === 'warning' ? 'high' : 'medium',
      supportingEvidence: [
        `${lab.reportType ?? 'Lab'} result from ${lab.sampleDate}: ${lab.mainIssue ?? lab.keyRisks[0] ?? lab.status}.`,
        ...(relevantLabs.length > 1 ? [`${relevantLabs.length} warning-level or higher confirmed lab results occurred within 30 days.`] : []),
        ...lab.keyRisks.slice(0, 2),
      ],
      opposingEvidence: [], confirmationNeeded: ['Use the lab method and recommended confirmatory testing before naming a disease.'],
      recommendation: lab.recommendations[0] ?? 'Compare the confirmed lab finding with clinical signs and repeat targeted testing.',
    });
  }

  const recentTreatments = context.treatments.filter((event) => event.date >= recentStart && event.date <= eventDate);
  if (recentTreatments.length > 0) {
    hypotheses.push({
      id: 'treatment_timing', category: 'operational', title: 'Treatment or additive timing', severity: 'watch', confidence: 'low',
      supportingEvidence: recentTreatments.slice(0, 3).map((event) => `${event.additiveName} was applied on ${event.date}.`),
      opposingEvidence: ['Timing alone does not establish that an application caused mortality.'],
      confirmationNeeded: ['Verify product concentration, pond volume, actual dose, application method, and conditions at application.'],
      recommendation: 'Review the application record before repeating or changing treatment.',
    });
  }

  const rank = { critical: 3, warning: 2, watch: 1, info: 0 };
  const confidenceRank = { high: 3, medium: 2, low: 1 };
  return hypotheses.sort((a, b) => rank[b.severity] - rank[a.severity] || confidenceRank[b.confidence] - confidenceRank[a.confidence]);
};

export const buildMortalityTrace = (
  pond: OrsonNormalizedPond,
  metrics: OrsonPondMetrics,
  now = new Date(),
  externalContext?: OrsonMortalityDiagnosticContext | null,
): OrsonMortalityTrace => {
  const context: OrsonMortalityDiagnosticContext = externalContext ?? {
    pondId: pond.id ?? '', labHistory: [], treatments: [], harvests: [], unavailableSources: ['lab history', 'treatment history', 'harvest history'],
  };
  const latestPositive = [...pond.records].reverse().find((record) => (
    record.date && hasNumber(record.mortalityObservedCount) && record.mortalityObservedCount > 0
  ));
  const eventDate = latestPositive?.date ?? null;
  const windowEnd = eventDate ?? dateKey(now);
  const windowStart = shiftDate(windowEnd, -13);
  const fallbackHarvests = context.harvests.length === 0
    && pond.partialHarvestCount !== null
    && pond.partialHarvestCount > 0
    && pond.postHarvestBaselineDate
    && pond.postHarvestBaselineDate >= windowStart
    && pond.postHarvestBaselineDate <= windowEnd
    ? [{
        id: 'pond-post-harvest-baseline',
        date: pond.postHarvestBaselineDate,
        harvestType: 'partial' as const,
        biomassKg: pond.totalHarvestedBiomassKg ?? 0,
        population: pond.totalHarvestedPopulation ?? 0,
      }]
    : [];
  const effectiveContext: OrsonMortalityDiagnosticContext = {
    ...context,
    harvests: context.harvests.length > 0 ? context.harvests : fallbackHarvests,
  };
  const days = Array.from({ length: 14 }, (_, index) => shiftDate(windowStart, index));
  const currentPopulation = metrics.estimatedCurrentPopulation;
  const mutable = new Map<string, MutableDay>(days.map((date) => [date, {
    date,
    mortalityCount: null,
    mortalityRatePer100k: null,
    estimatedPopulation: currentPopulation,
    feedKg: null,
    feedPressureRatio: null,
    mbwG: null,
    doMinimumMgL: null,
    phSwing: null,
    salinityPpt: null,
    transparencyCm: null,
    temperatureC: null,
    events: [],
    hasMortalityObservation: false,
  }]));

  for (const record of pond.records) {
    if (!record.date || !mutable.has(record.date)) continue;
    const day = mutable.get(record.date)!;
    if (hasNumber(record.mortalityObservedCount) && (record.mortalityObservedCount > 0 || record.mortalityObservationType === 'none_observed')) {
      day.mortalityCount = (day.mortalityCount ?? 0) + record.mortalityObservedCount;
      day.hasMortalityObservation = true;
    }
    if (hasNumber(record.feedKg) && record.feedKg > 0) day.feedKg = Math.max(day.feedKg ?? 0, record.feedKg);
    if (hasNumber(record.mbwG) && record.mbwG > 0) day.mbwG = record.mbwG;
    const doValues = [record.doMorning, record.doEvening].filter(hasNumber);
    if (doValues.length > 0) day.doMinimumMgL = Math.min(...doValues);
    if (hasNumber(record.phMorning) && hasNumber(record.phEvening)) day.phSwing = Math.abs(record.phEvening - record.phMorning);
    if (hasNumber(record.salinityPpt)) day.salinityPpt = record.salinityPpt;
    if (hasNumber(record.transparencyCm)) day.transparencyCm = record.transparencyCm;
    if (hasNumber(record.temperatureC)) day.temperatureC = record.temperatureC;
  }

  for (const harvest of effectiveContext.harvests) {
    mutable.get(harvest.date)?.events.push(`${harvest.harvestType ?? 'Harvest'}: ${round(harvest.biomassKg)} kg, ${Math.round(harvest.population)} shrimp removed`);
  }
  for (const treatment of effectiveContext.treatments) {
    mutable.get(treatment.date)?.events.push(`Applied ${treatment.additiveName}${hasNumber(treatment.ppm) ? ` at ${treatment.ppm} ppm` : ''}`);
  }
  for (const lab of effectiveContext.labHistory) {
    if (lab.sampleDate) mutable.get(lab.sampleDate)?.events.push(`Confirmed lab ${lab.status ?? 'result'}: ${lab.mainIssue ?? lab.reportType ?? 'reviewed'}`);
  }

  const timeline = days.map((date) => mutable.get(date)!);
  let runningMbw = pond.initialWeightG;
  for (const day of timeline) {
    if (hasNumber(day.mbwG)) runningMbw = day.mbwG;
    else day.mbwG = runningMbw;
    const futureMortality = timeline
      .filter((candidate) => candidate.date > day.date && hasNumber(candidate.mortalityCount))
      .reduce((sum, candidate) => sum + (candidate.mortalityCount ?? 0), 0);
    const futureHarvestPopulation = effectiveContext.harvests
      .filter((harvest) => harvest.date > day.date)
      .reduce((sum, harvest) => sum + harvest.population, 0);
    day.estimatedPopulation = hasNumber(currentPopulation) ? currentPopulation + futureMortality + futureHarvestPopulation : null;
    if (day.hasMortalityObservation && hasNumber(day.mortalityCount) && hasNumber(day.estimatedPopulation) && day.estimatedPopulation > 0) {
      day.mortalityRatePer100k = round((day.mortalityCount / day.estimatedPopulation) * 100000);
    }
    if (hasNumber(day.feedKg) && hasNumber(day.mbwG) && day.mbwG > 0 && hasNumber(day.estimatedPopulation)) {
      const biomassKg = (day.estimatedPopulation * day.mbwG) / 1000;
      const feedRate = getFeedRateFromMbw(day.mbwG);
      const expectedFeed = feedRate && biomassKg > 0 ? (biomassKg * feedRate) / 100 : null;
      day.feedPressureRatio = expectedFeed && expectedFeed > 0 ? round(day.feedKg / expectedFeed, 3) : null;
    }
  }

  const baseline = calculateBaseline(timeline, eventDate);
  const appetiteProxy = calculateAppetiteProxy(timeline, effectiveContext.harvests);
  const hypotheses = buildHypotheses(timeline, eventDate, metrics, effectiveContext);
  const missingData: string[] = [];
  if (baseline.observationCount < 3) missingData.push('At least three prior mortality observations are needed to establish a reliable pond baseline.');
  if (!timeline.some((day) => hasNumber(day.doMinimumMgL) && hasNumber(day.phSwing))) missingData.push('Recent paired morning/evening DO and pH readings are incomplete.');
  if (effectiveContext.labHistory.length === 0) missingData.push('No confirmed pond lab history was available for this investigation.');
  if (!hypotheses.some((item) => item.category === 'biological')) {
    missingData.push('Clinical signs and targeted PCR, microscopy, culture, or tissue examination are needed before confirming or excluding disease.');
  }

  return {
    pondId: pond.id,
    pondName: pond.pondName,
    windowStart,
    windowEnd,
    eventDate,
    latestMortalityCount: latestPositive?.mortalityObservedCount ?? null,
    baseline,
    appetiteProxy,
    timeline: timeline.map(({ hasMortalityObservation: _ignored, ...day }) => day),
    hypotheses,
    missingData,
    unavailableSources: context.unavailableSources,
  };
};
