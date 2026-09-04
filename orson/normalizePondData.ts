import type {
  OrsonLabContext,
  OrsonLabMetrics,
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
import {
  differenceInFarmCalendarDays,
  getFarmDateKey,
  normalizeFarmDateKey,
  resolveFarmTimeZone,
} from '../shared/farmDate';

type RawRecord = Record<string, any>;
type RawPond = Record<string, any>;

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

const normalizeLabMetrics = (value: unknown): OrsonLabMetrics | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as RawPond;
  const water = raw.waterQuality && typeof raw.waterQuality === 'object' ? raw.waterQuality as RawPond : {};
  const microbiology = raw.microbiology && typeof raw.microbiology === 'object' ? raw.microbiology as RawPond : {};
  const plankton = raw.plankton && typeof raw.plankton === 'object' ? raw.plankton as RawPond : {};
  const schemaVersion = firstNumber(raw.schemaVersion);
  const legacyNh4 = schemaVersion === 2 ? null : firstNumber(water.tanMgL);

  const normalizedWater: NonNullable<OrsonLabMetrics['waterQuality']> = {
    date: normalizeDateString(water.date),
    salinityPpt: firstNumber(water.salinityPpt),
    alkalinityMgL: firstNumber(water.alkalinityMgL, water.alkalinityTotal),
    tanMgL: schemaVersion === 2 ? firstNumber(water.tanMgL, water.tan) : firstNumber(water.tan),
    nh3MgL: firstNumber(water.nh3MgL, water.nh3),
    nh4MgL: firstNumber(water.nh4MgL, water.nh4, legacyNh4),
    nitriteMgL: firstNumber(water.nitriteMgL, water.nitrite, water.no2),
    tomMgL: firstNumber(water.tomMgL, water.tom),
    calciumHardnessMgLCaCO3: firstNumber(water.calciumHardnessMgLCaCO3),
    magnesiumHardnessMgLCaCO3: firstNumber(water.magnesiumHardnessMgLCaCO3),
    totalHardnessMgLCaCO3: firstNumber(water.totalHardnessMgLCaCO3),
  };
  const normalizedMicrobiology: NonNullable<OrsonLabMetrics['microbiology']> = {
    date: normalizeDateString(microbiology.date),
    vibrioYellow: firstNumber(microbiology.vibrioYellow),
    vibrioGreen: firstNumber(microbiology.vibrioGreen),
    vibrioTotal: firstNumber(microbiology.vibrioTotal),
    tbc: firstNumber(microbiology.tbc),
  };
  const normalizedPlankton: NonNullable<OrsonLabMetrics['plankton']> = {
    date: normalizeDateString(plankton.date),
    totalCellPerMl: firstNumber(plankton.totalCellPerMl),
    beneficialCellPerMl: firstNumber(plankton.beneficialCellPerMl),
    harmfulCellPerMl: firstNumber(plankton.harmfulCellPerMl),
    greenAlgaeCellPerMl: firstNumber(plankton.greenAlgaeCellPerMl),
    greenAlgaePercent: firstNumber(plankton.greenAlgaePercent),
    cyanobacteriaCellPerMl: firstNumber(plankton.cyanobacteriaCellPerMl),
    cyanobacteriaPercent: firstNumber(plankton.cyanobacteriaPercent),
    diatomCellPerMl: firstNumber(plankton.diatomCellPerMl),
    diatomPercent: firstNumber(plankton.diatomPercent),
    dinoflagellataCellPerMl: firstNumber(plankton.dinoflagellataCellPerMl),
    dinoflagellataPercent: firstNumber(plankton.dinoflagellataPercent),
  };

  const hasMetric = (record: Record<string, unknown>) => Object.entries(record)
    .some(([key, metric]) => key !== 'date' && metric !== null);
  const waterQuality = hasMetric(normalizedWater) ? normalizedWater : null;
  const normalizedMicro = hasMetric(normalizedMicrobiology) ? normalizedMicrobiology : null;
  const normalizedPlanktonMetrics = hasMetric(normalizedPlankton) ? normalizedPlankton : null;
  if (!waterQuality && !normalizedMicro && !normalizedPlanktonMetrics) return null;
  const measurementUnits = raw.measurementUnits && typeof raw.measurementUnits === 'object'
    ? Object.fromEntries(Object.entries(raw.measurementUnits as RawPond).flatMap(([field, value]) => {
        if (!value || typeof value !== 'object') return [];
        const unit = firstString((value as RawPond).unit) ?? '';
        const basis = firstString((value as RawPond).basis) ?? '';
        return [[field, { unit, basis }]];
      }))
    : undefined;

  return {
    schemaVersion: 2,
    ...(raw.measurementSchemaVersion === 1 ? { measurementSchemaVersion: 1 as const } : {}),
    measurementWarnings: Array.isArray(raw.measurementWarnings) ? raw.measurementWarnings.filter((value): value is string => typeof value === 'string') : ['Historical lab units and bases were not verified.'],
    ...(measurementUnits && Object.keys(measurementUnits).length > 0 ? { measurementUnits } : {}),
    waterQuality,
    microbiology: normalizedMicro,
    plankton: normalizedPlanktonMetrics,
  };
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

const normalizeObservedAt = (value: unknown): string | null => {
  if (typeof value === 'string' && value.includes('T') && Number.isFinite(new Date(value).getTime())) return value.trim();
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    if (date instanceof Date && Number.isFinite(date.getTime())) return date.toISOString();
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
    cycleId: firstString(raw.cycleId),
    pondCycleId: firstString(raw.pondCycleId),
    metrics: normalizeLabMetrics(raw.metrics),
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

const labBelongsToCurrentCycle = (
  status: Pick<OrsonLabStatusSummary, 'sampleDate' | 'cycleId' | 'pondCycleId'>,
  pond: RawPond,
  asOfDate: string,
): boolean => {
  const cycleStartDate = normalizeDateString(pond.cycleStartedAt ?? pond.docStart ?? pond.stockingDate ?? pond.startDate);
  if (status.sampleDate && (status.sampleDate > asOfDate || (cycleStartDate && status.sampleDate < cycleStartDate))) return false;
  const pondCycleId = firstString(pond.pondCycleId, pond.id);
  const cycleId = firstString(pond.cycleId);
  if (status.pondCycleId && pondCycleId) return status.pondCycleId === pondCycleId;
  if (status.cycleId && cycleId) return status.cycleId === cycleId;
  return true;
};

const normalizeLabContext = (pond: RawPond, asOfDate: string): OrsonLabContext => {
  const latestLabStatus = pond.latestLabStatus;
  const normalizedLatest = normalizeLabStatus(latestLabStatus);
  const latest = normalizedLatest && labBelongsToCurrentCycle(normalizedLatest, pond, asOfDate) ? normalizedLatest : null;
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

  const allStatuses = [...typedStatuses].filter((status) => labBelongsToCurrentCycle(status, pond, asOfDate));
  if (latest) {
    const hasDuplicate = allStatuses.some((status) => {
      if (latest.labReportId && status.labReportId === latest.labReportId) return true;
      return Boolean(latest.reportType && status.reportType === latest.reportType && status.sampleDate === latest.sampleDate);
    });
    if (!hasDuplicate) allStatuses.unshift(latest);
  }

  allStatuses.sort((a, b) => (b.sampleDate ?? '').localeCompare(a.sampleDate ?? ''));
  const currentLatest = latest ?? allStatuses[0] ?? null;
  if (!currentLatest) return EMPTY_LAB_CONTEXT;

  const worstStatus = allStatuses.reduce<OrsonLabStatusLevel | null>((worst, status) => {
    if (!status.status) return worst;
    if (!worst) return status.status;
    return LAB_STATUS_RANK[status.status] > LAB_STATUS_RANK[worst] ? status.status : worst;
  }, null);

  const riskyStatuses = allStatuses.filter((status) => {
    return status.status === 'watch' || status.status === 'warning' || status.status === 'critical';
  });

  return {
    latest: currentLatest,
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

const calculateDoc = (
  docStartDate: string | null,
  target: string | Date | null,
  timeZone?: string,
): number | null => {
  const startDateKey = normalizeFarmDateKey(docStartDate, timeZone);
  const targetDateKey = target instanceof Date
    ? getFarmDateKey(target, timeZone)
    : normalizeFarmDateKey(target, timeZone);
  if (!startDateKey || !targetDateKey) return null;
  return Math.max(0, differenceInFarmCalendarDays(targetDateKey, startDateKey));
};

const collectMissingFields = (fields: Record<string, unknown>): string[] => {
  return Object.entries(fields)
    .filter(([, value]) => value === null || value === undefined || value === '')
    .map(([key]) => key);
};

const normalizeTreatments = (pond: RawPond, asOfDate: string): OrsonPromptTreatmentEvent[] => {
  const rawTreatments = Array.isArray(pond.treatments)
    ? pond.treatments
    : Array.isArray(pond.additivesUsage)
      ? pond.additivesUsage
      : [];

  return rawTreatments
    .filter((item) => item && typeof item === 'object')
    .filter((item) => labBelongsToCurrentCycle({
      sampleDate: normalizeDateString(item.date),
      cycleId: firstString(item.cycleId),
      pondCycleId: firstString(item.pondCycleId),
    }, pond, asOfDate))
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
    feedType: firstString(rawFeedData.feedType, rawFeedData.feedName),
    feedingFrequency: firstNumber(rawFeedData.feedingFrequency),
    feedingResponse: rawFeedData.feedingResponse === 'strong'
      || rawFeedData.feedingResponse === 'normal'
      || rawFeedData.feedingResponse === 'weak'
      ? rawFeedData.feedingResponse
      : null,
  };
};

const recordKinds = (record: RawRecord, feedData: OrsonNormalizedFeedData | null): OrsonRecordKind[] => {
  const kinds: OrsonRecordKind[] = [];
  const mbw = firstNumber(record.mbw, record.abw);
  const mortality = firstNumber(record.mortality, record.dead, record.deaths);
  const feed = firstNumber(record.feed);

  if ((mbw !== null && mbw > 0) || (mortality !== null && mortality > 0)) kinds.push('sampling');
  if (record.mortalityObservationType) kinds.push('mortality');
  if (
    firstNumber(record.alkalinity, record.alkalinityMgL, record.nitriteMgL, record.temperatureMorning, record.temperatureEvening) !== null
    ||
    firstNumber(record.phMorning, record.phEvening, record.doMorning, record.doEvening, record.salinity, record.transparency, record.temperature, record.ammonia, record.ammoniaMgL, record.tanMgL, record.waterExchangePercent) !== null
    || firstString(record.operationalNotes) !== null
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

const normalizeRecord = (record: RawRecord, docStartDate: string | null, timeZone?: string): OrsonNormalizedRecord => {
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
  const harvestData = record.harvestData && typeof record.harvestData === 'object' ? record.harvestData as RawPond : null;
  const mainHarvestBiomass = harvestData ? firstNumber(harvestData.biomass) : null;
  const subHarvestBiomass = harvestData ? firstNumber(harvestData.subBiomass) : null;
  const mainHarvestSize = harvestData ? firstNumber(harvestData.size) : null;
  const subHarvestSize = harvestData ? firstNumber(harvestData.subSize) : null;
  const harvestBiomassKg = mainHarvestBiomass !== null || subHarvestBiomass !== null
    ? (mainHarvestBiomass ?? 0) + (subHarvestBiomass ?? 0)
    : null;
  const harvestPopulation = (
    (mainHarvestBiomass !== null && mainHarvestSize !== null)
    || (subHarvestBiomass !== null && subHarvestSize !== null)
  )
    ? ((mainHarvestBiomass ?? 0) * (mainHarvestSize ?? 0)) + ((subHarvestBiomass ?? 0) * (subHarvestSize ?? 0))
    : null;

  const normalized: OrsonNormalizedRecord = {
    id: firstString(record.id),
    cycleId: firstString(record.cycleId),
    pondCycleId: firstString(record.pondCycleId),
    source: firstString(record.source),
    date,
    observedAt: normalizeObservedAt(record.observedAt ?? record.date),
    timestampMs,
    doc: calculateDoc(docStartDate, date, timeZone),
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
    ammoniaMgL: firstNumber(record.ammonia, record.ammoniaMgL),
    diagnosticMeasurements: Object.fromEntries(Object.entries({
      alkalinityMgL: firstNumber(record.alkalinityMgL, record.alkalinity),
      tanMgL: firstNumber(record.tanMgL),
      nitriteMgL: firstNumber(record.nitriteMgL),
      nitrogenBasis: firstString(record.nitrogenBasis),
      temperatureMorningC: firstNumber(record.temperatureMorningC, record.temperatureMorning),
      temperatureEveningC: firstNumber(record.temperatureEveningC, record.temperatureEvening),
      estimatedPopulation: firstNumber(record.estimatedPopulation),
      estimatedBiomassKg: firstNumber(record.estimatedBiomassKg, record.biomassKg),
      survivalPercent: firstNumber(record.survivalPercent, record.survivalRate),
      samplingMethod: firstString(record.samplingMethod),
      recordedFcr: firstNumber(record.fcr),
      fcrBasis: firstString(record.fcrBasis),
      recordedFeedIndex: firstNumber(record.feedIndex),
    }).filter(([, value]) => value !== null)),
    operationalNotes: firstString(record.operationalNotes),
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
    harvestType: harvestData?.harvestType === 'partial' || harvestData?.harvestType === 'final'
      ? harvestData.harvestType
      : null,
    harvestBiomassKg,
    harvestPopulation,
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
  const asOfDate = getFarmDateKey(now, options.timeZone);
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
    .map((record) => normalizeRecord(record, docStartDate, options.timeZone))
    .sort((a, b) => {
      if (a.timestampMs === null && b.timestampMs === null) return 0;
      if (a.timestampMs === null) return 1;
      if (b.timestampMs === null) return -1;
      return a.timestampMs - b.timestampMs;
    });

  const normalized: OrsonNormalizedPond = {
    id: firstString(pond.id),
    pondName: firstString(pond.pondName, pond.name) ?? 'Unnamed pond',
    species: firstString(pond.species),
    asOfDate,
    timeZone: resolveFarmTimeZone(options.timeZone),
    docStartDate,
    docStartTimestampMs,
    currentDoc: calculateDoc(docStartDate, now, options.timeZone),
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
    cycleId: firstString(pond.cycleId),
    pondCycleId: firstString(pond.pondCycleId, pond.id),
    cycleStatus: pond.cycleStatus === 'ended' ? 'ended' : 'active',
    labContext: normalizeLabContext(pond, asOfDate),
    planktonOverwatch: normalizePlanktonOverwatch(pond.latestPlanktonOverwatch),
    treatments: normalizeTreatments(pond, asOfDate),
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
