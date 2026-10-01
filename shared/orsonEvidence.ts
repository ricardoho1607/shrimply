import {
  differenceInFarmCalendarDays,
  normalizeFarmDateKey,
  shiftDateKey,
  getFarmDateKey,
  DEFAULT_FARM_TIME_ZONE,
} from './farmDate';

// ============================================================================
// 1. Central Configurable Evidence Policy
// ============================================================================

export type OrsonEvidenceDomain = 'water' | 'operations' | 'mbw' | 'dailyFeed' | 'lab';

export interface MetricPolicyConfig {
  /** Maximum age in farm calendar days before evidence is considered stale */
  maxAgeDays: number;
  /** Minimum number of valid dated observations required to establish a trend/comparison */
  minRecordsForTrend: number;
  /** Expected logging frequency in days */
  expectedFrequencyDays: number;
  /** Age in days beyond which data is critically stale and lacks diagnostic validity */
  criticalStaleDays?: number;
}

export interface OrsonEvidencePolicy {
  water: MetricPolicyConfig;
  operations: MetricPolicyConfig;
  mbw: MetricPolicyConfig;
  dailyFeed: MetricPolicyConfig;
  lab: MetricPolicyConfig;
}

/**
 * Central Evidence Policy Configuration.
 * Note: Policy thresholds represent operational heuristics for farm monitoring and decision support,
 * not biological guarantees.
 *
 * Operational rules:
 * - Water & Operations: Fresh only on the same farm-local calendar date (date-only: maxAgeDays 0)
 *   or within 24 elapsed hours for timestamped measurements.
 * - MBW: Fresh within 5 farm calendar days (matching standard sampling cadence).
 * - Daily Feed: Fresh on the current or latest completed farm-local calendar day (maxAgeDays 1).
 * - Lab Evidence: Fresh within 7 farm calendar days.
 */
export const DEFAULT_ORSON_EVIDENCE_POLICY: OrsonEvidencePolicy = {
  water: {
    maxAgeDays: 0,
    minRecordsForTrend: 2,
    expectedFrequencyDays: 1,
    criticalStaleDays: 3,
  },
  operations: {
    maxAgeDays: 0,
    minRecordsForTrend: 2,
    expectedFrequencyDays: 1,
    criticalStaleDays: 3,
  },
  mbw: {
    maxAgeDays: 5,
    minRecordsForTrend: 2,
    expectedFrequencyDays: 5,
    criticalStaleDays: 14,
  },
  dailyFeed: {
    maxAgeDays: 1,
    minRecordsForTrend: 2,
    expectedFrequencyDays: 1,
    criticalStaleDays: 3,
  },
  lab: {
    maxAgeDays: 7,
    minRecordsForTrend: 1,
    expectedFrequencyDays: 7,
    criticalStaleDays: 14,
  },
};

export const createEvidencePolicy = (
  overrides?: Partial<Record<OrsonEvidenceDomain, Partial<MetricPolicyConfig>>>,
): OrsonEvidencePolicy => ({
  water: { ...DEFAULT_ORSON_EVIDENCE_POLICY.water, ...overrides?.water },
  operations: { ...DEFAULT_ORSON_EVIDENCE_POLICY.operations, ...overrides?.operations },
  mbw: { ...DEFAULT_ORSON_EVIDENCE_POLICY.mbw, ...overrides?.mbw },
  dailyFeed: { ...DEFAULT_ORSON_EVIDENCE_POLICY.dailyFeed, ...overrides?.dailyFeed },
  lab: { ...DEFAULT_ORSON_EVIDENCE_POLICY.lab, ...overrides?.lab },
});

// ============================================================================
// 2. Feed Parsing & Daily Selection
// ============================================================================

const EMPTY_FEED_TOKENS = new Set(['', 'n/a', 'na', 'null', 'undefined', '--', '-']);

export type FeedParsingStatus = 'valid' | 'missing' | 'malformed' | 'negative';

export interface FeedParsingResult {
  valid: boolean;
  value: number | null;
  status: FeedParsingStatus;
  reason?: string;
}

/**
 * Validates and parses feed quantity in kilograms.
 * Preserves finite nonnegative numbers (including zero: 0 kg feed).
 * Rejects missing, malformed, non-finite, and negative values.
 */
