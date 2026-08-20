import type {
  OrsonLabContext,
  OrsonLabStatusLevel,
  OrsonLabStatusSummary,
  OrsonNormalizeOptions,
  OrsonNormalizedFeedData,
  OrsonNormalizedPond,
  OrsonNormalizedRecord,
  OrsonNumber,
  OrsonPlanktonOverwatchContext,
  OrsonPromptHistoricalBenchmark,
  OrsonPromptTreatmentEvent,
  OrsonRecordKind,
} from './types';

type RawRecord = Record<string, any>;
type RawPond = Record<string, any>;

const DAY_MS = 1000 * 60 * 60 * 24;

const EMPTY_VALUES = new Set(['', 'n/a', 'na', 'null', 'undefined', '--', '-']);

const LAB_STATUS_RANK: Record<OrsonLabStatusLevel, number> = {
  good: 0,
  info: 0,
  watch: 1,
  warning: 2,
  critical: 3,
};

const EMPTY_LAB_CONTEXT: OrsonLabContext = {
  latest: null,
  byType: [],
  unresolvedRisks: [],
  recommendations: [],
  worstStatus: null,
};

const toNumber = (value: unknown): OrsonNumber => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim().toLowerCase();
  if (EMPTY_VALUES.has(trimmed)) return null;

  const normalized = trimmed.replace(/,/g, '').replace(/%$/, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const firstNumber = (...values: unknown[]): OrsonNumber => {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const parsed = toStringOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const stringArray = (value: unknown, limit = 4): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toStringOrNull(item))
    .filter((item): item is string => item !== null)
    .slice(0, limit);
};

const uniqueStrings = (values: string[], limit = 5): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
    if (unique.length >= limit) break;
  }

  return unique;
};

const normalizeLabStatusLevel = (value: unknown): OrsonLabStatusLevel | null => {
  const status = toStringOrNull(value)?.toLowerCase();
  if (
    status === 'good' ||
    status === 'info' ||
    status === 'watch' ||
    status === 'warning' ||
    status === 'critical'
  ) {
    return status;
  }
  return null;
};

const normalizeDateString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim();
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return raw.includes('T') ? raw.split('T')[0] : raw;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  return null;
};

const normalizeLabStatus = (value: unknown): OrsonLabStatusSummary | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as RawPond;

  const summary: OrsonLabStatusSummary = {
    labReportId: firstString(raw.labReportId, raw.reportId, raw.id),
    reportType: firstString(raw.reportType, raw.type),
    sampleDate: normalizeDateString(raw.sampleDate ?? raw.date),
    status: normalizeLabStatusLevel(raw.status),
    mainIssue: firstString(raw.mainIssue, raw.summary, raw.issue),
    keyRisks: stringArray(raw.keyRisks, 4),
    recommendations: stringArray(raw.recommendations, 3),
  };

  const hasContent = summary.labReportId ||
    summary.reportType ||
    summary.sampleDate ||
    summary.status ||
    summary.mainIssue ||
    summary.keyRisks.length > 0 ||
    summary.recommendations.length > 0;

  return hasContent ? summary : null;
};

const normalizeLabContext = (pond: RawPond): OrsonLabContext => {
  const latestLabStatus = pond.latestLabStatus;
  const latest = normalizeLabStatus(latestLabStatus);
  const typedStatuses: OrsonLabStatusSummary[] = [];

  if (latestLabStatus && typeof latestLabStatus === 'object') {
    const byType = (latestLabStatus as RawPond).byType;
    if (byType && typeof byType === 'object') {
      Object.values(byType as Record<string, unknown>).forEach((value) => {
        const normalized = normalizeLabStatus(value);
        if (normalized) typedStatuses.push(normalized);
      });
    }
  }

  const allStatuses = [...typedStatuses];
  if (latest) {
    const hasDuplicate = allStatuses.some((status) => {
      if (latest.labReportId && status.labReportId === latest.labReportId) return true;
      return Boolean(latest.reportType && status.reportType === latest.reportType && status.sampleDate === latest.sampleDate);
    });
    if (!hasDuplicate) allStatuses.unshift(latest);
  }

  if (!latest && allStatuses.length === 0) return EMPTY_LAB_CONTEXT;

  const worstStatus = allStatuses.reduce<OrsonLabStatusLevel | null>((worst, status) => {
    if (!status.status) return worst;
    if (!worst) return status.status;
    return LAB_STATUS_RANK[status.status] > LAB_STATUS_RANK[worst] ? status.status : worst;
  }, null);

  const riskyStatuses = allStatuses.filter((status) => {
    return status.status === 'watch' || status.status === 'warning' || status.status === 'critical';
  });

  return {
    latest,
    byType: allStatuses.slice(0, 3),
    unresolvedRisks: uniqueStrings(riskyStatuses.flatMap((status) => [
      ...(status.mainIssue ? [status.mainIssue] : []),
      ...status.keyRisks,
    ]), 5),
    recommendations: uniqueStrings(allStatuses.flatMap((status) => status.recommendations), 3),
    worstStatus,
  };
};

