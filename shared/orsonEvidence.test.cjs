const test = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/register-typescript.cjs');

const {
  validateFeedKg,
  parseFeedKg,
  extractDailyFeedFromRecord,
  selectDailyFeedEntries,
  extractMeasurementProvenanceDateKey,
  evaluateMeasurementFreshness,
  compareMeasurementFreshness,
  rankMeasurementsByFreshness,
  DEFAULT_ORSON_EVIDENCE_POLICY,
  createEvidencePolicy,
  evaluateMetricCoverage,
  isFindingHistorical,
  highestRiskSeverity,
  highestCurrentRiskSeverity,
  compareRiskSeverities,
  compareRiskFindings,
  rankRiskFindings,
  comparePondRiskReports,
  rankPondsByRisk,
} = require('./orsonEvidence.ts');

// ============================================================================
// 1. Feed Parsing & Daily Selection
// Acceptance Criterion: "Preserve finite nonnegative feed including zero; reject missing, malformed, negative."
// ============================================================================

test('feed parsing preserves finite nonnegative numbers including zero', () => {
  // Numeric zeros
  assert.equal(parseFeedKg(0), 0);
  assert.equal(parseFeedKg(0.0), 0);
  assert.equal(parseFeedKg(-0), 0);

  // String zeros
  assert.equal(parseFeedKg('0'), 0);
  assert.equal(parseFeedKg('0.0'), 0);
  assert.equal(parseFeedKg('0.00'), 0);
  assert.equal(parseFeedKg('  0.0  '), 0);

  // Positive numbers and strings
  assert.equal(parseFeedKg(12.5), 12.5);
  assert.equal(parseFeedKg('12.5'), 12.5);
  assert.equal(parseFeedKg('1,250.75'), 1250.75);
  assert.equal(parseFeedKg(100), 100);

  // validateFeedKg details
  assert.deepEqual(validateFeedKg(0), { valid: true, value: 0, status: 'valid' });
  assert.deepEqual(validateFeedKg('0.0'), { valid: true, value: 0, status: 'valid' });
  assert.deepEqual(validateFeedKg(25), { valid: true, value: 25, status: 'valid' });
});

test('feed parsing rejects missing, malformed, non-finite, and negative values', () => {
  // Missing / empty tokens
  assert.equal(parseFeedKg(null), null);
  assert.equal(parseFeedKg(undefined), null);
  assert.equal(parseFeedKg(''), null);
  assert.equal(parseFeedKg('   '), null);
  assert.equal(parseFeedKg('n/a'), null);
  assert.equal(parseFeedKg('na'), null);
  assert.equal(parseFeedKg('--'), null);
  assert.equal(parseFeedKg('-'), null);
  assert.equal(parseFeedKg('null'), null);
  assert.equal(parseFeedKg('undefined'), null);

  // Negative values
  assert.equal(parseFeedKg(-0.001), null);
  assert.equal(parseFeedKg(-1), null);
  assert.equal(parseFeedKg('-5.5'), null);
  assert.equal(validateFeedKg(-1).status, 'negative');
  assert.equal(validateFeedKg('-0.5').status, 'negative');

  // Non-finite numbers
  assert.equal(parseFeedKg(NaN), null);
  assert.equal(parseFeedKg(Infinity), null);
  assert.equal(parseFeedKg(-Infinity), null);
  assert.equal(validateFeedKg(NaN).status, 'malformed');

  // Malformed text or wrong types
  assert.equal(parseFeedKg('abc'), null);
  assert.equal(parseFeedKg('15kg'), null);
  assert.equal(parseFeedKg('12.3.4'), null);
  assert.equal(parseFeedKg({}), null);
  assert.equal(parseFeedKg([]), null);
  assert.equal(parseFeedKg(true), null);
  assert.equal(parseFeedKg(false), null);
  assert.equal(validateFeedKg('15kg').status, 'malformed');
});