export const validateFeedKg = (value: unknown): FeedParsingResult => {
  if (value === null || value === undefined) {
    return { valid: false, value: null, status: 'missing', reason: 'Feed value is missing' };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { valid: false, value: null, status: 'malformed', reason: 'Feed number is non-finite (NaN or Infinity)' };
    }
    if (value < 0) {
      return { valid: false, value: null, status: 'negative', reason: 'Feed quantity cannot be negative' };
    }
    const cleanZero = Object.is(value, -0) ? 0 : value;
    return { valid: true, value: cleanZero, status: 'valid' };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (EMPTY_FEED_TOKENS.has(trimmed.toLowerCase())) {
      return { valid: false, value: null, status: 'missing', reason: 'Feed string represents an empty token' };
    }
    const normalized = trimmed.replace(/,/g, '');
    // Ensure the string has a valid numeric pattern and does not coerce booleans or arbitrary text
    if (!/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalized)) {
      return { valid: false, value: null, status: 'malformed', reason: 'Feed string contains non-numeric characters' };
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return { valid: false, value: null, status: 'malformed', reason: 'Parsed feed number is non-finite' };
    }
    if (parsed < 0) {
      return { valid: false, value: null, status: 'negative', reason: 'Feed quantity cannot be negative' };
    }
    const cleanZero = Object.is(parsed, -0) ? 0 : parsed;
    return { valid: true, value: cleanZero, status: 'valid' };
  }

  return { valid: false, value: null, status: 'malformed', reason: 'Unsupported type for feed quantity' };
};

/**
 * Pure helper to parse feed quantity in kg.
 * Returns finite nonnegative number (including 0), or null if missing/malformed/negative.
 */
export const parseFeedKg = (value: unknown): number | null => {
  const result = validateFeedKg(value);
  return result.valid ? result.value : null;
};

export interface DailyFeedSelectionEntry {
  farmDate: string;
  feedKg: number;
  sourceIds: string[];
  measuredAt: string | null;
  precision: 'timestamp' | 'date-only';
  isEstimate: boolean;
  hasAuthoritativeDailyFeed: boolean;
  feedingResponse?: 'strong' | 'normal' | 'weak' | null;
  feedingFrequency?: number | null;
  feedType?: string | null;
}

/**
 * Extract feed amount from a single pond or sampling record.
 * Dedicated daily feed data (e.g. from feeding inventory transactions) takes precedence.
 * Biological sampling feed is kept separate unless allowSamplingEstimate is explicitly true.
 */
export const extractDailyFeedFromRecord = (
  record: unknown,
  options: { allowSamplingEstimate?: boolean } = {},
): { feedKg: number | null; isEstimate: boolean; sourceId?: string } => {
  if (!record || typeof record !== 'object') {
    return { feedKg: null, isEstimate: false };
  }

  const rec = record as Record<string, any>;
  const sourceId = typeof rec.id === 'string' ? rec.id : undefined;

  // 1. Authoritative feedData payload
  if (rec.feedData && typeof rec.feedData === 'object') {
    const feedData = rec.feedData;
    const directTotal = parseFeedKg(feedData.totalDailyFeedKg ?? feedData.totalDailyFeed);
    if (directTotal !== null) {
      return { feedKg: directTotal, isEstimate: false, sourceId };
    }

    if (Array.isArray(feedData.feedAllocations) && feedData.feedAllocations.length > 0) {
      let allocationSum = 0;
      let hasValidAllocations = false;
      for (const alloc of feedData.feedAllocations) {
        const qty = parseFeedKg(alloc?.quantityKg);
        if (qty !== null) {
          allocationSum += qty;
          hasValidAllocations = true;
        }
      }
      if (hasValidAllocations) {
        return { feedKg: Math.round(allocationSum * 1000) / 1000, isEstimate: false, sourceId };
      }
    }
  }

  // 2. Direct actualDailyFeedKg on the record
  const directActual = parseFeedKg(rec.actualDailyFeedKg);
  if (directActual !== null && !rec.isBaselineEstimate) {
    return { feedKg: directActual, isEstimate: false, sourceId };
  }

  // 3. Biological sampling record fallback (only if permitted)
  if (options.allowSamplingEstimate) {
    const biologicalFeed = parseFeedKg(rec.feedKg ?? rec.feed);
    if (biologicalFeed !== null) {
      return { feedKg: biologicalFeed, isEstimate: true, sourceId };
    }
  }

  return { feedKg: null, isEstimate: false, sourceId };
};