const normalizePlanktonOverwatch = (value: unknown): OrsonPlanktonOverwatchContext | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as RawPond;
  const state = firstString(raw.state);
  if (!state || !['insufficient', 'stable', 'watch', 'high', 'critical'].includes(state)) return null;
  const rawSignals = Array.isArray(raw.signals) ? raw.signals : [];
  const rawMetrics = raw.metrics && typeof raw.metrics === 'object' ? raw.metrics as RawPond : {};
  const feedingResponse = firstString(rawMetrics.feedingResponse);

  return {
    state: state as OrsonPlanktonOverwatchContext['state'],
    message: firstString(raw.message) || '',
    signals: rawSignals
      .filter((signal: unknown): signal is RawPond => Boolean(signal && typeof signal === 'object'))
      .map((signal: RawPond) => ({
        id: firstString(signal.id) || 'plankton_signal',
        evidence: firstString(signal.evidence) || '',
        recommendation: firstString(signal.recommendation) || '',
      }))
      .filter((signal) => signal.evidence || signal.recommendation)
      .slice(0, 4),
    recommendations: stringArray(raw.recommendations, 4),
    missingData: stringArray(raw.dataQuality?.missing, 5),
    sourceDate: normalizeDateString(raw.sourceDate),
    metrics: {
      totalPlanktonCellPerMl: firstNumber(rawMetrics.totalPlanktonCellPerMl),
      cyanobacteriaPercent: firstNumber(rawMetrics.cyanobacteriaPercent),
      cyanobacteriaCellPerMl: firstNumber(rawMetrics.cyanobacteriaCellPerMl),
      planktonChangePercent: firstNumber(rawMetrics.planktonChangePercent),
      dawnDo: firstNumber(rawMetrics.dawnDo),
      phSwing: firstNumber(rawMetrics.phSwing),
      feedingResponse: feedingResponse === 'strong' || feedingResponse === 'normal' || feedingResponse === 'weak'
        ? feedingResponse
        : null,
    },
  };
};

const toTimestampMs = (dateString: string | null): number | null => {
  if (!dateString) return null;
  const timestamp = new Date(dateString).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const calculateDoc = (docStartMs: number | null, targetMs: number | null): number | null => {
  if (docStartMs === null || targetMs === null) return null;
  return Math.max(0, Math.floor((targetMs - docStartMs) / DAY_MS));
};

const collectMissingFields = (fields: Record<string, unknown>): string[] => {
  return Object.entries(fields)
    .filter(([, value]) => value === null || value === undefined || value === '')
    .map(([key]) => key);
};

const normalizeTreatments = (pond: RawPond): OrsonPromptTreatmentEvent[] => {
  const rawTreatments = Array.isArray(pond.treatments)
    ? pond.treatments
    : Array.isArray(pond.additivesUsage)
      ? pond.additivesUsage
      : [];

  return rawTreatments
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: firstString(item.id) ?? `treatment-${index}`,
      date: normalizeDateString(item.date) ?? '',
      additiveName: firstString(item.additiveName, item.name, item.treatmentMixName) ?? 'Pond additive',
      category: firstString(item.category),
      quantity: firstNumber(item.quantity, item.amount),
      unit: firstString(item.unit),
      ppm: firstNumber(item.ppm),
      pondVolumeLiters: firstNumber(item.pondVolumeLiters, item.volumeLiters),
      notes: firstString(item.notes),
    }))
    .filter((item) => item.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
};