test('daily feed extraction and selection preserves zero feed while keeping biological sampling separate', () => {
  const records = [
    // Authoritative daily feed recorded as 0 kg (reason remains unknown)
    { id: 'feed-1', date: '2026-09-01', feedData: { totalDailyFeedKg: 0, feedingResponse: 'weak' } },
    // Normal feeding day
    { id: 'feed-2', date: '2026-09-02', feedData: { totalDailyFeed: '45.50', feedingResponse: 'normal' } },
    // Feeding allocations day
    {
      id: 'feed-3',
      date: '2026-09-03',
      feedData: {
        feedAllocations: [{ quantityKg: 20 }, { quantityKg: 25.25 }],
        feedingResponse: 'strong',
      },
    },
    // Biological sampling observation without feedData
    { id: 'sampling-1', date: '2026-09-04', mbw: 14.5, feed: 40 },
    // Malformed/negative feeding attempt (should be rejected)
    { id: 'feed-invalid', date: '2026-09-05', feedData: { totalDailyFeedKg: -10 } },
  ];

  // Default selection: sampling feed is not mixed into actual daily feeding
  const entries = selectDailyFeedEntries(records);
  assert.equal(entries.length, 3);

  // 2026-09-01 has 0 kg feed preserved
  assert.equal(entries[0].farmDate, '2026-09-01');
  assert.equal(entries[0].feedKg, 0);
  assert.equal(entries[0].hasAuthoritativeDailyFeed, true);
  assert.equal(entries[0].isEstimate, false);
  assert.equal(entries[0].feedingResponse, 'weak');

  // 2026-09-02 has 45.5 kg
  assert.equal(entries[1].farmDate, '2026-09-02');
  assert.equal(entries[1].feedKg, 45.5);

  // 2026-09-03 sums allocations to 45.25 kg
  assert.equal(entries[2].farmDate, '2026-09-03');
  assert.equal(entries[2].feedKg, 45.25);

  // When allowSamplingEstimate is true, sampling feed is accepted as an estimate
  const entriesWithEstimate = selectDailyFeedEntries(records, { allowSamplingEstimate: true });
  assert.equal(entriesWithEstimate.length, 4);
  const samplingEntry = entriesWithEstimate.find((e) => e.farmDate === '2026-09-04');
  assert.ok(samplingEntry);
  assert.equal(samplingEntry.feedKg, 40);
  assert.equal(samplingEntry.isEstimate, true);
  assert.equal(samplingEntry.hasAuthoritativeDailyFeed, false);
});

test('selectDailyFeedEntries deduplicates same-ID copies without summing', () => {
  const records = [
    { id: 'feed-sync-1', date: '2026-09-01', actualDailyFeedKg: 50, updatedAt: '2026-09-01T10:00:00Z' },
    { id: 'feed-sync-1', date: '2026-09-01', actualDailyFeedKg: 50, updatedAt: '2026-09-01T10:00:00Z' },
  ];
  const entries = selectDailyFeedEntries(records);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].farmDate, '2026-09-01');
  assert.equal(entries[0].feedKg, 50, 'must not sum duplicate copies with the same ID');
});

test('selectDailyFeedEntries chooses latest correction timestamp in either input order', () => {
  const oldRec = { id: 'z-early', date: '2026-09-02', actualDailyFeedKg: 30, measuredAt: '2026-09-02T08:00:00Z', updatedAt: '2026-09-02T16:00:00Z' };
  const newRec = { id: 'a-late', date: '2026-09-02', actualDailyFeedKg: 42, measuredAt: '2026-09-02T16:00:00Z', updatedAt: '2026-09-02T08:00:00Z' };

  // Forward order
  const entries1 = selectDailyFeedEntries([oldRec, newRec]);
  assert.equal(entries1.length, 1);
  assert.equal(entries1[0].feedKg, 42);

  // Reverse order
  const entries2 = selectDailyFeedEntries([newRec, oldRec]);
  assert.equal(entries2.length, 1);
  assert.equal(entries2[0].feedKg, 42, 'latest timestamp must win regardless of input order');
});