const parseTimestampMs = (val: unknown): number | null => {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    const ms = val.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'object') {
    if (typeof (val as any).toMillis === 'function') {
      try {
        const ms = (val as any).toMillis();
        return Number.isFinite(ms) ? ms : null;
      } catch (_e) {
        return null;
      }
    }
    const sec = (val as any).seconds ?? (val as any)._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      return sec * 1000;
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

interface FeedCandidate {
  farmDate: string;
  feedKg: number;
  isEstimate: boolean;
  sourceId?: string;
  timestampMs: number | null;
  measuredAt: string | null;
  precision: 'timestamp' | 'date-only';
  feedingResponse?: 'strong' | 'normal' | 'weak' | null;
  feedingFrequency?: number | null;
  feedType?: string | null;
}

const shouldReplaceFeedCandidate = (curr: FeedCandidate, inc: FeedCandidate): boolean => {
  // 1. Authoritative beats estimate strictly
  if (!inc.isEstimate && curr.isEstimate) return true;
  if (inc.isEstimate && !curr.isEstimate) return false;

  // 2. Both are of same authority level (both authoritative or both estimate):
  // Latest measurement timestamp wins; upload/update timestamps are not evidence.
  if (inc.timestampMs !== null && curr.timestampMs !== null) {
    if (inc.timestampMs > curr.timestampMs) return true;
    if (inc.timestampMs < curr.timestampMs) return false;
  } else if (inc.timestampMs !== null && curr.timestampMs === null) {
    return true;
  } else if (inc.timestampMs === null && curr.timestampMs !== null) {
    return false;
  }

  // 3. Stable deterministic ID tie-breaker
  const idInc = inc.sourceId ?? '';
  const idCurr = curr.sourceId ?? '';
  const idCmp = idInc.localeCompare(idCurr);
  if (idCmp > 0) return true;
  if (idCmp < 0) return false;

  // 4. If same ID, do not replace (repeated copies NEVER sum)
  return false;
};

/**
 * Deterministically select daily feed records per calendar day.
 * - Preserves explicit zero feed (0 kg) where recorded feed allocation or daily total is zero;
 *   does not infer fasting, halted feeding, appetite, tray clearance, or consumption.
 * - Daily authoritative feed records strictly win over sampling estimates.
 * - Repeated copies or corrections NEVER sum; selects latest timestamp, then deterministic stable ID.
 * - Explicit zero cannot be overwritten by older positive records or sampling estimates.
 * - Rejects future or invalid dates; keeps missing feed distinct from zero.
 */
export const selectDailyFeedEntries = (
  records: unknown[],
  options: {
    allowSamplingEstimate?: boolean;
    asOfDate?: unknown;
    timeZone?: unknown;
  } = {},
): DailyFeedSelectionEntry[] => {
  if (!Array.isArray(records)) return [];

  const timeZone = options.timeZone ?? DEFAULT_FARM_TIME_ZONE;
  const asOfKey = options.asOfDate ? normalizeFarmDateKey(options.asOfDate, timeZone) : null;

  const dayMap = new Map<string, FeedCandidate>();

  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    const rec = record as Record<string, any>;
    const measurementValue = rec.feedData?.measuredAt
      ?? rec.feedData?.observedAt
      ?? rec.feedData?.date
      ?? rec.measuredAt
      ?? rec.observedAt
      ?? rec.farmDate
      ?? rec.date;
    const rawDate = measurementValue;
    const dateKey = normalizeFarmDateKey(rawDate, timeZone);
    if (!dateKey) continue;
    if (asOfKey && dateKey > asOfKey) continue; // Reject future dates

    const extracted = extractDailyFeedFromRecord(rec, {
      allowSamplingEstimate: options.allowSamplingEstimate,
    });

    if (extracted.feedKg === null) continue; // Missing feed is distinct from 0 and skipped

    const measurementTimestampMs = parseTimestampMs(measurementValue);
    const referenceTimestampMs = typeof options.asOfDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.asOfDate.trim())
      ? null
      : parseTimestampMs(options.asOfDate);
    if (measurementTimestampMs !== null && referenceTimestampMs !== null && measurementTimestampMs > referenceTimestampMs) continue;

    const response = rec.feedData?.feedingResponse ?? rec.feedingResponse;
    const feedingResponse = (response === 'strong' || response === 'normal' || response === 'weak') ? response : null;
    const freq = rec.feedData?.feedingFrequency ?? rec.feedingFrequency;
    const feedingFrequency = (typeof freq === 'number' && Number.isFinite(freq)) ? freq : null;
    const type = rec.feedData?.feedType ?? rec.feedType;
    const feedType = (typeof type === 'string' && type.trim()) ? type.trim() : null;

    const candidate: FeedCandidate = {
      farmDate: dateKey,
      feedKg: extracted.feedKg,
      isEstimate: extracted.isEstimate,
      sourceId: extracted.sourceId,
      timestampMs: measurementTimestampMs,
      measuredAt: measurementValue instanceof Date
        ? (Number.isFinite(measurementValue.getTime()) ? measurementValue.toISOString() : null)
        : typeof measurementValue === 'string' ? measurementValue : null,
      precision: parseTimestampMs(measurementValue) === null ? 'date-only' : 'timestamp',
      feedingResponse,
      feedingFrequency,
      feedType,
    };

    const existing = dayMap.get(dateKey);
    if (!existing) {
      dayMap.set(dateKey, candidate);
    } else if (shouldReplaceFeedCandidate(existing, candidate)) {
      dayMap.set(dateKey, candidate);
    }
  }

  const result: DailyFeedSelectionEntry[] = [];

  for (const candidate of dayMap.values()) {
    result.push({
      farmDate: candidate.farmDate,
      feedKg: candidate.feedKg,
      sourceIds: candidate.sourceId ? [candidate.sourceId] : [],
      measuredAt: candidate.measuredAt,
      precision: candidate.precision,
      isEstimate: candidate.isEstimate,
      hasAuthoritativeDailyFeed: !candidate.isEstimate,
      feedingResponse: candidate.feedingResponse,
      feedingFrequency: candidate.feedingFrequency,
      feedType: candidate.feedType,
    });
  }

  // Stable sort by farmDate ascending, then by feedKg
  return result.sort((a, b) => a.farmDate.localeCompare(b.farmDate) || a.feedKg - b.feedKg);
};

