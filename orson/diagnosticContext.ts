import { differenceInFarmCalendarDays, shiftDateKey } from '../shared/farmDate';
import type {
  OrsonAdgInterval,
  OrsonDatedValue,
  OrsonDiagnosticSignal,
  OrsonGrowthIntervalContext,
  OrsonIntervalSeriesSummary,
  OrsonMetricComparison,
  OrsonNormalizedPond,
  OrsonNormalizedRecord,
  OrsonPondDiagnosticContext,
  OrsonPromptDailyRecord,
  OrsonPromptSamplingRecord,
} from './types';

const round = (value: number, decimals = 3): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const hasNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const recordSourceId = (record: OrsonNormalizedRecord, fallback: string): string => record.id ?? fallback;

const recordMatchesCurrentCycle = (pond: OrsonNormalizedPond, record: OrsonNormalizedRecord): boolean => {
  const currentIds = new Set([pond.cycleId, pond.pondCycleId].filter((value): value is string => Boolean(value)));
  const recordIds = [record.cycleId, record.pondCycleId].filter((value): value is string => Boolean(value));
  if (currentIds.size > 0 && recordIds.length > 0 && !recordIds.some((value) => currentIds.has(value))) return false;
  if (record.date && pond.docStartDate && record.date < pond.docStartDate) return false;
  return record.date === null || record.date <= pond.asOfDate;
};

export const selectDiagnosticRecords = (pond: OrsonNormalizedPond): OrsonNormalizedRecord[] => (
  pond.records.filter((record) => recordMatchesCurrentCycle(pond, record))
);

const buildSamplingHistory = (pond: OrsonNormalizedPond): OrsonPromptSamplingRecord[] => {
  const byDate = new Map<string, OrsonPromptSamplingRecord>();
  selectDiagnosticRecords(pond).forEach((record, index) => {
    if (!record.date || record.isBaselineEstimate || !hasNumber(record.mbwG) || record.mbwG <= 0) return;
    byDate.set(record.date, {
      sourceId: recordSourceId(record, `sampling:${record.date}:${index}`),
      farmDate: record.date,
      observedAt: record.observedAt,
      doc: record.doc,
      mbwG: round(record.mbwG, 2),
      sourceType: 'sampling',
      estimatedPopulation: record.diagnosticMeasurements?.estimatedPopulation ?? null,
      estimatedBiomassKg: record.diagnosticMeasurements?.estimatedBiomassKg
        ?? (hasNumber(record.diagnosticMeasurements?.estimatedPopulation)
          ? round(record.diagnosticMeasurements.estimatedPopulation * record.mbwG / 1000, 2) : null),
      survivalPercent: record.diagnosticMeasurements?.survivalPercent ?? null,
      samplingMethod: record.diagnosticMeasurements?.samplingMethod ?? null,
      biomassBasis: hasNumber(record.diagnosticMeasurements?.estimatedBiomassKg) ? 'recorded_estimate'
        : hasNumber(record.diagnosticMeasurements?.estimatedPopulation) ? 'recorded_population_estimate_times_measured_mbw' : null,
    });
  });
  return Array.from(byDate.values()).sort((a, b) => a.farmDate.localeCompare(b.farmDate)).slice(-6);
};

const buildAdgIntervals = (sampling: OrsonPromptSamplingRecord[]): OrsonAdgInterval[] => (
  sampling.slice(1).flatMap((current, index) => {
    const previous = sampling[index];
    const days = differenceInFarmCalendarDays(current.farmDate, previous.farmDate);
    if (days <= 0) return [];
    return [{
      startDate: previous.farmDate,
      endDate: current.farmDate,
      startMbwG: previous.mbwG,
      endMbwG: current.mbwG,
      days,
      adgGPerDay: round((current.mbwG - previous.mbwG) / days, 3),
      sourceIds: [previous.sourceId, current.sourceId].filter((value): value is string => Boolean(value)),
    }];
  })
);

const buildComparison = (
  points: OrsonDatedValue[],
  unit: string,
  method: string,
  limitations: string[] = [],
): OrsonMetricComparison | null => {
  if (points.length < 2) return null;
  const previous = points[0];
  const current = points[points.length - 1];
  const absoluteChange = round(current.value - previous.value, 3);
  return {
    unit,
    previous,
    current,
    absoluteChange,
    percentChange: previous.value === 0 ? null : round((absoluteChange / Math.abs(previous.value)) * 100, 1),
    sampleCount: points.length,
    method,
    limitations,
  };
};