test('selectDailyFeedEntries preserves zero correction after positive in either input order', () => {
  const posRec = { id: 'z-positive', date: '2026-09-03', actualDailyFeedKg: 35, measuredAt: '2026-09-03T07:00:00Z', updatedAt: '2026-09-03T12:00:00Z' };
  const zeroRec = { id: 'a-zero', date: '2026-09-03', actualDailyFeedKg: 0, measuredAt: '2026-09-03T11:00:00Z', updatedAt: '2026-09-03T07:00:00Z' };

  const entries1 = selectDailyFeedEntries([posRec, zeroRec]);
  assert.equal(entries1.length, 1);
  assert.equal(entries1[0].feedKg, 0, 'zero correction after positive must be selected');

  const entries2 = selectDailyFeedEntries([zeroRec, posRec]);
  assert.equal(entries2.length, 1);
  assert.equal(entries2[0].feedKg, 0, 'zero correction must not be overwritten by older positive');
});

test('selectDailyFeedEntries resolves conflict with sampling in favor of authoritative record', () => {
  const authZero = { id: 'auth-feed', date: '2026-09-04', actualDailyFeedKg: 0, updatedAt: '2026-09-04T08:00:00Z' };
  const samplingRec = { id: 'sampling-obs', date: '2026-09-04', mbw: 15.2, feed: 45, updatedAt: '2026-09-04T16:00:00Z' };

  const entriesForward = selectDailyFeedEntries([authZero, samplingRec], { allowSamplingEstimate: true });
  assert.equal(entriesForward.length, 1);
  assert.equal(entriesForward[0].feedKg, 0);
  assert.equal(entriesForward[0].hasAuthoritativeDailyFeed, true);
  assert.equal(entriesForward[0].isEstimate, false);

  const entriesReverse = selectDailyFeedEntries([samplingRec, authZero], { allowSamplingEstimate: true });
  assert.equal(entriesReverse.length, 1);
  assert.equal(entriesReverse[0].feedKg, 0);
  assert.equal(entriesReverse[0].hasAuthoritativeDailyFeed, true);
  assert.equal(entriesReverse[0].isEstimate, false);
});

test('daily-feed measurement timestamps use farm-local dates and reject future instants', () => {
  const selected = selectDailyFeedEntries([
    { id: 'jakarta-boundary', feedData: { totalDailyFeed: 12, measuredAt: '2026-08-31T17:30:00Z' } },
    { id: 'future-same-day', actualDailyFeedKg: 20, measuredAt: '2026-09-01T12:01:00Z' },
  ], {
    asOfDate: '2026-09-01T12:00:00Z',
    timeZone: 'Asia/Jakarta',
  });

  assert.equal(selected.length, 1);
  assert.equal(selected[0].farmDate, '2026-09-01');
  assert.equal(selected[0].measuredAt, '2026-08-31T17:30:00Z');
  assert.equal(selected[0].precision, 'timestamp');
});

// ============================================================================
// 2. Freshness & Provenance
// Acceptance Criterion: "Freshness comes only from measurement provenance, rejects invalid/future dates, preserves date-only precision."
// ============================================================================

test('measurement provenance extraction rejects administrative sync timestamps and accepts observation dates', () => {
  // Only system timestamps -> rejected as measurement provenance
  assert.equal(extractMeasurementProvenanceDateKey({ createdAt: '2026-09-10T12:00:00Z' }), null);
  assert.equal(extractMeasurementProvenanceDateKey({ updatedAt: '2026-09-10' }), null);
  assert.equal(extractMeasurementProvenanceDateKey({ syncedAt: '2026-09-10' }), null);

  // Actual observation fields -> accepted
  assert.equal(extractMeasurementProvenanceDateKey({ measuredAt: '2026-09-05' }), '2026-09-05');
  assert.equal(extractMeasurementProvenanceDateKey({ sampleDate: '2026-09-06' }), '2026-09-06');
  assert.equal(extractMeasurementProvenanceDateKey({ observedAt: '2026-09-07T06:30:00Z' }), '2026-09-07');
  assert.equal(extractMeasurementProvenanceDateKey({ farmDate: '2026-09-08' }), '2026-09-08');
  assert.equal(extractMeasurementProvenanceDateKey({ date: '2026-09-09' }), '2026-09-09');
});