/**
 * Pure freshness evaluator.
 * - Freshness comes only from measurement provenance.
 * - Rejects invalid dates and future dates relative to asOfDate.
 * - Preserves date-only precision using integer calendar day differences.
 * - Water & Operations: Date-only is fresh only on the same farm-local calendar date.
 *   Timestamped water & operations evidence expires after 24 elapsed hours.
 * - Daily Feed: Fresh on the current or latest completed farm-local day (maxAgeDays 1).
 * - MBW: Fresh within 5 farm calendar days.
 * - Lab: Fresh within 7 calendar days.
 */
export const evaluateMeasurementFreshness = (
  provenanceOrDate: unknown,
  asOfDate: unknown,
  options: {
    maxAgeDays?: number;
    criticalStaleDays?: number;
    domain?: OrsonEvidenceDomain;
    policy?: OrsonEvidencePolicy;
    timeZone?: unknown;
  } = {},
): FreshnessEvaluation => {
  const timeZone = options.timeZone ?? DEFAULT_FARM_TIME_ZONE;
  const asOfDateKey = normalizeFarmDateKey(asOfDate, timeZone) ?? getFarmDateKey(new Date(), timeZone);
  const dateKey = extractMeasurementProvenanceDateKey(provenanceOrDate, timeZone);

  const policy = options.policy ?? DEFAULT_ORSON_EVIDENCE_POLICY;
  const domainConfig = options.domain ? policy[options.domain] : undefined;
  const maxAgeDays = options.maxAgeDays ?? domainConfig?.maxAgeDays ?? (options.domain === 'water' || options.domain === 'operations' ? 0 : 7);
  const criticalStaleDays = options.criticalStaleDays ?? domainConfig?.criticalStaleDays ?? (maxAgeDays === 0 ? 3 : maxAgeDays * 2);

  if (!dateKey) {
    return {
      valid: false,
      status: provenanceOrDate ? 'invalid_date' : 'missing_date',
      dateKey: null,
      asOfDateKey,
      ageDays: null,
      isFresh: false,
      isStale: true,
      isCriticallyStale: true,
      isFuture: false,
      maxAgeDays,
      reason: provenanceOrDate ? 'Measurement date is invalid or malformed' : 'Measurement date is missing',
    };
  }

  // Reject future dates
  if (dateKey > asOfDateKey) {
    return {
      valid: false,
      status: 'future_date',
      dateKey,
      asOfDateKey,
      ageDays: null,
      isFresh: false,
      isStale: false,
      isCriticallyStale: false,
      isFuture: true,
      maxAgeDays,
      reason: `Measurement date (${dateKey}) is in the future relative to reference date (${asOfDateKey})`,
    };
  }

  // Preserves calendar date-only precision
  const ageDays = differenceInFarmCalendarDays(asOfDateKey, dateKey);

  // Check 24-hour elapsed expiration for timestamped water/operations evidence
  const rawCandidate = (typeof provenanceOrDate === 'object' && provenanceOrDate !== null && !(provenanceOrDate instanceof Date))
    ? ((provenanceOrDate as any).measuredAt ?? (provenanceOrDate as any).observedAt ?? (provenanceOrDate as any).date ?? (provenanceOrDate as any).sampleDate ?? (provenanceOrDate as any).timestamp)
    : provenanceOrDate;
  const recordMs = parseTimestampMs(rawCandidate);
  const asOfMs = parseTimestampMs(asOfDate);

  if (recordMs !== null && asOfMs !== null && recordMs > asOfMs) {
    return {
      valid: false,
      status: 'future_date',
      dateKey,
      asOfDateKey,
      ageDays: null,
      isFresh: false,
      isStale: false,
      isCriticallyStale: false,
      isFuture: true,
      maxAgeDays,
      reason: 'Measurement timestamp is in the future relative to reference time',
    };
  }

  let isFresh: boolean;
  let isStale: boolean;

  if (recordMs !== null && asOfMs !== null && (options.domain === 'water' || options.domain === 'operations')) {
    const elapsedHours = (asOfMs - recordMs) / (1000 * 60 * 60);
    isFresh = elapsedHours <= 24;
    isStale = elapsedHours > 24;
  } else {
    isFresh = ageDays <= maxAgeDays;
    isStale = ageDays > maxAgeDays;
  }

  const isCriticallyStale = criticalStaleDays !== undefined && ageDays > criticalStaleDays;

  return {
    valid: true,
    status: isFresh ? 'fresh' : 'stale',
    dateKey,
    asOfDateKey,
    ageDays,
    isFresh,
    isStale,
    isCriticallyStale,
    isFuture: false,
    maxAgeDays,
  };
};