const normalizeHistoricalBenchmark = (pond: RawPond): OrsonPromptHistoricalBenchmark | null => {
  const raw = pond.historicalBenchmark || pond.pastCycleBenchmark;
  if (raw && typeof raw === 'object') {
    return {
      completedCycleCount: toNumber(raw.completedCycleCount) ?? 1,
      averageFinalMbwG: toNumber(raw.averageFinalMbwG ?? raw.averageMbw ?? raw.finalMbw),
      averageAdgGPerDay: toNumber(raw.averageAdgGPerDay ?? raw.averageAdg ?? raw.adg),
      averageFcr: toNumber(raw.averageFcr ?? raw.fcr),
      averageSurvivalPercent: toNumber(raw.averageSurvivalPercent ?? raw.survivalRate ?? raw.survivalPercent),
    };
  }

  if (Array.isArray(pond.pastCycles) && pond.pastCycles.length > 0) {
    const cycles = pond.pastCycles.filter((c: any) => c && typeof c === 'object');
    if (cycles.length === 0) return null;
    const mbwSum = cycles.reduce((s: number, c: any) => s + (toNumber(c.finalMbw ?? c.mbw) || 0), 0);
    const adgSum = cycles.reduce((s: number, c: any) => s + (toNumber(c.adg) || 0), 0);
    const fcrSum = cycles.reduce((s: number, c: any) => s + (toNumber(c.fcr) || 0), 0);
    const srSum = cycles.reduce((s: number, c: any) => s + (toNumber(c.survivalRate ?? c.survivalPercent) || 0), 0);
    const count = cycles.length;

    return {
      completedCycleCount: count,
      averageFinalMbwG: mbwSum > 0 ? Math.round((mbwSum / count) * 100) / 100 : null,
      averageAdgGPerDay: adgSum > 0 ? Math.round((adgSum / count) * 100) / 100 : null,
      averageFcr: fcrSum > 0 ? Math.round((fcrSum / count) * 100) / 100 : null,
      averageSurvivalPercent: srSum > 0 ? Math.round((srSum / count) * 100) / 100 : null,
    };
  }

  return null;
};

const normalizeFeedData = (record: RawRecord): OrsonNormalizedFeedData | null => {
  const rawFeedData = record.feedData;
  if (!rawFeedData || typeof rawFeedData !== 'object') return null;

  const totalDailyFeedKg = firstNumber(rawFeedData.totalDailyFeed, record.feed);

  return {
    totalDailyFeedKg,
    inventoryFeedId: firstString(rawFeedData.inventoryFeedId),
    feedingResponse: rawFeedData.feedingResponse === 'strong'
      || rawFeedData.feedingResponse === 'normal'
      || rawFeedData.feedingResponse === 'weak'
      ? rawFeedData.feedingResponse
      : null,
  };
};

const recordKinds = (record: RawRecord, feedData: OrsonNormalizedFeedData | null): OrsonRecordKind[] => {
  const kinds: OrsonRecordKind[] = [];
  const mbw = firstNumber(record.mbw);
  const mortality = firstNumber(record.mortality, record.dead, record.deaths);
  const feed = firstNumber(record.feed);

  if ((mbw !== null && mbw > 0) || (mortality !== null && mortality > 0)) kinds.push('sampling');
  if (record.mortalityObservationType) kinds.push('mortality');
  if (
    firstNumber(record.phMorning, record.phEvening, record.doMorning, record.doEvening, record.salinity, record.transparency, record.temperature, record.waterExchangePercent) !== null
    || record.weatherEvent === 'rain' || record.weatherEvent === 'heavy_rain' || record.weatherEvent === 'sudden_cloud'
    || record.sludgeLoad === 'low' || record.sludgeLoad === 'moderate' || record.sludgeLoad === 'high'
    || typeof record.surfaceScum === 'boolean'
    || record.shrimpBehaviour === 'normal' || record.shrimpBehaviour === 'abnormal'
  ) {
    kinds.push('water_quality');
  }
  if (feedData || (feed !== null && feed > 0)) kinds.push('feed');
  if (record.harvestData && typeof record.harvestData === 'object') kinds.push('harvest');

  return kinds.length > 0 ? kinds : ['unknown'];
};