test('freshness evaluation preserves date-only precision and rejects future/invalid dates', () => {
  const asOfDate = '2026-09-10';

  // Same day -> ageDays 0
  const sameDay = evaluateMeasurementFreshness('2026-09-10', asOfDate, { maxAgeDays: 7 });
  assert.equal(sameDay.valid, true);
  assert.equal(sameDay.ageDays, 0);
  assert.equal(sameDay.isFresh, true);
  assert.equal(sameDay.isStale, false);
  assert.equal(sameDay.isFuture, false);

  // 3 days ago -> ageDays 3, fresh
  const threeDaysAgo = evaluateMeasurementFreshness('2026-09-07', asOfDate, { maxAgeDays: 7 });
  assert.equal(threeDaysAgo.valid, true);
  assert.equal(threeDaysAgo.ageDays, 3);
  assert.equal(threeDaysAgo.isFresh, true);
  assert.equal(threeDaysAgo.isStale, false);

  // 8 days ago -> ageDays 8, stale with maxAge 7
  const eightDaysAgo = evaluateMeasurementFreshness('2026-09-02', asOfDate, { maxAgeDays: 7 });
  assert.equal(eightDaysAgo.valid, true);
  assert.equal(eightDaysAgo.ageDays, 8);
  assert.equal(eightDaysAgo.isFresh, false);
  assert.equal(eightDaysAgo.isStale, true);

  // 20 days ago -> critically stale with criticalStaleDays 14
  const twentyDaysAgo = evaluateMeasurementFreshness('2026-08-21', asOfDate, { maxAgeDays: 7, criticalStaleDays: 14 });
  assert.equal(twentyDaysAgo.valid, true);
  assert.equal(twentyDaysAgo.ageDays, 20);
  assert.equal(twentyDaysAgo.isCriticallyStale, true);

  // Future date relative to asOfDate -> rejected
  const future = evaluateMeasurementFreshness('2026-09-11', asOfDate, { maxAgeDays: 7 });
  assert.equal(future.valid, false);
  assert.equal(future.status, 'future_date');
  assert.equal(future.isFuture, true);
  assert.equal(future.ageDays, null);
  assert.equal(future.isFresh, false);
  assert.equal(future.isStale, false);

  // Invalid date -> rejected
  const invalid = evaluateMeasurementFreshness('not-a-valid-date', asOfDate);
  assert.equal(invalid.valid, false);
  assert.equal(invalid.status, 'invalid_date');
  assert.equal(invalid.ageDays, null);

  // Missing date -> rejected
  const missing = evaluateMeasurementFreshness(null, asOfDate);
  assert.equal(missing.valid, false);
  assert.equal(missing.status, 'missing_date');
});

// ============================================================================
// 3. Central Configurable Policy & Per-Metric Coverage
// Acceptance Criterion: "Central configurable policy for water/operations, MBW, daily feed and lab; per-metric coverage."
// ============================================================================

test('central evidence policy configures defaults for water, operations, MBW, daily feed, and lab', () => {
  const policy = DEFAULT_ORSON_EVIDENCE_POLICY;

  // Water & Operations: date-only same farm-local calendar date
  assert.equal(policy.water.maxAgeDays, 0);
  assert.equal(policy.water.minRecordsForTrend, 2);

  assert.equal(policy.operations.maxAgeDays, 0);
  assert.equal(policy.operations.minRecordsForTrend, 2);

  // MBW: 5 farm calendar days
  assert.equal(policy.mbw.maxAgeDays, 5);
  assert.equal(policy.mbw.minRecordsForTrend, 2);
  assert.equal(policy.mbw.expectedFrequencyDays, 5);

  // Daily Feed: current or latest completed farm-local day (1 day)
  assert.equal(policy.dailyFeed.maxAgeDays, 1);
  assert.equal(policy.dailyFeed.minRecordsForTrend, 2);

  // Lab: 7 calendar days
  assert.equal(policy.lab.maxAgeDays, 7);
  assert.equal(policy.lab.minRecordsForTrend, 1);

  // Custom overrides
  const custom = createEvidencePolicy({
    water: { maxAgeDays: 1 },
    mbw: { maxAgeDays: 7, minRecordsForTrend: 3 },
  });
  assert.equal(custom.water.maxAgeDays, 1);
  assert.equal(custom.water.minRecordsForTrend, 2);
  assert.equal(custom.mbw.maxAgeDays, 7);
  assert.equal(custom.mbw.minRecordsForTrend, 3);
  assert.equal(custom.lab.maxAgeDays, 7);
});