/**
 * Deterministic comparator for measurement freshness.
 * Prioritizes freshest (most recent date) first.
 * Stable tie-breaker uses sourceId.
 */
export const compareMeasurementFreshness = <T>(
  a: T,
  b: T,
  getDateKey: (item: T) => string | null | undefined,
  getId?: (item: T) => string | null | undefined,
): number => {
  const dateA = getDateKey(a) ?? '';
  const dateB = getDateKey(b) ?? '';

  // Valid date before missing date
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;

  // Most recent date first (descending)
  const dateDiff = dateB.localeCompare(dateA);
  if (dateDiff !== 0) return dateDiff;

  // Stable tie-breaker by ID
  if (getId) {
    const idA = getId(a) ?? '';
    const idB = getId(b) ?? '';
    return idA.localeCompare(idB);
  }

  return 0;
};

/**
 * Pure helper to rank measurements by freshness with stable ties.
 */
export const rankMeasurementsByFreshness = <T>(
  items: readonly T[],
  getDateKey: (item: T) => string | null | undefined,
  getId?: (item: T) => string | null | undefined,
): T[] => [...items].sort((a, b) => compareMeasurementFreshness(a, b, getDateKey, getId));

// ============================================================================
// 4. Per-Metric Coverage
// ============================================================================

export interface MetricCoverageSummary {
  metric: string;
  domain: OrsonEvidenceDomain;
  windowStart: string;
  windowEnd: string;
  windowDays: number;
  recordedDays: number;
  coverageRatio: number;
  recordedDates: string[];
  missingDates: string[];
  latestDate: string | null;
  ageDays: number | null;
  isFresh: boolean;
  isStale: boolean;
  isCriticallyStale: boolean;
  hasSufficientHistory: boolean;
  omittedOlderCount: number;
  excludedFutureCount: number;
  sourceIds: string[];
}

export interface MeasurementProvenance {
  sourceId?: string;
  measuredAt?: unknown;
  sampleDate?: unknown;
  observedAt?: unknown;
  farmDate?: unknown;
  date?: unknown;
  metric?: string;
  recordType?: string;
  diagnosticMeasurements?: { sampleDate?: unknown };
}

export interface FreshnessEvaluation {
  valid: boolean;
  status: 'fresh' | 'stale' | 'invalid_date' | 'future_date' | 'missing_date';
  dateKey: string | null;
  asOfDateKey: string;
  ageDays: number | null;
  isFresh: boolean;
  isStale: boolean;
  isCriticallyStale: boolean;
  isFuture: boolean;
  maxAgeDays: number;
  reason?: string;
}

/** Read only observation-time fields. Upload and synchronization timestamps are not measurement dates. */
export const extractMeasurementProvenanceDateKey = (
  provenance: unknown,
  timeZone?: unknown,
): string | null => {
  if (provenance === null || provenance === undefined || provenance === '') return null;
  if (typeof provenance === 'string' || provenance instanceof Date) {
    return normalizeFarmDateKey(provenance, timeZone);
  }
  if (typeof provenance !== 'object') return null;
  const p = provenance as Record<string, any>;
  const measurement = p.measuredAt
    ?? p.sampleDate
    ?? p.observedAt
    ?? p.farmDate
    ?? p.date
    ?? p.diagnosticMeasurements?.sampleDate;
  return measurement === null || measurement === undefined || measurement === ''
    ? null
    : normalizeFarmDateKey(measurement, timeZone);
};

export interface MetricCoverageOptions {
  metric?: string;
  domain?: OrsonEvidenceDomain;
  asOfDate?: unknown;
  windowDays?: number;
  minDaysRequired?: number;
  policy?: OrsonEvidencePolicy;
  timeZone?: unknown;
  isValidValue?: (val: unknown) => boolean;
}

/**
 * Calculates per-metric coverage across a sliding farm calendar window.
 * Supports:
 * - evaluateMetricCoverage(records, extractProvenance, options)
 * - evaluateMetricCoverage(records, asOfDate, options)
 * - evaluateMetricCoverage(records, options)
 * Never throws on empty records, non-empty records, or string dates.
 */