const dailyPoints = (
  records: OrsonPromptDailyRecord[],
  selector: (record: OrsonPromptDailyRecord) => number | null | undefined,
  limit = 14,
): OrsonDatedValue[] => records.flatMap((record) => {
  const value = selector(record);
  if (!hasNumber(value)) return [];
  return [{
    value,
    farmDate: record.date,
    sourceIds: record.sourceIds ?? [],
  }];
}).slice(-limit);

const unique = (values: string[]): string[] => Array.from(new Set(values));

type IntervalDay = {
  date: string;
  sourceIds: string[];
  actualFeedKg: number | null;
  morningDo: number | null;
  minimumDo: number | null;
  phSwing: number | null;
  salinity: number | null;
  estimatedMortality: number | null;
  observedMortality: number | null;
  hasMortalityObservation: boolean;
  feedingResponse: 'strong' | 'normal' | 'weak' | null;
};

const seriesSummary = (
  days: IntervalDay[],
  selector: (day: IntervalDay) => number | null,
  unit: string,
): OrsonIntervalSeriesSummary | null => {
  const points = days.flatMap((day) => {
    const value = selector(day);
    return hasNumber(value) ? [{ day, value }] : [];
  });
  if (points.length === 0) return null;
  const values = points.map((point) => point.value);
  return {
    unit,
    recordedDays: points.length,
    first: round(points[0].value, 3),
    firstDate: points[0].day.date,
    last: round(points[points.length - 1].value, 3),
    lastDate: points[points.length - 1].day.date,
    minimum: round(Math.min(...values), 3),
    maximum: round(Math.max(...values), 3),
    average: round(values.reduce((sum, value) => sum + value, 0) / values.length, 3),
    sourceIds: unique(points.flatMap((point) => point.day.sourceIds)),
  };
};