const normalizeRecord = (record: RawRecord, docStartMs: number | null): OrsonNormalizedRecord => {
  const date = normalizeDateString(record.date);
  const timestampMs = toTimestampMs(date);
  const feedData = normalizeFeedData(record);
  const feedKg = feedData?.totalDailyFeedKg ?? firstNumber(record.feed);
  const mbwG = firstNumber(record.mbw, record.abw);
  const mortalityCount = record.mortalityObservationType
    ? record.mortalityObservationType === 'estimated_total'
      ? firstNumber(record.mortality, record.count) ?? 0
      : 0
    : firstNumber(record.mortality, record.dead, record.deaths);
  const mortalityObservationType = record.mortalityObservationType === 'estimated_total'
    || record.mortalityObservationType === 'observed_recovered'
    || record.mortalityObservationType === 'none_observed'
    ? record.mortalityObservationType
    : null;
  const mortalityObservedCount = mortalityObservationType
    ? firstNumber(record.mortality, record.count) ?? 0
    : firstNumber(record.mortality, record.dead, record.deaths);

  const normalized: OrsonNormalizedRecord = {
    id: firstString(record.id),
    date,
    timestampMs,
    doc: calculateDoc(docStartMs, timestampMs),
    kinds: recordKinds(record, feedData),
    mbwG,
    mortalityCount,
    mortalityObservedCount,
    mortalityObservationType,
    mortalityNotes: firstString(record.notes),
    feedKg,
    phMorning: firstNumber(record.phMorning),
    phEvening: firstNumber(record.phEvening),
    doMorning: firstNumber(record.doMorning),
    doEvening: firstNumber(record.doEvening),
    salinityPpt: firstNumber(record.salinity),
    transparencyCm: firstNumber(record.transparency),
    temperatureC: firstNumber(record.temp, record.temperature, record.temperatureC),
    weatherEvent: record.weatherEvent === 'rain' || record.weatherEvent === 'heavy_rain' || record.weatherEvent === 'sudden_cloud'
      ? record.weatherEvent
      : null,
    waterExchangePercent: firstNumber(record.waterExchangePercent),
    sludgeLoad: record.sludgeLoad === 'low' || record.sludgeLoad === 'moderate' || record.sludgeLoad === 'high'
      ? record.sludgeLoad
      : null,
    surfaceScum: typeof record.surfaceScum === 'boolean' ? record.surfaceScum : null,
    shrimpBehaviour: record.shrimpBehaviour === 'normal' || record.shrimpBehaviour === 'abnormal'
      ? record.shrimpBehaviour
      : null,
    feedData,
    isBaselineEstimate: Boolean(record.isBaselineEstimate) || record.source === 'midcycle_onboarding',
    missingFields: [],
  };

  normalized.missingFields = collectMissingFields({
    date: normalized.date,
  });

  return normalized;
};