export function evaluateMetricCoverage<T = any>(
  records: readonly T[],
  extractProvenance: (item: T) => { date: unknown; value?: unknown; sourceId?: string } | null,
  options?: MetricCoverageOptions,
): MetricCoverageSummary;
export function evaluateMetricCoverage<T = any>(
  records: readonly T[],
  asOfDate: unknown,
  options?: MetricCoverageOptions,
): MetricCoverageSummary;
export function evaluateMetricCoverage<T = any>(
  records: readonly T[],
  options?: MetricCoverageOptions,
): MetricCoverageSummary;
export function evaluateMetricCoverage(
  records: readonly any[],
  extractProvenanceOrAsOfDate?: any,
  options?: any,
): MetricCoverageSummary {
  let extractProvenance: ((item: any) => { date: unknown; value?: unknown; sourceId?: string } | null) | null = null;
  let resolvedOptions: MetricCoverageOptions = {};

  if (typeof extractProvenanceOrAsOfDate === 'function') {
    extractProvenance = extractProvenanceOrAsOfDate;
    resolvedOptions = options ?? {};
  } else if (
    extractProvenanceOrAsOfDate !== null &&
    typeof extractProvenanceOrAsOfDate === 'object' &&
    !(extractProvenanceOrAsOfDate instanceof Date) &&
    options === undefined
  ) {
    resolvedOptions = extractProvenanceOrAsOfDate;
  } else {
    resolvedOptions = {
      ...(options ?? {}),
      asOfDate: options?.asOfDate ?? extractProvenanceOrAsOfDate,
    };
  }

  if (!extractProvenance) {
    extractProvenance = (item: any) => {
      if (item === null || item === undefined) return null;
      if (typeof item === 'string' || item instanceof Date) {
        return { date: item, value: item };
      }
      if (typeof item === 'object') {
        const dateCandidate = item.date ?? item.sampleDate ?? item.measuredAt ?? item.farmDate;
        const valCandidate = item.value !== undefined ? item.value : (item.val ?? item);
        const sourceId = item.sourceId ?? item.id ?? undefined;
        return { date: dateCandidate, value: valCandidate, sourceId };
      }
      return null;
    };
  }

  const timeZone = resolvedOptions.timeZone ?? DEFAULT_FARM_TIME_ZONE;
  const policy = resolvedOptions.policy ?? DEFAULT_ORSON_EVIDENCE_POLICY;
  const domain: OrsonEvidenceDomain = resolvedOptions.domain ?? 'water';
  const domainPolicy = policy[domain] ?? DEFAULT_ORSON_EVIDENCE_POLICY.water;
  const metric = resolvedOptions.metric ?? (domain as string);
  const windowDays = Math.max(1, resolvedOptions.windowDays ?? 14);

  const windowEnd = normalizeFarmDateKey(resolvedOptions.asOfDate, timeZone) ?? getFarmDateKey(new Date(), timeZone);
  const windowStart = shiftDateKey(windowEnd, -(windowDays - 1));

  const validRecordDates = new Set<string>();
  const collectedSourceIds = new Set<string>();
  let omittedOlderCount = 0;
  let excludedFutureCount = 0;

  const defaultValidator = (val: unknown): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'number') return Number.isFinite(val);
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  };
  const validator = resolvedOptions.isValidValue ?? defaultValidator;

  const safeRecords = Array.isArray(records) ? records : [];

  for (const record of safeRecords) {
    const extracted = extractProvenance(record);
    if (!extracted) continue;

    const dateKey = normalizeFarmDateKey(extracted.date, timeZone);
    if (!dateKey) continue;

    if (dateKey > windowEnd) {
      excludedFutureCount++;
      continue;
    }

    if (dateKey < windowStart) {
      omittedOlderCount++;
      continue;
    }

    if (validator(extracted.value)) {
      validRecordDates.add(dateKey);
      if (extracted.sourceId) collectedSourceIds.add(extracted.sourceId);
    }
  }

  const recordedDates = Array.from(validRecordDates).sort();
  const recordedDays = recordedDates.length;
  const coverageRatio = Math.round((recordedDays / windowDays) * 1000) / 1000;

  // Build expected window dates
  const missingDates: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    const curDate = shiftDateKey(windowStart, i);
    if (!validRecordDates.has(curDate)) {
      missingDates.push(curDate);
    }
  }

  const latestDate = recordedDates.length > 0 ? recordedDates[recordedDates.length - 1] : null;
  const ageDays = latestDate ? differenceInFarmCalendarDays(windowEnd, latestDate) : null;

  const isFresh = ageDays !== null && ageDays <= domainPolicy.maxAgeDays;
  const isStale = ageDays === null || ageDays > domainPolicy.maxAgeDays;
  const isCriticallyStale =
    ageDays === null ||
    (domainPolicy.criticalStaleDays !== undefined && ageDays > domainPolicy.criticalStaleDays);

  const minRequired = resolvedOptions.minDaysRequired ?? domainPolicy.minRecordsForTrend ?? 1;
  const hasSufficientHistory = recordedDays >= minRequired;

  return {
    metric,
    domain,
    windowStart,
    windowEnd,
    windowDays,
    recordedDays,
    coverageRatio,
    recordedDates,
    missingDates,
    latestDate,
    ageDays,
    isFresh,
    isStale,
    isCriticallyStale,
    hasSufficientHistory,
    omittedOlderCount,
    excludedFutureCount,
    sourceIds: Array.from(collectedSourceIds).sort(),
  };
}