const buildLatestGrowthIntervalContext = (
  pond: OrsonNormalizedPond,
  scopedRecords: OrsonNormalizedRecord[],
  intervals: OrsonAdgInterval[],
): OrsonGrowthIntervalContext | null => {
  const interval = intervals[intervals.length - 1];
  if (!interval) return null;
  const maximumWindowStart = shiftDateKey(interval.endDate, -29);
  const includedStartDate = interval.startDate > maximumWindowStart ? interval.startDate : maximumWindowStart;
  const relevantRecords = scopedRecords.filter((record) => (
    record.date !== null && record.date >= includedStartDate && record.date <= interval.endDate
  ));
  const dayMap = new Map<string, IntervalDay>();
  const events: OrsonGrowthIntervalContext['events'] = [];
  relevantRecords.forEach((record, index) => {
    const date = record.date as string;
    const sourceId = recordSourceId(record, `interval:${date}:${index}`);
    const day = dayMap.get(date) ?? {
      date,
      sourceIds: [],
      actualFeedKg: null,
      morningDo: null,
      minimumDo: null,
      phSwing: null,
      salinity: null,
      estimatedMortality: null,
      observedMortality: null,
      hasMortalityObservation: false,
      feedingResponse: null,
    };
    day.sourceIds.push(sourceId);
    if (record.feedData && hasNumber(record.feedData.totalDailyFeedKg)) {
      day.actualFeedKg = (day.actualFeedKg ?? 0) + record.feedData.totalDailyFeedKg;
    }
    if (hasNumber(record.doMorning)) day.morningDo = record.doMorning;
    const doValues = [record.doMorning, record.doEvening].filter(hasNumber);
    if (doValues.length > 0) day.minimumDo = Math.min(...doValues);
    if (hasNumber(record.phMorning) && hasNumber(record.phEvening)) day.phSwing = Math.abs(record.phEvening - record.phMorning);
    if (hasNumber(record.salinityPpt)) day.salinity = record.salinityPpt;
    if (record.feedData?.feedingResponse) day.feedingResponse = record.feedData.feedingResponse;
    if (record.mortalityObservationType === 'estimated_total' && hasNumber(record.mortalityCount)) {
      day.estimatedMortality = (day.estimatedMortality ?? 0) + record.mortalityCount;
      day.hasMortalityObservation = true;
    } else if (record.mortalityObservationType === 'observed_recovered' && hasNumber(record.mortalityObservedCount)) {
      day.observedMortality = (day.observedMortality ?? 0) + record.mortalityObservedCount;
      day.hasMortalityObservation = true;
    } else if (record.mortalityObservationType === 'none_observed') {
      day.estimatedMortality = day.estimatedMortality ?? 0;
      day.hasMortalityObservation = true;
    } else if (hasNumber(record.mortalityCount) && record.mortalityCount > 0) {
      day.estimatedMortality = (day.estimatedMortality ?? 0) + record.mortalityCount;
      day.hasMortalityObservation = true;
    }
    const addEvent = (type: string, value: string | number | boolean) => events.push({
      farmDate: date,
      type,
      value,
      sourceIds: [sourceId],
    });
    if (record.weatherEvent) addEvent('weather', record.weatherEvent);
    if (hasNumber(record.waterExchangePercent)) addEvent('water_exchange_pct', record.waterExchangePercent);
    if (record.sludgeLoad) addEvent('sludge_load', record.sludgeLoad);
    if (record.surfaceScum !== null) addEvent('surface_scum', record.surfaceScum);
    if (record.shrimpBehaviour) addEvent('shrimp_behaviour', record.shrimpBehaviour);
    if (record.harvestBiomassKg !== null) addEvent('harvest_biomass_kg', record.harvestBiomassKg);
    dayMap.set(date, day);
  });
  pond.treatments
    .filter((treatment) => treatment.date >= includedStartDate && treatment.date <= interval.endDate)
    .forEach((treatment) => events.push({
      farmDate: treatment.date,
      type: 'treatment',
      value: treatment.additiveName,
      sourceIds: [treatment.id],
    }));
  const days = Array.from(dayMap.values()).sort((first, second) => first.date.localeCompare(second.date));
  const estimatedTotals = days.map((day) => day.estimatedMortality).filter(hasNumber);
  const observedTotals = days.map((day) => day.observedMortality).filter(hasNumber);
  const limitations: string[] = [];
  if (includedStartDate !== interval.startDate) limitations.push('The growth interval exceeded 30 days; operational evidence was limited to its latest 30 days.');
  if (!days.some((day) => day.actualFeedKg !== null)) limitations.push('Actual daily feed is unavailable across this growth interval.');
  if (!days.some((day) => day.morningDo !== null)) limitations.push('Morning DO is unavailable across this growth interval.');
  if (!days.some((day) => day.phSwing !== null)) limitations.push('Paired daily pH is unavailable across this growth interval.');

  return {
    startDate: interval.startDate,
    endDate: interval.endDate,
    includedStartDate,
    days: interval.days,
    adgGPerDay: interval.adgGPerDay,
    actualDailyFeedKg: seriesSummary(days, (day) => day.actualFeedKg, 'kg/day'),
    morningDoMgL: seriesSummary(days, (day) => day.morningDo, 'mg/L'),
    minimumRecordedDoMgL: seriesSummary(days, (day) => day.minimumDo, 'mg/L'),
    phSwing: seriesSummary(days, (day) => day.phSwing, 'pH units'),
    salinityPpt: seriesSummary(days, (day) => day.salinity, 'ppt'),
    mortality: {
      estimatedTotal: estimatedTotals.length > 0 ? round(estimatedTotals.reduce((sum, value) => sum + value, 0), 0) : null,
      observedRecovered: observedTotals.length > 0 ? round(observedTotals.reduce((sum, value) => sum + value, 0), 0) : null,
      observationDays: days.filter((day) => day.hasMortalityObservation).length,
    },
    directFeedingResponses: days.flatMap((day) => day.feedingResponse ? [{
      farmDate: day.date,
      response: day.feedingResponse,
      sourceIds: day.sourceIds,
    }] : []),
    events: events.sort((first, second) => first.farmDate.localeCompare(second.farmDate)).slice(-12),
    limitations,
  };
};

const signalFromComparison = (
  types: { increase: string; decrease: string },
  comparison: OrsonMetricComparison | null,
): OrsonDiagnosticSignal | null => {
  if (!comparison || comparison.absoluteChange === 0) return null;
  return {
    type: comparison.absoluteChange > 0 ? types.increase : types.decrease,
    direction: comparison.absoluteChange > 0 ? 'increase' : 'decrease',
    unit: comparison.unit,
    absoluteChange: comparison.absoluteChange,
    percentChange: comparison.percentChange,
    previousDate: comparison.previous.farmDate,
    currentDate: comparison.current.farmDate,
    sourceIds: unique([...comparison.previous.sourceIds, ...comparison.current.sourceIds]),
    interpretation: 'descriptive_change_only',
  };
};