export const normalizePondData = (
  pond: RawPond,
  options: OrsonNormalizeOptions = {},
): OrsonNormalizedPond => {
  const now = options.now ?? new Date();
  const docStartDate = normalizeDateString(pond.docStart ?? pond.stockingDate ?? pond.startDate);
  const docStartTimestampMs = toTimestampMs(docStartDate);
  const pondAreaM2 = firstNumber(pond.pondArea, pond.area, pond.areaM2);
  const densityPerM2 = firstNumber(pond.density, pond.stockingDensity, pond.densityPerM2);
  const explicitInitialPopulation = firstNumber(pond.initialPopulation, pond.initialStock, pond.stock);
  const calculatedInitialPopulation = pondAreaM2 !== null && densityPerM2 !== null
    ? pondAreaM2 * densityPerM2
    : null;
  const initialPopulation = explicitInitialPopulation ?? calculatedInitialPopulation;

  const rawSamplingRecords = Array.isArray(pond.samplings)
    ? pond.samplings
    : Array.isArray(pond.records)
      ? pond.records
      : [];
  const rawMortalityRecords = Array.isArray(pond.mortalityRecords)
    ? pond.mortalityRecords.map((record: RawRecord) => ({
        ...record,
        mortalityObservationType: record.observationType,
        mortality: record.count,
      }))
    : [];
  const rawRecords = [...rawSamplingRecords, ...rawMortalityRecords];

  const records = rawRecords
    .filter((record) => record && typeof record === 'object')
    .map((record) => normalizeRecord(record, docStartTimestampMs))
    .sort((a, b) => {
      if (a.timestampMs === null && b.timestampMs === null) return 0;
      if (a.timestampMs === null) return 1;
      if (b.timestampMs === null) return -1;
      return a.timestampMs - b.timestampMs;
    });

  const normalized: OrsonNormalizedPond = {
    id: firstString(pond.id),
    pondName: firstString(pond.pondName, pond.name) ?? 'Unnamed pond',
    docStartDate,
    docStartTimestampMs,
    currentDoc: calculateDoc(docStartTimestampMs, now.getTime()),
    pondAreaM2,
    densityPerM2,
    initialPopulation,
    initialWeightG: firstNumber(pond.initialWeight, pond.initialWeightG, pond.plWeight),
    totalHarvestedBiomassKg: firstNumber(pond.totalHarvestedBiomass, pond.harvestedBiomass),
    totalHarvestedPopulation: firstNumber(pond.totalHarvestedPopulation, pond.harvestedPopulation),
    totalHarvestedFeedKg: firstNumber(pond.totalHarvestedFeed, pond.harvestedFeed),
    partialHarvestCount: firstNumber(pond.partialHarvestCount),
    postHarvestBaselineDate: normalizeDateString(pond.postHarvestBaselineDate),
    postHarvestRemainingBiomassKg: firstNumber(pond.postHarvestRemainingBiomass),
    postHarvestRemainingPopulation: firstNumber(pond.postHarvestRemainingPopulation),
    postHarvestReferenceSamplingId: firstString(pond.postHarvestReferenceSamplingId),
    postHarvestReferenceSamplingDate: normalizeDateString(pond.postHarvestReferenceSamplingDate),
    postHarvestReferenceMbwG: firstNumber(pond.postHarvestReferenceMbw),
    cycleStartMode: pond.cycleStartMode === 'midcycle' ? 'midcycle' : 'new',
    baselineDate: normalizeDateString(pond.baselineDate),
    baselineDoc: firstNumber(pond.baselineDoc),
    baselineMbwG: firstNumber(pond.baselineMbw),
    baselineEstimatedPopulation: firstNumber(pond.baselineEstimatedPopulation),
    baselineSurvivalRate: firstNumber(pond.baselineSurvivalRate),
    baselineCumulativeFeedKg: firstNumber(pond.baselineCumulativeFeed),
    baselineSource: firstString(pond.baselineSource),
    supplier: firstString(pond.plSupplier, pond.supplier, pond.hatchery),
    cycleStatus: pond.cycleStatus === 'ended' ? 'ended' : 'active',
    labContext: normalizeLabContext(pond),
    planktonOverwatch: normalizePlanktonOverwatch(pond.latestPlanktonOverwatch),
    treatments: normalizeTreatments(pond),
    historicalBenchmark: normalizeHistoricalBenchmark(pond),
    records,
    missingFields: [],
  };

  normalized.missingFields = collectMissingFields({
    docStartDate: normalized.docStartDate,
    pondAreaM2: normalized.pondAreaM2,
    densityPerM2: normalized.densityPerM2,
    initialPopulation: normalized.initialPopulation,
    initialWeightG: normalized.initialWeightG,
  });

  return normalized;
};

export const normalizePondsData = (
  ponds: RawPond[],
  options: OrsonNormalizeOptions = {},
): OrsonNormalizedPond[] => {
  return ponds.map((pond) => normalizePondData(pond, options));
};

export const getLatestRecordWith = (
  pond: OrsonNormalizedPond,
  predicate: (record: OrsonNormalizedRecord) => boolean,
): OrsonNormalizedRecord | null => {
  for (let index = pond.records.length - 1; index >= 0; index -= 1) {
    const record = pond.records[index];
    if (predicate(record)) return record;
  }
  return null;
};