// ============================================================================
// 5. Deterministic Risk & Freshness Ranking with Stable Ties
// ============================================================================

export type OrsonRiskSeverity = 'critical' | 'warning' | 'watch' | 'info';

export const RISK_SEVERITY_ORDER: Record<OrsonRiskSeverity, number> = {
  critical: 4,
  warning: 3,
  watch: 2,
  info: 1,
};

export const getSeverityWeight = (severity: unknown): number => {
  if (typeof severity !== 'string') return 0;
  const lower = severity.trim().toLowerCase();
  return (RISK_SEVERITY_ORDER as Record<string, number>)[lower] ?? 0;
};

/**
 * Pure comparator for risk severity strings.
 */
export const compareRiskSeverities = (a: unknown, b: unknown): number => {
  return getSeverityWeight(b) - getSeverityWeight(a);
};

/**
 * Determines whether a risk finding represents historical/stale/watch-only data
 * rather than an active/current finding.
 */
export const isFindingHistorical = (finding: IdentifiableRiskFinding | unknown): boolean => {
  if (!finding || typeof finding !== 'object') return false;
  const f = finding as Record<string, any>;
  if (f.isHistorical === true || f.status === 'historical' || f.temporalStatus === 'historical' || f.currentSupport === false) return true;
  if (typeof f.title === 'string' && f.title.trim().toLowerCase().startsWith('historical')) return true;
  if (typeof f.id === 'string' && f.id.includes('historical')) return true;
  return false;
};

/**
 * Computes highest severity in an iterable collection of severity levels.
 */
export const highestRiskSeverity = (
  severities: Iterable<unknown>,
): OrsonRiskSeverity => {
  let highest: OrsonRiskSeverity = 'info';
  let maxWeight = 1;

  for (const s of severities) {
    const weight = getSeverityWeight(s);
    if (weight > maxWeight) {
      maxWeight = weight;
      if (weight >= 4) highest = 'critical';
      else if (weight === 3) highest = 'warning';
      else if (weight === 2) highest = 'watch';
    }
  }

  return highest;
};

/**
 * Computes highest severity among current supported findings only.
 * Historical-only findings do not elevate whole-farm severity.
 */
export const highestCurrentRiskSeverity = (
  findings: Iterable<IdentifiableRiskFinding>,
): OrsonRiskSeverity => {
  let highest: OrsonRiskSeverity = 'info';
  let maxWeight = 1;

  for (const f of findings) {
    if (isFindingHistorical(f)) continue; // History must not elevate current whole-farm severity
    const weight = getSeverityWeight(f.severity);
    if (weight > maxWeight) {
      maxWeight = weight;
      if (weight >= 4) highest = 'critical';
      else if (weight === 3) highest = 'warning';
      else if (weight === 2) highest = 'watch';
    }
  }

  return highest;
};

export interface IdentifiableRiskFinding {
  id: string;
  severity: OrsonRiskSeverity | string;
  confidence?: number | null;
  eventDate?: string | null;
  title?: string;
  summary?: string;
  isHistorical?: boolean;
  status?: string;
  actionTiming?: unknown;
}

/**
 * Pure deterministic risk finding comparator with stable ties.
 * 1. Current supported findings rank before historical/watch-only findings
 * 2. Severity weight descending (critical > warning > watch > info)
 * 3. Existing explicit action timing, when present
 * 4. Event date descending (fresher / more recent finding first)
 * 5. Stable tie-breakers: id ascending, then title ascending, then summary ascending.
 */