export const buildPondDiagnosticContext = (
  pond: OrsonNormalizedPond,
  dailyRecords: OrsonPromptDailyRecord[],
  assumptions: string[],
): OrsonPondDiagnosticContext => {
  const scopedRecords = selectDiagnosticRecords(pond);
  const sampling = buildSamplingHistory(pond);
  const adgIntervals = buildAdgIntervals(sampling);
  const feedPoints = dailyPoints(dailyRecords, (record) => record.actualDailyFeedKg, 5);
  const morningDoPoints = dailyPoints(dailyRecords, (record) => record.doMorning);
  const phSwingPoints = dailyPoints(dailyRecords, (record) => record.phSwing);
  const salinityPoints = dailyPoints(dailyRecords, (record) => record.salinityPpt);
  const latestRecordDate = (selector: (record: OrsonNormalizedRecord) => boolean): string | null => {
    const record = [...scopedRecords].reverse().find((item) => item.date !== null && selector(item));
    return record?.date ?? null;
  };
  const latestActualFeedDate = latestRecordDate((record) => record.feedData !== null && hasNumber(record.feedData.totalDailyFeedKg));
  const latestMorningDoDate = latestRecordDate((record) => hasNumber(record.doMorning));
  const latestMinimumDoDate = latestRecordDate((record) => hasNumber(record.doMorning) || hasNumber(record.doEvening));
  const latestPhSwingDate = latestRecordDate((record) => hasNumber(record.phMorning) && hasNumber(record.phEvening));
  const latestSalinityDate = latestRecordDate((record) => hasNumber(record.salinityPpt));
  const windowStart = shiftDateKey(pond.asOfDate, -13);
  const includedDates = unique(dailyRecords.map((record) => record.date)).sort();
  const allWindowDates = Array.from({ length: 14 }, (_, index) => shiftDateKey(windowStart, index));
  const includedDateSet = new Set(includedDates);
  const currentCycleRecords = pond.records.filter((record) => {
    const currentIds = new Set([pond.cycleId, pond.pondCycleId].filter((value): value is string => Boolean(value)));
    const recordIds = [record.cycleId, record.pondCycleId].filter((value): value is string => Boolean(value));
    return !(currentIds.size > 0 && recordIds.length > 0 && !recordIds.some((value) => currentIds.has(value)));
  });
  const excludedFutureRecords = currentCycleRecords.filter((record) => record.date && record.date > pond.asOfDate).length;
  const omittedOlderRecords = currentCycleRecords.filter((record) => (
    record.date && record.date >= (pond.docStartDate ?? '') && record.date < windowStart
  )).length;
  const mismatchedCycleRecords = pond.records.length - currentCycleRecords.length;
  const missing: string[] = [];
  if (sampling.length < 2) missing.push('At least two dated measured MBW samples are required for a measured growth interval.');
  if (feedPoints.length < 2) missing.push('At least two actual daily-feed records are required for a feed change.');
  if (morningDoPoints.length < 2) missing.push('At least two morning DO measurements are required for a morning DO change.');
  if (phSwingPoints.length < 2) missing.push('At least two dates with paired morning and evening pH are required for a pH-swing change.');
  if (!dailyRecords.some((record) => record.feedingResponse !== null && record.feedingResponse !== undefined)) {
    missing.push('Direct feeding response or tray observation is unavailable.');
  }
  if (!scopedRecords.some((record) => record.mortalityObservationType !== null || (record.mortalityCount ?? 0) > 0)) {
    missing.push('No explicit mortality observation is available; mortality status is unknown.');
  }
  const labReports = Array.from(new Map([pond.labContext.latest, ...pond.labContext.byType]
    .filter((report) => report !== null)
    .map(report => [report.labReportId ?? `${report.sampleDate}:${report.reportType}`, report])).values());
  if (!labReports.some((report) => report?.metrics !== null && report?.metrics !== undefined)) {
    missing.push('Recent numeric laboratory measurements are unavailable.');
  } else if (labReports.filter((report) => report?.metrics?.waterQuality !== null && report?.metrics?.waterQuality !== undefined).length < 2) {
    missing.push('Comparable numeric water-chemistry lab history is unavailable; one lab value cannot establish a rise or fall.');
  }
  const stale: string[] = [];
  const markStale = (label: string, date: string | null, maximumAgeDays: number) => {
    if (date && differenceInFarmCalendarDays(pond.asOfDate, date) > maximumAgeDays) {
      stale.push(`${label} latest evidence is from ${date}.`);
    }
  };
  markStale('Sampling', sampling[sampling.length - 1]?.farmDate ?? null, 14);
  markStale('Daily feed', latestActualFeedDate, 7);
  markStale('Water quality', latestMinimumDoDate ?? latestPhSwingDate, 7);
  const conflicts: string[] = [];
  if (mismatchedCycleRecords > 0) conflicts.push(`${mismatchedCycleRecords} record(s) from another identified cycle were excluded from diagnostic history.`);
  if (excludedFutureRecords > 0) conflicts.push(`${excludedFutureRecords} future-dated record(s) were excluded from diagnostic history.`);
  const samplingFeedRecordCount = scopedRecords.filter((record) => record.feedData === null && hasNumber(record.feedKg)).length;
  if (samplingFeedRecordCount > 0) {
    conflicts.push(`${samplingFeedRecordCount} sampling feed estimate record(s) were kept separate from actual daily feeding.`);
  }
  labReports.forEach((report) => report?.metrics?.measurementWarnings?.forEach((warning) => conflicts.push(warning)));
  if (scopedRecords.some(record => hasNumber(record.diagnosticMeasurements?.nitriteMgL)
    && !['NO2', 'NO2-N', 'NO2 as N'].includes(record.diagnosticMeasurements?.nitrogenBasis ?? ''))) {
    conflicts.push('Recorded nitrite has an unverified NO2 versus NO2-N basis. Preserve it as an unverified observation; toxicity, threshold classification and treatment calculations are unavailable.');
  }

  const adgIntervalPoints: OrsonDatedValue[] = adgIntervals.slice(-2).map((interval) => ({
    value: interval.adgGPerDay,
    farmDate: interval.endDate,
    sourceIds: interval.sourceIds,
  }));
  const labDates = [pond.labContext.latest, ...pond.labContext.byType]
    .map((report) => report?.sampleDate ?? null)
    .filter((date): date is string => Boolean(date))
    .sort();
  const comparisons: OrsonPondDiagnosticContext['comparisons'] = {
    adgIntervals,
    adgIntervalChange: buildComparison(
      adgIntervalPoints,
      'g/day',
      'Compare the two latest consecutive measured MBW intervals.',
      adgIntervalPoints.length < 2 ? ['Two measured growth intervals are unavailable.'] : [],
    ),
    dailyFeed: buildComparison(
      feedPoints,
      'kg/day',
      'Compare the first and last of up to five dated actual daily-feed totals.',
      ['Logged feed allocation is not proof of appetite, tray clearance, or consumption.'],
    ),
    morningDo: buildComparison(
      morningDoPoints,
      'mg/L',
      'Compare the first and last morning DO measurements in the 14-day window.',
      ['A morning label does not prove the measurement was taken before dawn.'],
    ),
    phSwing: buildComparison(
      phSwingPoints,
      'pH units',
      'Compare paired same-day morning-to-evening pH swings in the 14-day window.',
      ['The percent change describes change in the swing, not percentage change in pH.'],
    ),
    salinity: buildComparison(
      salinityPoints,
      'ppt',
      'Compare the first and last salinity measurements in the 14-day window.',
    ),
    alkalinity: buildComparison(
      scopedRecords.flatMap((record) => record.date && record.date >= windowStart && hasNumber(record.diagnosticMeasurements?.alkalinityMgL)
        ? [{ value: record.diagnosticMeasurements.alkalinityMgL, farmDate: record.date, sourceIds: [record.id ?? `alkalinity:${record.date}`] }] : []),
      'mg/L as CaCO3', 'Compare dated recorded alkalinity in the 14-day window.',
      ['Confirm matching method and unit before interpreting a chemistry change.'],
    ),
    recordedFcr: (() => {
      const records = scopedRecords.filter((r) => r.date && r.date >= windowStart && hasNumber(r.diagnosticMeasurements?.recordedFcr) && r.diagnosticMeasurements?.fcrBasis);
      const basis = records[records.length - 1]?.diagnosticMeasurements?.fcrBasis;
      return buildComparison(records.filter(r => r.diagnosticMeasurements?.fcrBasis === basis).map(r => ({
        value: r.diagnosticMeasurements!.recordedFcr!, farmDate: r.date!, sourceIds: [r.id ?? `fcr:${r.date}`],
      })), 'kg feed/kg biomass gain', `Compare recorded FCR with matching declared basis: ${basis ?? 'unavailable'}.`,
      ['FCR depends on feed coverage, harvest accounting and biomass estimates; verify consistent inputs.']);
    })(),
    estimatedBiomass: (() => {
      const estimates = [
        ...sampling.filter(s => hasNumber(s.estimatedBiomassKg)).map(s => ({
          value: s.estimatedBiomassKg!, farmDate: s.farmDate, sourceIds: s.sourceId ? [s.sourceId] : [], basis: s.biomassBasis,
        })),
        ...scopedRecords.flatMap(record => record.date && record.date >= windowStart && !record.isBaselineEstimate && hasNumber(record.diagnosticMeasurements?.estimatedBiomassKg)
          ? [{ value: record.diagnosticMeasurements.estimatedBiomassKg, farmDate: record.date, sourceIds: [record.id ?? `biomass:${record.date}`], basis: 'recorded_estimate' }] : []),
      ].sort((a, b) => a.farmDate.localeCompare(b.farmDate));
      const basis = estimates[estimates.length - 1]?.basis;
      const byDate = new Map(estimates.filter(estimate => estimate.basis === basis).map(({ value, farmDate, sourceIds }) => [farmDate, { value, farmDate, sourceIds }]));
      return buildComparison([...byDate.values()], 'kg', 'Compare dated biomass estimates with matching calculation basis.',
      ['Estimated biomass is not a measured stock count. Check population uncertainty, harvests and matching feed windows.']);
    })(),
  };
  const signals = [
    signalFromComparison({ increase: 'ADG_RISE', decrease: 'ADG_DROP' }, comparisons.adgIntervalChange),
    signalFromComparison({ increase: 'DAILY_FEED_INCREASE', decrease: 'DAILY_FEED_DECREASE' }, comparisons.dailyFeed),
    signalFromComparison({ increase: 'MORNING_DO_INCREASE', decrease: 'MORNING_DO_DECLINE' }, comparisons.morningDo),
    signalFromComparison({ increase: 'PH_SWING_INCREASE', decrease: 'PH_SWING_DECREASE' }, comparisons.phSwing),
    signalFromComparison({ increase: 'SALINITY_INCREASE', decrease: 'SALINITY_DECREASE' }, comparisons.salinity),
    signalFromComparison({ increase: 'ALKALINITY_INCREASE', decrease: 'ALKALINITY_DECREASE' }, comparisons.alkalinity ?? null),
    signalFromComparison({ increase: 'FCR_INCREASE', decrease: 'FCR_DECREASE' }, comparisons.recordedFcr ?? null),
  ].filter((signal): signal is OrsonDiagnosticSignal => signal !== null);
  const latestGrowthInterval = buildLatestGrowthIntervalContext(pond, scopedRecords, adgIntervals);

  return {
    schemaVersion: 1,
    asOfDate: pond.asOfDate,
    timeZone: pond.timeZone,
    currentEvidenceDates: {
      mbw: sampling[sampling.length - 1]?.farmDate ?? null,
      actual_daily_feed: latestActualFeedDate,
      morning_do: latestMorningDoDate,
      minimum_recorded_do: latestMinimumDoDate,
      ph_swing: latestPhSwingDate,
      salinity: latestSalinityDate,
      temperature: latestRecordDate((record) => hasNumber(record.temperatureC)),
      transparency: latestRecordDate((record) => hasNumber(record.transparencyCm)),
      lab: labDates[labDates.length - 1] ?? null,
    },
    history: {
      sampling,
      observations: scopedRecords.flatMap((record, index) => {
        if (!record.date || record.date < windowStart) return [];
        const details = {
          ...record.diagnosticMeasurements,
          ...(record.feedData?.feedType ? { feedType: record.feedData.feedType } : {}),
          ...(hasNumber(record.feedData?.feedingFrequency) ? { feedingFrequency: record.feedData.feedingFrequency } : {}),
          ...(record.feedData?.inventoryFeedId ? { inventoryFeedId: record.feedData.inventoryFeedId } : {}),
        };
        return Object.keys(details).length ? [{ sourceId: recordSourceId(record, `observation:${record.date}:${index}`), farmDate: record.date, observedAt: record.observedAt, ...details }] : [];
      }).slice(-60),
      coverage: {
        windowStart,
        windowEnd: pond.asOfDate,
        includedStart: includedDates[0] ?? null,
        includedEnd: includedDates[includedDates.length - 1] ?? null,
        recordedDays: includedDates.length,
        missingDates: allWindowDates.filter((date) => !includedDateSet.has(date)),
        omittedOlderRecords,
        excludedFutureRecords,
      },
    },
    comparisons,
    signals,
    latestGrowthInterval,
    dataQuality: {
      missing: unique(missing),
      stale: unique(stale),
      conflicts: unique(conflicts),
      assumptions: unique(assumptions),
    },
  };
};