test('explicit boundary tests for freshness across all domains and timestamps', () => {
  const asOfDate = '2026-09-14';

  // 1. Water: date-only same day is fresh, 1 day old is stale
  const waterSameDay = evaluateMeasurementFreshness('2026-09-14', asOfDate, { domain: 'water' });
  assert.equal(waterSameDay.isFresh, true, 'date-only water on same day is fresh');
  assert.equal(waterSameDay.isStale, false);

  const waterYesterday = evaluateMeasurementFreshness('2026-09-13', asOfDate, { domain: 'water' });
  assert.equal(waterYesterday.isFresh, false, 'date-only water 1 day old is stale');
  assert.equal(waterYesterday.isStale, true);

  // Timestamped water: 23 hours ago is fresh, 25 hours ago expires
  const asOfTimestamp = new Date('2026-09-14T10:00:00Z');
  const freshWaterTs = evaluateMeasurementFreshness(
    new Date('2026-09-13T11:00:00Z'), // 23h elapsed
    asOfTimestamp,
    { domain: 'water' },
  );
  assert.equal(freshWaterTs.isFresh, true, 'timestamped water 23h elapsed is fresh');

  const staleWaterTs = evaluateMeasurementFreshness(
    new Date('2026-09-13T09:00:00Z'), // 25h elapsed
    asOfTimestamp,
    { domain: 'water' },
  );
  assert.equal(staleWaterTs.isFresh, false, 'timestamped water 25h elapsed is stale');
  assert.equal(staleWaterTs.isStale, true);

  // 2. MBW: 5 days fresh, 6 days stale
  const mbw5d = evaluateMeasurementFreshness('2026-09-09', asOfDate, { domain: 'mbw' }); // 5d diff
  assert.equal(mbw5d.isFresh, true, 'MBW at 5 days is fresh');

  const mbw6d = evaluateMeasurementFreshness('2026-09-08', asOfDate, { domain: 'mbw' }); // 6d diff
  assert.equal(mbw6d.isFresh, false, 'MBW at 6 days is stale');
  assert.equal(mbw6d.isStale, true);

  // 3. Daily Feed: current day or 1 day old fresh, 2 days old stale
  const feed1d = evaluateMeasurementFreshness('2026-09-13', asOfDate, { domain: 'dailyFeed' });
  assert.equal(feed1d.isFresh, true, 'Daily feed 1 day old (latest completed day) is fresh');

  const feed2d = evaluateMeasurementFreshness('2026-09-12', asOfDate, { domain: 'dailyFeed' });
  assert.equal(feed2d.isFresh, false, 'Daily feed 2 days old is stale');

  // 4. Lab: 7 days fresh, 8 days stale
  const lab7d = evaluateMeasurementFreshness('2026-09-07', asOfDate, { domain: 'lab' }); // 7d diff
  assert.equal(lab7d.isFresh, true, 'Lab at 7 days is fresh');

  const lab8d = evaluateMeasurementFreshness('2026-09-06', asOfDate, { domain: 'lab' }); // 8d diff
  assert.equal(lab8d.isFresh, false, 'Lab at 8 days is stale');
});