export const compareRiskFindings = (
  a: IdentifiableRiskFinding,
  b: IdentifiableRiskFinding,
): number => {
  // 1. Current supported findings rank before historical/watch-only findings
  const histA = isFindingHistorical(a);
  const histB = isFindingHistorical(b);
  if (!histA && histB) return -1;
  if (histA && !histB) return 1;

  // 2. Severity weight
  const sevA = getSeverityWeight(a.severity);
  const sevB = getSeverityWeight(b.severity);
  if (sevA !== sevB) {
    return sevB - sevA; // Higher severity first
  }

  // 3. Respect explicit action timing if a consumer already supplies it.
  const timingRank: Record<string, number> = { immediate: 4, now: 4, today: 3, soon: 2, monitor: 1 };
  const timingA = typeof a.actionTiming === 'string' ? timingRank[a.actionTiming.toLowerCase()] ?? 0 : 0;
  const timingB = typeof b.actionTiming === 'string' ? timingRank[b.actionTiming.toLowerCase()] ?? 0 : 0;
  if (timingA !== timingB) return timingB - timingA;

  // 4. Event date (descending, more recent first)
  const dateA = typeof a.eventDate === 'string' ? a.eventDate.trim() : '';
  const dateB = typeof b.eventDate === 'string' ? b.eventDate.trim() : '';
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;
  const dateDiff = dateB.localeCompare(dateA);
  if (dateDiff !== 0) return dateDiff;

  // 5. Deterministic stable tie-breakers
  const idA = typeof a.id === 'string' ? a.id : '';
  const idB = typeof b.id === 'string' ? b.id : '';
  const idDiff = idA.localeCompare(idB);
  if (idDiff !== 0) return idDiff;

  const titleA = typeof a.title === 'string' ? a.title : '';
  const titleB = typeof b.title === 'string' ? b.title : '';
  const titleDiff = titleA.localeCompare(titleB);
  if (titleDiff !== 0) return titleDiff;

  const sumA = typeof a.summary === 'string' ? a.summary : '';
  const sumB = typeof b.summary === 'string' ? b.summary : '';
  return sumA.localeCompare(sumB);
};

/**
 * Pure ranking helper for risk findings.
 * Does not mutate input array. Guarantees stable deterministic ordering.
 */
export const rankRiskFindings = <T extends IdentifiableRiskFinding>(
  findings: readonly T[],
): T[] => {
  return [...findings].sort(compareRiskFindings);
};

export interface PondRiskSummary {
  pondId: string | null;
  pondName?: string;
  overallSeverity: OrsonRiskSeverity | string;
  findings?: readonly IdentifiableRiskFinding[];
}

/**
 * Pure comparator for multi-pond risk comparisons.
 * 1. Overall severity descending (historical findings do not raise current whole-farm severity)
 * 2. Count of current critical findings descending
 * 3. Count of current warning findings descending
 * 4. Most recent event date descending
 * 5. Stable tie-breaker: pondName ascending, then pondId ascending.
 */
export const comparePondRiskReports = (
  a: PondRiskSummary,
  b: PondRiskSummary,
): number => {
  const currentA = (a.findings ?? []).filter((finding) => !isFindingHistorical(finding));
  const currentB = (b.findings ?? []).filter((finding) => !isFindingHistorical(finding));

  // 1. Highest current supported severity
  const sevA = Math.max(0, ...currentA.map((finding) => getSeverityWeight(finding.severity)));
  const sevB = Math.max(0, ...currentB.map((finding) => getSeverityWeight(finding.severity)));
  if (sevA !== sevB) return sevB - sevA;

  // 2. Existing explicit action timing, when present
  const timingRank: Record<string, number> = { immediate: 4, now: 4, today: 3, soon: 2, monitor: 1 };
  const topA = rankRiskFindings(currentA)[0];
  const topB = rankRiskFindings(currentB)[0];
  const timingA = typeof topA?.actionTiming === 'string' ? timingRank[topA.actionTiming.toLowerCase()] ?? 0 : 0;
  const timingB = typeof topB?.actionTiming === 'string' ? timingRank[topB.actionTiming.toLowerCase()] ?? 0 : 0;
  if (timingA !== timingB) return timingB - timingA;

  // 3. Freshest relevant current evidence
  const dateA = currentA.map((f) => (typeof f.eventDate === 'string' ? f.eventDate.trim() : '')).filter(Boolean).sort().reverse()[0] || '';
  const dateB = currentB.map((f) => (typeof f.eventDate === 'string' ? f.eventDate.trim() : '')).filter(Boolean).sort().reverse()[0] || '';
  if (dateA !== dateB) {
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return dateB.localeCompare(dateA);
  }

  // 4. Stable finding/pond tie-breakers
  const findingIdA = typeof topA?.id === 'string' ? topA.id : '';
  const findingIdB = typeof topB?.id === 'string' ? topB.id : '';
  const findingDiff = findingIdA.localeCompare(findingIdB);
  if (findingDiff !== 0) return findingDiff;

  const nameA = typeof a.pondName === 'string' ? a.pondName : '';
  const nameB = typeof b.pondName === 'string' ? b.pondName : '';
  const nameDiff = nameA.localeCompare(nameB);
  if (nameDiff !== 0) return nameDiff;

  const idA = typeof a.pondId === 'string' ? a.pondId : '';
  const idB = typeof b.pondId === 'string' ? b.pondId : '';
  return idA.localeCompare(idB);
};

/**
 * Pure pond risk ranking helper.
 */
export const rankPondsByRisk = <T extends PondRiskSummary>(
  ponds: readonly T[],
): T[] => {
  return [...ponds].sort(comparePondRiskReports);
};
