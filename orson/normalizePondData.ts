import type {
  OrsonNormalizeOptions,
  OrsonNormalizedFeedData,
  OrsonNormalizedPond,
  OrsonNormalizedRecord,
  OrsonNumber,
  OrsonRecordKind,
} from './types';

type RawRecord = Record<string, any>;
type RawPond = Record<string, any>;

const DAY_MS = 1000 * 60 * 60 * 24;

const EMPTY_VALUES = new Set(['', 'n/a', 'na', 'null', 'undefined', '--', '-']);

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

const normalizeFeedData = (record: RawRecord): OrsonNormalizedFeedData | null => {
  const rawFeedData = record.feedData;
  if (!rawFeedData || typeof rawFeedData !== 'object') return null;

  const trayValuesPercent: number[] = [];
  const feedAmountsKg: number[] = [];

  for (let index = 1; index <= 10; index += 1) {
    const trayValue = toNumber(rawFeedData[`anco${index}`]);
    if (trayValue !== null) trayValuesPercent.push(trayValue);
  }

  for (let index = 1; index <= 5; index += 1) {
    const feedAmount = toNumber(rawFeedData[`feed${index}`]);
    if (feedAmount !== null) feedAmountsKg.push(feedAmount);
  }

  const totalDailyFeedKg = firstNumber(rawFeedData.totalDailyFeed, record.feed);
  const ancoPercentage = toNumber(rawFeedData.ancoPercentage);
  const trayClearancePercent = trayValuesPercent.length > 0
    ? trayValuesPercent.reduce((sum, value) => sum + value, 0) / trayValuesPercent.length
    : ancoPercentage;

  return {
    totalDailyFeedKg,
    ancoPercentage,
    trayClearancePercent,
    trayValuesPercent,
    feedAmountsKg,
    inventoryFeedId: firstString(rawFeedData.inventoryFeedId),
  };
};

const recordKinds = (record: RawRecord, feedData: OrsonNormalizedFeedData | null): OrsonRecordKind[] => {
  const kinds: OrsonRecordKind[] = [];
  const mbw = firstNumber(record.mbw);
  const mortality = firstNumber(record.mortality, record.dead, record.deaths);
  const feed = firstNumber(record.feed);

  if ((mbw !== null && mbw > 0) || (mortality !== null && mortality > 0)) kinds.push('sampling');
  if (
    firstNumber(record.phMorning, record.phEvening, record.doMorning, record.doEvening, record.salinity, record.transparency) !== null
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
  const mortalityCount = firstNumber(record.mortality, record.dead, record.deaths);

  const normalized: OrsonNormalizedRecord = {
    id: firstString(record.id),
    date,
    timestampMs,
    doc: calculateDoc(docStartMs, timestampMs),
    kinds: recordKinds(record, feedData),
    mbwG,
    mortalityCount,
    feedKg,
    phMorning: firstNumber(record.phMorning),
    phEvening: firstNumber(record.phEvening),
    doMorning: firstNumber(record.doMorning),
    doEvening: firstNumber(record.doEvening),
    salinityPpt: firstNumber(record.salinity),
    transparencyCm: firstNumber(record.transparency),
    temperatureC: firstNumber(record.temp, record.temperature, record.temperatureC),
    feedData,
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

  const rawRecords = Array.isArray(pond.samplings)
    ? pond.samplings
    : Array.isArray(pond.records)
      ? pond.records
      : [];

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
    supplier: firstString(pond.supplier, pond.hatchery),
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