test('per-metric coverage calculates window coverage, missing dates, and recency', () => {
  const asOfDate = '2026-09-14';
  const records = [
    { date: '2026-09-01', doMorning: 5.2, id: 'r1' }, // day 1 of 14d window (2026-09-01 to 2026-09-14)
    { date: '2026-09-02', doMorning: 5.0, id: 'r2' },
    { date: '2026-09-03', doMorning: null, id: 'r3' }, // null value, not counted
    { date: '2026-09-10', doMorning: 4.8, id: 'r4' },
    { date: '2026-09-14', doMorning: 4.5, id: 'r5' }, // latest on asOfDate
    { date: '2026-08-20', doMorning: 6.0, id: 'r-old' }, // before window
    { date: '2026-09-15', doMorning: 4.4, id: 'r-future' }, // after asOfDate
  ];

  const coverage = evaluateMetricCoverage(
    records,
    (r) => ({ date: r.date, value: r.doMorning, sourceId: r.id }),
    {
      metric: 'doMorning',
      domain: 'water',
      asOfDate,
      windowDays: 14,
    },
  );

  assert.equal(coverage.metric, 'doMorning');
  assert.equal(coverage.domain, 'water');
  assert.equal(coverage.windowStart, '2026-09-01');
  assert.equal(coverage.windowEnd, '2026-09-14');
  assert.equal(coverage.windowDays, 14);
  assert.equal(coverage.recordedDays, 4); // 09-01, 09-02, 09-10, 09-14
  assert.equal(coverage.coverageRatio, 0.286);
  assert.equal(coverage.latestDate, '2026-09-14');
  assert.equal(coverage.ageDays, 0);
  assert.equal(coverage.isFresh, true);
  assert.equal(coverage.isStale, false);
  assert.equal(coverage.hasSufficientHistory, true);
  assert.equal(coverage.omittedOlderCount, 1);
  assert.equal(coverage.excludedFutureCount, 1);
  assert.ok(coverage.missingDates.includes('2026-09-03'));
  assert.ok(coverage.missingDates.includes('2026-09-04'));
  assert.ok(coverage.sourceIds.includes('r1'));
  assert.ok(coverage.sourceIds.includes('r5'));
});

test('evaluateMetricCoverage handles empty records, string arrays, and alternative signatures without throwing', () => {
  const asOfDate = '2026-09-14';

  // 1. Empty records array
  const emptyCoverage = evaluateMetricCoverage([], {
    metric: 'mbw',
    domain: 'mbw',
    asOfDate,
    windowDays: 14,
    minDaysRequired: 2,
  });
  assert.equal(emptyCoverage.recordedDays, 0);
  assert.equal(emptyCoverage.coverageRatio, 0);
  assert.equal(emptyCoverage.latestDate, null);
  assert.equal(emptyCoverage.ageDays, null);
  assert.equal(emptyCoverage.isFresh, false);
  assert.equal(emptyCoverage.isStale, true);
  assert.equal(emptyCoverage.hasSufficientHistory, false);
  assert.equal(emptyCoverage.missingDates.length, 14);

  // 2. String dates array with (records, options) signature
  const stringDates = ['2026-09-10', '2026-09-14'];
  const stringCoverage = evaluateMetricCoverage(stringDates, {
    metric: 'mbw',
    domain: 'mbw',
    asOfDate,
    windowDays: 14,
    minDaysRequired: 2,
  });
  assert.equal(stringCoverage.recordedDays, 2);
  assert.equal(stringCoverage.latestDate, '2026-09-14');
  assert.equal(stringCoverage.isFresh, true);
  assert.equal(stringCoverage.hasSufficientHistory, true);

  // 3. String dates array with (records, asOfDate, options) signature
  const legacySigCoverage = evaluateMetricCoverage(stringDates, asOfDate, {
    windowDays: 14,
    minDaysRequired: 2,
  });
  assert.equal(legacySigCoverage.recordedDays, 2);
  assert.equal(legacySigCoverage.latestDate, '2026-09-14');
});

// ============================================================================
// 4. Pure Deterministic Ranking Helpers with Stable Ties
// Acceptance Criterion: "Pure deterministic freshness and risk ranking helpers with stable ties."
// ============================================================================

test('measurement freshness ranking orders by recency with stable ID tie-breakers', () => {
  const items = [
    { id: 'm-2', date: '2026-09-05' },
    { id: 'm-1', date: '2026-09-08' },
    { id: 'm-3b', date: '2026-09-05' },
    { id: 'm-3a', date: '2026-09-05' },
    { id: 'm-nodate', date: null },
  ];

  const ranked = rankMeasurementsByFreshness(
    items,
    (item) => item.date,
    (item) => item.id,
  );

  assert.equal(ranked[0].id, 'm-1'); // 2026-09-08
  assert.equal(ranked[1].id, 'm-2'); // 2026-09-05, 'm-2' < 'm-3a' ? 'm-2'.localeCompare('m-3a') is negative
  assert.equal(ranked[2].id, 'm-3a'); // 2026-09-05, tie-break id
  assert.equal(ranked[3].id, 'm-3b'); // 2026-09-05, tie-break id
  assert.equal(ranked[4].id, 'm-nodate'); // missing date last
});

test('risk finding ranking is pure, deterministic, and resolves ties stably', () => {
  const findings = [
    { id: 'low_do_morning', severity: 'warning', confidence: 0.9, eventDate: '2026-09-09', title: 'Low DO' },
    { id: 'severe_ammonia', severity: 'critical', confidence: 0.85, eventDate: '2026-09-08', title: 'Ammonia Spike' },
    { id: 'ph_swing_high', severity: 'warning', confidence: 0.9, eventDate: '2026-09-10', title: 'pH Swing' },
    { id: 'salinity_shift_b', severity: 'watch', confidence: 0.7, eventDate: '2026-09-07', title: 'Salinity B' },
    { id: 'salinity_shift_a', severity: 'watch', confidence: 0.7, eventDate: '2026-09-07', title: 'Salinity A' },
    { id: 'general_info', severity: 'info', confidence: 0.95, eventDate: '2026-09-10', title: 'Info Notice' },
  ];

  const ranked1 = rankRiskFindings(findings);
  // Shuffled order
  const shuffled = [...findings].reverse();
  const ranked2 = rankRiskFindings(shuffled);

  // Determinism regardless of initial input order
  assert.deepEqual(ranked1, ranked2);

  // 1. Critical comes first
  assert.equal(ranked1[0].id, 'severe_ammonia');

  // 2. Warnings next: both confidence 0.9, ph_swing_high is 2026-09-10 vs 2026-09-09
  assert.equal(ranked1[1].id, 'ph_swing_high');
  assert.equal(ranked1[2].id, 'low_do_morning');

  // 3. Watch findings: same severity, same confidence, same date -> tie-break by ID
  assert.equal(ranked1[3].id, 'salinity_shift_a');
  assert.equal(ranked1[4].id, 'salinity_shift_b');

  // 4. Info finding last
  assert.equal(ranked1[5].id, 'general_info');
});

test('multi-pond risk ranking orders ponds by severity, critical/warning count, and confidence', () => {
  const ponds = [
    {
      pondId: 'p-3',
      pondName: 'Pond 3',
      overallSeverity: 'warning',
      findings: [
        { id: 'f1', severity: 'warning', confidence: 0.8 },
      ],
    },
    {
      pondId: 'p-1',
      pondName: 'Pond 1',
      overallSeverity: 'critical',
      findings: [
        { id: 'f1', severity: 'critical', confidence: 0.9 },
        { id: 'f2', severity: 'critical', confidence: 0.85 },
      ],
    },
    {
      pondId: 'p-2',
      pondName: 'Pond 2',
      overallSeverity: 'critical',
      findings: [
        { id: 'f1', severity: 'critical', confidence: 0.7 },
      ],
    },
    {
      pondId: 'p-4',
      pondName: 'Pond 4',
      overallSeverity: 'watch',
      findings: [],
    },
  ];

  const ranked = rankPondsByRisk(ponds);
  assert.equal(ranked[0].pondId, 'p-1'); // critical with 2 critical findings
  assert.equal(ranked[1].pondId, 'p-2'); // critical with 1 critical finding
  assert.equal(ranked[2].pondId, 'p-3'); // warning
  assert.equal(ranked[3].pondId, 'p-4'); // watch
});

// ============================================================================
// 5. Deterministic Risk Ranking & Historical Ordering
// ============================================================================

test('isFindingHistorical correctly identifies historical risk findings', () => {
  assert.equal(isFindingHistorical({ id: 'low_do', title: 'Low dissolved oxygen', severity: 'critical' }), false);
  assert.equal(isFindingHistorical({ id: 'low_do', title: 'Historical low dissolved oxygen', severity: 'watch' }), true);
  assert.equal(isFindingHistorical({ id: 'low_do_historical', title: 'Low DO', severity: 'watch' }), true);
  assert.equal(isFindingHistorical({ id: 'low_do', title: 'Low DO', severity: 'watch', isHistorical: true }), true);
  assert.equal(isFindingHistorical({ id: 'low_do', title: 'Low DO', severity: 'watch', status: 'historical' }), true);
});

test('compareRiskFindings ranks current findings before historical/watch-only findings regardless of input order', () => {
  const currentWarning = {
    id: 'f-curr',
    title: 'Elevated TAN',
    severity: 'warning',
    confidence: 0.85,
    eventDate: '2026-09-10',
  };
  const historicalWatch = {
    id: 'f-hist',
    title: 'Historical low dissolved oxygen',
    severity: 'watch',
    confidence: 0.95,
    eventDate: '2026-09-08',
    isHistorical: true,
  };

  // Order A
  const rankedA = rankRiskFindings([historicalWatch, currentWarning]);
  assert.equal(rankedA[0].id, 'f-curr', 'current finding must rank before historical finding');
  assert.equal(rankedA[1].id, 'f-hist');

  // Order B
  const rankedB = rankRiskFindings([currentWarning, historicalWatch]);
  assert.equal(rankedB[0].id, 'f-curr', 'ordering must be identical regardless of input order');
  assert.equal(rankedB[1].id, 'f-hist');
});

test('whole-farm risk ranking is independent of input order and historical findings do not elevate severity', () => {
  const pondCurrentCritical = {
    pondId: 'p-crit',
    pondName: 'Pond Critical',
    overallSeverity: 'critical',
    findings: [{ id: 'f-c1', severity: 'critical', confidence: 0.9, isHistorical: false }],
  };
  const pondCurrentWarning = {
    pondId: 'p-warn',
    pondName: 'Pond Warning',
    overallSeverity: 'warning',
    findings: [{ id: 'f-w1', severity: 'warning', confidence: 0.85, isHistorical: false }],
  };
  const pondHistoricalOnly = {
    pondId: 'p-hist',
    pondName: 'Pond Historical',
    overallSeverity: 'info', // Historical-only findings do not raise current whole-farm severity
    findings: [{ id: 'f-h1', title: 'Historical low dissolved oxygen', severity: 'watch', confidence: 0.9, isHistorical: true }],
  };
  const pondNormal = {
    pondId: 'p-norm',
    pondName: 'Pond Normal',
    overallSeverity: 'info',
    findings: [],
  };

  // Permutation 1
  const ranked1 = rankPondsByRisk([pondHistoricalOnly, pondCurrentWarning, pondNormal, pondCurrentCritical]);
  assert.equal(ranked1[0].pondId, 'p-crit');
  assert.equal(ranked1[1].pondId, 'p-warn');
  assert.equal(ranked1[2].pondId, 'p-hist');
  assert.equal(ranked1[3].pondId, 'p-norm');

  // Permutation 2
  const ranked2 = rankPondsByRisk([pondNormal, pondCurrentCritical, pondHistoricalOnly, pondCurrentWarning]);
  assert.equal(ranked2[0].pondId, 'p-crit');
  assert.equal(ranked2[1].pondId, 'p-warn');
  assert.equal(ranked2[2].pondId, 'p-hist');
  assert.equal(ranked2[3].pondId, 'p-norm');
});

test('highestCurrentRiskSeverity ignores historical-only findings', () => {
  const findings = [
    { id: 'f1', title: 'Historical low dissolved oxygen', severity: 'watch', isHistorical: true },
    { id: 'f2', title: 'Historical high TAN', severity: 'watch', isHistorical: true },
  ];
  assert.equal(highestRiskSeverity(findings.map((f) => f.severity)), 'watch');
  assert.equal(highestCurrentRiskSeverity(findings), 'info', 'historical-only findings must not elevate current severity above info');
});
