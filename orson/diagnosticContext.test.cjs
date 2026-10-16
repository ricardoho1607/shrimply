require('../scripts/register-typescript.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrsonAnalysis } = require('./pipeline.ts');
const {
  buildOrsonRequestPrompt,
  estimateOrsonPromptTokens,
  expandReferences,
  ORSON_PROMPT_TOKEN_BUDGET,
  selectCompleteContextSections,
} = require('./promptBuilder.ts');
const { getClaimLimits, findUnsupportedClaims } = require('../functions/shared/orsonAnswerGrounding.js');

const extractJsonSection = (text, heading) => {
  const marker = `${heading}:\n`;
  const startIdx = text.indexOf(marker);
  if (startIdx === -1) return null;
  let pos = startIdx + marker.length;
  while (pos < text.length && /\s/.test(text[pos])) pos++;
  if (pos >= text.length) return null;
  const openChar = text[pos];
  if (openChar !== '{' && openChar !== '[') {
    const nextSection = text.indexOf('\n\n', pos);
    return nextSection === -1 ? text.slice(pos).trim() : text.slice(pos, nextSection).trim();
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  const startJson = pos;
  for (let i = pos; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') {
        depth--;
        if (depth === 0) {
          return text.slice(startJson, i + 1);
        }
      }
    }
  }
  return null;
};
const extractSectionBody = extractJsonSection;

const independentDecode = (payload) => {
  if (payload === null || payload === undefined || typeof payload !== 'object') return payload;

  const decodePond = (pond) => {
    if (!pond || typeof pond !== 'object' || Array.isArray(pond)) return pond;

    const hasRefs = Object.prototype.hasOwnProperty.call(pond, 'refs') && pond.refs && typeof pond.refs === 'object' && !Array.isArray(pond.refs);
    const hasLegacy = Object.prototype.hasOwnProperty.call(pond, 'reference_dictionary') && pond.reference_dictionary && typeof pond.reference_dictionary === 'object' && !Array.isArray(pond.reference_dictionary);
    const isEncoded = hasRefs || hasLegacy;

    const pondScope = {
      refs: hasRefs ? pond.refs : null,
      reference_dictionary: hasLegacy ? pond.reference_dictionary : null,
    };

    const resolveRefString = (refStr, stack = new Set()) => {
      let table = null;
      let refKey = null;
      const refsMatch = refStr.match(/^#\/refs\/(r\d+)$/);
      const legacyMatch = refStr.match(/^#\/reference_dictionary\/([a-zA-Z0-9_-]+)$/);
      if (refsMatch && refsMatch[0] === refStr) {
        table = 'refs';
        refKey = refsMatch[1];
      } else if (legacyMatch && legacyMatch[0] === refStr) {
        table = 'reference_dictionary';
        refKey = legacyMatch[1];
      } else {
        return null;
      }
      if (refKey === '__proto__' || refKey === 'constructor' || refKey === 'prototype' || Object.prototype.hasOwnProperty.call(Object.prototype, refKey)) {
        return null;
      }
      const tableObj = pondScope[table];
      if (!tableObj || !Object.prototype.hasOwnProperty.call(tableObj, refKey)) {
        return null;
      }
      const stackKey = `${table}:${refKey}`;
      if (stack.has(stackKey)) {
        return null;
      }
      const nextStack = new Set(stack);
      nextStack.add(stackKey);
      return deepResolve(tableObj[refKey], nextStack);
    };

    const deepResolve = (item, stack = new Set()) => {
      if (item === null || typeof item !== 'object') return item;
      if (Array.isArray(item)) {
        return item.map((element) => deepResolve(element, stack));
      }
      if (isEncoded && Object.prototype.hasOwnProperty.call(item, '$ref') && Object.keys(item).length === 1 && typeof item.$ref === 'string') {
        const resolved = resolveRefString(item.$ref, stack);
        return resolved !== null ? resolved : item;
      }
      const resolvedObj = {};
      for (const k of Object.keys(item)) {
        const resolvedVal = deepResolve(item[k], stack);
        Object.defineProperty(resolvedObj, k, {
          value: resolvedVal,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      return resolvedObj;
    };

    const result = {};
    for (const key of Object.keys(pond)) {
      if (isEncoded && ((key === 'refs' && hasRefs) || (key === 'reference_dictionary' && hasLegacy))) {
        continue;
      }
      const resolvedField = deepResolve(pond[key]);
      Object.defineProperty(result, key, {
        value: resolvedField,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return result;
  };

  if (Array.isArray(payload)) {
    return payload.map(decodePond);
  }
  return decodePond(payload);
};

test('single-use nested dictionary inlining preserves every own field of repeated parents', () => {
  const parent = JSON.parse('{"__proto__":{"note":"recorded own field"},"child":{"source":"sensor calibration metadata repeated inside a shared parent","notes":"' + 'safe'.repeat(100) + '"}}');
  const original = [{ pond: 'Own fields', observations: Array.from({ length: 30 }, (_, index) => ({ index, parent })) }];
  const raw = 'ORSON RISK PAYLOAD:\n' + JSON.stringify(original);
  const compacted = selectCompleteContextSections(raw, 2000);
  const encoded = JSON.parse(extractJsonSection(compacted, 'ORSON RISK PAYLOAD'));
  assert.ok(encoded[0].refs, 'repeated parent is interned');
  assert.deepEqual(independentDecode(encoded), original, 'whole decoded payload preserves the own __proto__ field after child inlining');
});

test('protected evidence and omission note together always obey the requested budget', () => {
  const protectedSection = 'ORSON RISK PAYLOAD:\n[{"pond":"Boundary","notes":"' + 'x'.repeat(200) + '"}]';
  const context = protectedSection + '\n\nORSON SCOPE:\n' + 'optional'.repeat(400);
  const protectedBudget = estimateOrsonPromptTokens(protectedSection);
  assert.throws(() => selectCompleteContextSections(context, protectedBudget), /Orson context budget exceeded/);
  for (let budget = protectedBudget; budget <= protectedBudget + 50; budget += 1) {
    try {
      const selected = selectCompleteContextSections(context, budget);
      assert.ok(estimateOrsonPromptTokens(selected) <= budget, 'complete returned string fits, including the note and separators');
      assert.deepEqual(JSON.parse(extractJsonSection(selected, 'ORSON RISK PAYLOAD')), [{ pond: 'Boundary', notes: 'x'.repeat(200) }]);
    } catch (error) {
      if (!/Orson context budget exceeded/.test(error.message)) throw error;
    }
  }
});

const independentDeepEqual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!independentDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!independentDeepEqual(a[key], b[key])) return false;
  }
  return true;
};

const independentNormalizeExactAliases = (input) => {
  if (!input) return input;
  const cloned = JSON.parse(JSON.stringify(input));

  const cleanItem = (item) => {
    if (!item || typeof item !== 'object') return;
    if ('sourceId' in item && 'source_id' in item && independentDeepEqual(item.sourceId, item.source_id)) delete item.sourceId;
    if ('ageDays' in item && 'age_days' in item && independentDeepEqual(item.ageDays, item.age_days)) delete item.ageDays;
    if ('isFresh' in item && 'is_fresh' in item && independentDeepEqual(item.isFresh, item.is_fresh)) delete item.isFresh;
    if ('isStale' in item && 'is_stale' in item && independentDeepEqual(item.isStale, item.is_stale)) delete item.isStale;
    if ('measuredAt' in item && 'measured_at' in item && independentDeepEqual(item.measuredAt, item.measured_at)) delete item.measuredAt;
    if (item.coverage && typeof item.coverage === 'object') {
      const cov = item.coverage;
      if ('windowDays' in cov && 'window_days' in cov && independentDeepEqual(cov.windowDays, cov.window_days)) delete cov.windowDays;
      if ('recordedDays' in cov && 'recorded_days' in cov && independentDeepEqual(cov.recordedDays, cov.recorded_days)) delete cov.recordedDays;
      if ('coverageRatio' in cov && 'coverage_ratio' in cov && independentDeepEqual(cov.coverageRatio, cov.coverage_ratio)) delete cov.coverageRatio;
      if ('missingDates' in cov && 'missing_dates' in cov && independentDeepEqual(cov.missingDates, cov.missing_dates)) delete cov.missingDates;
    }
  };

  const deduplicateGrowth = (ge) => {
    if (!ge || typeof ge !== 'object') return;
    const aliases = [
      ['sampleCount', 'sample_count'],
      ['adgSource', 'adg_source'],
      ['weightSource', 'weight_source'],
      ['pondId', 'pond_id'],
      ['cycleId', 'cycle_id'],
      ['latestDate', 'latest_date'],
      ['ageDays', 'age_days'],
      ['isFresh', 'is_fresh'],
      ['isStale', 'is_stale'],
      ['coverageRatio', 'coverage_ratio'],
    ];
    for (const [camel, snake] of aliases) {
      if (camel in ge && snake in ge && independentDeepEqual(ge[camel], ge[snake])) {
        delete ge[camel];
      }
    }
  };

  const deduplicateEvidence = (ev) => {
    if (!ev || typeof ev !== 'object') return;
    if ('dailyFeed' in ev && 'daily_feed' in ev && independentDeepEqual(ev.dailyFeed, ev.daily_feed)) {
      delete ev.dailyFeed;
    }
    cleanItem(ev.water);
    cleanItem(ev.mbw);
    cleanItem(ev.daily_feed);
    cleanItem(ev.dailyFeed);
    cleanItem(ev.mortality);
    cleanItem(ev.lab);
    if (ev.metrics && typeof ev.metrics === 'object') {
      if ('water_quality' in ev.metrics && ev.water && independentDeepEqual(ev.metrics.water_quality, ev.water)) delete ev.metrics.water_quality;
      if ('mbw' in ev.metrics && ev.mbw && independentDeepEqual(ev.metrics.mbw, ev.mbw)) delete ev.metrics.mbw;
      if ('daily_feed' in ev.metrics && ev.daily_feed && independentDeepEqual(ev.metrics.daily_feed, ev.daily_feed)) delete ev.metrics.daily_feed;
      if ('mortality' in ev.metrics && ev.mortality && independentDeepEqual(ev.metrics.mortality, ev.mortality)) delete ev.metrics.mortality;
      if ('lab' in ev.metrics && ev.lab && independentDeepEqual(ev.metrics.lab, ev.lab)) delete ev.metrics.lab;
      for (const k of Object.keys(ev.metrics)) {
        cleanItem(ev.metrics[k]);
      }
    }
  };

  const cleanRecords = (records) => {
    if (!Array.isArray(records)) return;
    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      if (record.measurement_provenance && typeof record.measurement_provenance === 'object') {
        const prov = record.measurement_provenance;
        if ('daily_feed' in prov) {
          if ('feedKg' in prov && independentDeepEqual(prov.feedKg, prov.daily_feed)) delete prov.feedKg;
          if ('actualDailyFeedKg' in prov && independentDeepEqual(prov.actualDailyFeedKg, prov.daily_feed)) delete prov.actualDailyFeedKg;
        }
        for (const metric of Object.keys(prov)) {
          const entry = prov[metric];
          if (entry && typeof entry === 'object') {
            if ('sourceId' in entry && 'sourceIds' in entry) {
              if (Array.isArray(entry.sourceIds) && entry.sourceIds.length === 1 && entry.sourceIds[0] === entry.sourceId) {
                delete entry.sourceId;
              }
            }
            if ('sourceId' in entry && 'source_ids' in entry) {
              if (Array.isArray(entry.source_ids) && entry.source_ids.length === 1 && entry.source_ids[0] === entry.sourceId) {
                delete entry.sourceId;
              }
            }
            if ('sourceId' in entry && 'source_id' in entry && independentDeepEqual(entry.sourceId, entry.source_id)) {
              delete entry.sourceId;
            }
            if ('sourceIds' in entry && 'source_ids' in entry && independentDeepEqual(entry.sourceIds, entry.source_ids)) {
              delete entry.sourceIds;
            }
            if ('measuredAt' in entry && 'measured_at' in entry && independentDeepEqual(entry.measuredAt, entry.measured_at)) {
              delete entry.measuredAt;
            }
          }
        }
      }
    }
  };

  if (Array.isArray(cloned)) {
    for (const pond of cloned) {
      deduplicateGrowth(pond.growth_evidence);
      deduplicateEvidence(pond.evidence);
      cleanRecords(pond.daily_records_14d);
      if (pond.diagnostic_context?.history?.extended_daily) {
        cleanRecords(pond.diagnostic_context.history.extended_daily);
      }
    }
  }
  return cloned;
};

const now = new Date('2026-09-04T02:00:00Z');

const dailyRecord = (date, index, overrides = {}) => ({
  id: `daily-${date}`,
  date,
  mbw: 0,
  mortality: 0,
  feedData: { totalDailyFeed: 40 + index, feedingResponse: 'normal' },
  doMorning: 5.8 - (index * 0.05),
  doEvening: 6.4,
  phMorning: 7.8,
  phEvening: 8.1 + (index * 0.01),
  salinity: 19,
  ...overrides,
});

const pond = (name, samplings) => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  pondName: name,
  cycleId: `${name}-cycle`,
  docStart: '2026-06-01',
  initialPopulation: 100000,
  initialWeight: 0.5,
  pondArea: 1000,
  samplings,
});

const riskPayload = (context) => JSON.parse(extractJsonSection(context, 'ORSON RISK PAYLOAD'));

test('daily history uses the previous 14 farm-calendar days and detailed requests keep the full available window', () => {
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 7, 22 + index));
    return date.toISOString().slice(0, 10);
  });
  const result = buildOrsonAnalysis([
    pond('Calendar Pond', [
      dailyRecord('2026-06-10', -2),
      dailyRecord('2026-08-21', -1),
      ...dates.map((date, index) => dailyRecord(date, index)),
      dailyRecord('2026-09-05', 15),
    ]),
  ], 'Show the water quality history for Calendar Pond', now);

  assert.deepEqual(result.metrics[0].dailyRecords14d.map((record) => record.date), dates);
  const payload = riskPayload(result.promptPackage.context)[0];
  assert.equal(payload.daily_records_14d.length, 14);
  assert.equal(payload.history_coverage.window_start, '2026-08-22');
  assert.equal(payload.history_coverage.window_end, '2026-09-04');
});

test('pond diagnostics carry separate sampling history, dated comparisons, and data quality', () => {
  const result = buildOrsonAnalysis([
    pond('Evidence Pond', [
      { id: 's1', date: '2026-08-01', mbw: 7 },
      { id: 's2', date: '2026-08-12', mbw: 9.5 },
      { id: 's3', date: '2026-08-24', mbw: 12.5 },
      { id: 's4', date: '2026-09-03', mbw: 14.5 },
      dailyRecord('2026-08-29', 1),
      dailyRecord('2026-09-01', 2),
      dailyRecord('2026-09-04', 3),
    ]),
  ], 'Why did growth, feed, DO and pH change in Evidence Pond?', now);

  assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic');
  const payload = riskPayload(result.promptPackage.context)[0];
  assert.equal(payload.diagnostic_context.schema_version, 1);
  assert.equal(payload.diagnostic_context.as_of_date, '2026-09-04');
  assert.deepEqual(
    payload.diagnostic_context.history.sampling.map((sample) => sample.farm_date),
    ['2026-08-01', '2026-08-12', '2026-08-24', '2026-09-03'],
  );
  assert.equal(payload.diagnostic_context.comparisons.adg_intervals.length, 3);
  assert.equal(payload.diagnostic_context.comparisons.morning_do.current.farm_date, '2026-09-04');
  assert.equal(payload.diagnostic_context.latest_growth_interval.start_date, '2026-08-24');
  assert.equal(payload.diagnostic_context.latest_growth_interval.end_date, '2026-09-03');
  assert.equal(payload.diagnostic_context.latest_growth_interval.actual_daily_feed_kg.recorded_days, 2);
  assert.ok(payload.diagnostic_context.signals.some((signal) => signal.type === 'ADG_DROP'));
  assert.ok(payload.diagnostic_context.signals.every((signal) => signal.interpretation === 'descriptive_change_only'));
  assert.ok(Array.isArray(payload.diagnostic_context.data_quality.missing));
});

test('focused diagnostics do not select knowledge from a different pond', () => {
  const target = pond('Target Pond', [
    { id: 'target-1', date: '2026-08-20', mbw: 8 },
    { id: 'target-2', date: '2026-09-03', mbw: 12 },
    dailyRecord('2026-09-04', 1, { doMorning: 6.2, doEvening: 6.8 }),
  ]);
  const unrelated = pond('Unrelated Pond', [
    { id: 'other-1', date: '2026-08-20', mbw: 8 },
    { id: 'other-2', date: '2026-09-03', mbw: 8.2 },
    dailyRecord('2026-09-04', 1, { doMorning: 3.2, doEvening: 3.8 }),
  ]);
  const result = buildOrsonAnalysis(
    [target, unrelated],
    'Why did growth change in Target Pond?',
    now,
  );

  const knowledgeText = result.promptPackage.context
    .split('ORSON SELECTED KNOWLEDGE:\n')[1]
    .split('\n\nORSON RISK PAYLOAD:')[0];
  assert.doesNotMatch(knowledgeText, /Low DO \+ high temperature|Low DO \+ high TAN/i);
});

test('future lab reports and treatments outside the active cycle stay out of diagnostic evidence', () => {
  const source = pond('Scope Pond', [{ id: 's1', date: '2026-09-03', mbw: 12 }]);
  source.latestLabStatus = {
    labReportId: 'future-lab', sampleDate: '2026-09-05', cycleId: 'Scope Pond-cycle', status: 'critical',
    mainIssue: 'FUTURE_LAB_SENTINEL',
    byType: { water: { labReportId: 'valid-lab', sampleDate: '2026-09-02', reportType: 'water_quality', status: 'good' } },
  };
  source.treatments = [
    { id: 'past-cycle', date: '2026-05-31', additiveName: 'OLD_CYCLE_SENTINEL' },
    { id: 'wrong-cycle', date: '2026-09-02', cycleId: 'old-cycle', additiveName: 'WRONG_CYCLE_SENTINEL' },
    { id: 'future', date: '2026-09-05', additiveName: 'FUTURE_TREATMENT_SENTINEL' },
    { id: 'valid', date: '2026-09-02', additiveName: 'Recorded treatment' },
  ];
  const result = buildOrsonAnalysis([source], 'Why did growth change in Scope Pond?', now);
  assert.deepEqual(result.metrics[0].recentLabReports.map(report => report.labReportId), ['valid-lab']);
  assert.doesNotMatch(result.promptPackage.context, /FUTURE_LAB_SENTINEL|OLD_CYCLE_SENTINEL|WRONG_CYCLE_SENTINEL|FUTURE_TREATMENT_SENTINEL/);
  assert.match(result.promptPackage.context, /Recorded treatment/);
});

test('prompt budgeting always preserves the complete current question', () => {
  const question = 'PLAN_QUESTION_MUST_SURVIVE';
  const request = buildOrsonRequestPrompt('X'.repeat(100000), question);

  assert.match(request, new RegExp(`USER QUESTION:\\n${question}$`));
  assert.ok(!request.includes('[Older or lower-priority context trimmed') || request.includes('[Lower-priority Orson context omitted'));
});

test('diagnostic evidence separates actual feed, sampling estimates, mortality observations, harvests, and lab units', () => {
  const source = pond('Source Pond', [
    { id: 'old-cycle', cycleId: 'old-cycle', date: '2026-08-28', mbw: 99 },
    { id: 'sample', cycleId: 'Source Pond-cycle', date: '2026-09-04', mbw: 12, mortality: 0, feed: 18 },
    { id: 'water', cycleId: 'Source Pond-cycle', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, doMorning: 5.2 },
    { id: 'feed', cycleId: 'Source Pond-cycle', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, feedData: { totalDailyFeed: 75 } },
    { id: 'mortality', cycleId: 'Source Pond-cycle', date: '2026-09-04', mortalityObservationType: 'observed_recovered', mortality: 3 },
    { id: 'harvest', cycleId: 'Source Pond-cycle', date: '2026-09-03', harvestData: { harvestType: 'partial', biomass: 100, size: 80 } },
  ]);
  source.latestLabStatus = {
    id: 'lab-1',
    reportType: 'water_quality',
    sampleDate: '2026-09-02',
    status: 'watch',
    metrics: {
      schemaVersion: 2,
      measurementSchemaVersion: 1,
      measurementUnits: { nitriteMgL: { unit: 'mg/L', basis: 'NO2' } },
      waterQuality: { date: '2026-09-02', nitriteMgL: 0.4 },
    },
  };

  const result = buildOrsonAnalysis([source], 'Why did feed and water change in Source Pond?', now);
  const payload = riskPayload(result.promptPackage.context)[0];
  const day = payload.daily_records_14d.find((record) => record.date === '2026-09-04');

  assert.equal(day.feed_kg, 75);
  assert.equal(day.actual_daily_feed_kg, 75);
  assert.equal(day.sampling_feed_estimate_kg, 18);
  assert.equal(day.mortality, undefined);
  assert.equal(day.mortality_observed_recovered, 3);
  assert.deepEqual(payload.diagnostic_context.history.sampling.map((sample) => sample.mbw_g), [12]);
  assert.deepEqual(payload.recent_harvests[0], {
    source_id: 'harvest', farm_date: '2026-09-03', harvest_type: 'partial', biomass_kg: 100, population: 8000,
  });
  assert.deepEqual(payload.recent_lab_reports[0].metrics.measurementUnits.nitriteMgL, { unit: 'mg/L', basis: 'NO2' });
});

test('measurements typed without a pond stay user-reported and do not absorb unrelated farm records', () => {
  const result = buildOrsonAnalysis([
    pond('Farm A', [dailyRecord('2026-09-04', 1, { doMorning: 3.1 })]),
    pond('Farm B', [dailyRecord('2026-09-04', 1, { doMorning: 6.1 })]),
  ], 'DOC 67, ADG is 0.22 and dawn DO is 4.0. What is happening?', now);

  assert.equal(result.promptPackage.questionFocus.containsUserReportedMeasurements, true);
  assert.match(result.promptPackage.context, /"user_question_measurements": "user_reported_unverified"/);
  assert.doesNotMatch(result.promptPackage.context, /ORSON RISK PAYLOAD|Farm A|Farm B/);
});

test('diagnostic follow-ups keep the previously named pond', () => {
  const result = buildOrsonAnalysis(
    [pond('Follow Pond', [dailyRecord('2026-09-04', 1)]), pond('Other Pond', [dailyRecord('2026-09-04', 1)])],
    'Why is that?',
    now,
    undefined,
    undefined,
    undefined,
    [{ role: 'user', text: 'Analyze Follow Pond' }, { role: 'model', text: 'The latest pond status is available.' }],
  );

  assert.equal(result.promptPackage.questionFocus.focusedPondName, 'Follow Pond');
  assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic');
  assert.deepEqual(riskPayload(result.promptPackage.context).map((item) => item.pond), ['Follow Pond']);
});

test('short diagnostic phrases select diagnostic reasoning', () => {
  for (const question of ['Low ADG in Test Pond', 'High FCR in Test Pond', 'Unstable water in Test Pond', 'Growth slowed in Test Pond', 'Pond analysis for Test Pond']) {
    const result = buildOrsonAnalysis([pond('Test Pond', [])], question, now);
    assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic', question);
  }
});

test('diagnostics preserve optional chemistry, sampling and feeding evidence with sources', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    { id: 's1', date: '2026-08-24', mbw: 10, estimatedPopulation: 90000, samplingMethod: 'cast net', survivalRate: 90 },
    { id: 'w1', date: '2026-08-25', alkalinity: 130, tanMgL: 0.4, nitriteMgL: 0.2 },
    { id: 'w2', date: '2026-09-03', alkalinity: 92, tanMgL: 0.8, nitriteMgL: 0.3, temperatureMorning: 28, temperatureEvening: 31 },
    { id: 'f1', date: '2026-09-03', feedData: { totalDailyFeed: 60, feedType: 'pellet', feedingFrequency: 4, feedingResponse: 'weak' } },
    { id: 's2', date: '2026-09-03', mbw: 12, estimatedPopulation: 89000, samplingMethod: 'cast net', survivalRate: 89 },
  ])], 'Why did growth slow in Test Pond?', now);
  const context = result.metrics[0].diagnosticContext;
  assert.equal(context.comparisons.alkalinity.absoluteChange, -38);
  assert.equal(context.history.sampling[0].estimatedBiomassKg, 900);
  assert.equal(context.history.sampling[0].samplingMethod, 'cast net');
  assert.equal(context.history.observations.find(r => r.sourceId === 'w2').tanMgL, 0.8);
  assert.equal(context.history.observations.find(r => r.sourceId === 'w2').ammoniaMgL, undefined);
  assert.equal(context.history.observations.find(r => r.sourceId === 'f1').feedingFrequency, 4);
  assert.match(result.promptPackage.context, /"alkalinity".*"absolute_change":-38/);
  assert.match(result.promptPackage.context, /"sampling_method":"cast net"/);
});

test('explicit multi-week requests keep a bounded extended daily history', () => {
  const records = Array.from({ length: 40 }, (_, i) => dailyRecord(new Date(Date.UTC(2026, 6, 27 + i)).toISOString().slice(0, 10), i));
  const result = buildOrsonAnalysis([pond('Test Pond', records)], 'Analyze the last 30 days in Test Pond', now);
  const diagnostic = riskPayload(result.promptPackage.context)[0].diagnostic_context;
  assert.equal(diagnostic.history.extended_daily.length, 30);
  assert.equal(diagnostic.history.extended_daily[0].date, '2026-08-06');
  assert.equal(diagnostic.history.extended_daily.at(-1).date, '2026-09-04');
  assert.equal(result.metrics[0].dailyRecords14d.length, 14);
});

test('user-reported changes are calculated without inventing a baseline', () => {
  const result = buildOrsonAnalysis([], 'ADG fell from 0.31 to 0.22. Dawn DO fell from 5.1 to 4.0. pH swing increased from 0.3 to 0.7. Alkalinity dropped to 92 mg/L. What is happening?', now);
  assert.equal(result.promptPackage.questionFocus.analysisMode, 'pond_diagnostic');
  assert.match(result.promptPackage.context, /"percent_change":-29/);
  assert.match(result.promptPackage.context, /"percent_change":-21.6/);
  assert.match(result.promptPackage.context, /"percent_change":133.3/);
  assert.doesNotMatch(result.promptPackage.context, /"metric":"alkalinity"/);
});

test('FCR comparisons reject unmatched calculation bases and biomass remains unavailable without historical estimates', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    { id: 's1', date: '2026-08-24', mbw: 10, fcr: 1.2, fcrBasis: 'cumulative' },
    { id: 's2', date: '2026-09-03', mbw: 12, fcr: 2, fcrBasis: 'weekly' },
  ])], 'Why is FCR increasing in Test Pond?', now);
  assert.equal(result.metrics[0].diagnosticContext.comparisons.recordedFcr, null);
  assert.equal(result.metrics[0].diagnosticContext.comparisons.estimatedBiomass, null);
});

test('recorded biomass history remains comparable without a same-day MBW sample', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    { id: 'b1', date: '2026-08-22', estimatedBiomassKg: 1200 },
    { id: 's1', date: '2026-08-24', mbw: 11.1 },
    { id: 's2', date: '2026-09-03', mbw: 13.3 },
    { id: 'b2', date: '2026-09-04', estimatedBiomassKg: 1200 },
    { id: 'future', date: '2026-09-05', estimatedBiomassKg: 9000 },
  ])], 'Why is FCR increasing in Test Pond?', now);
  const comparison = result.metrics[0].diagnosticContext.comparisons.estimatedBiomass;
  assert.ok(comparison, 'dated recorded biomass must not disappear because MBW is absent');
  assert.equal(comparison.previous.value, 1200);
  assert.equal(comparison.current.value, 1200);
  assert.equal(comparison.absoluteChange, 0);
  assert.deepEqual(comparison.current.sourceIds, ['b2']);
  assert.equal(riskPayload(result.promptPackage.context)[0].diagnostic_context.comparisons.estimated_biomass.absolute_change, 0);
});

test('feed index uses dated actual feeding and never turns missing feed into zero', () => {
  const source = pond('Test Pond', [dailyRecord('2026-09-04', 1)]);
  const current = buildOrsonAnalysis([source], 'Why did feed index change in Test Pond?', now);
  const index = current.metrics[0].diagnosticContext.feedIndex;
  assert.equal(index.value, Math.round(41 * 100000 / (index.doc * current.metrics[0].estimatedCurrentPopulation) * 1000) / 1000);
  assert.equal(riskPayload(current.promptPackage.context)[0].calculation_context.feed_index.farmDate, '2026-09-04');
  const missing = buildOrsonAnalysis([pond('Test Pond', [dailyRecord('2026-09-03', 1)])], 'Why did feed index change in Test Pond?', now);
  assert.equal(missing.metrics[0].diagnosticContext.feedIndex, null);
});

test('knowledge responds to measured trends when the question does not name the parameters', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [
    dailyRecord('2026-08-29', 1, { doMorning: 5.8, phMorning: 7.8, phEvening: 8 }),
    dailyRecord('2026-09-03', 2, { doMorning: 4.2, phMorning: 7.5, phEvening: 8.4 }),
  ])], 'What is happening in Test Pond?', now);
  const knowledge = JSON.parse(result.promptPackage.context.split('ORSON SELECTED KNOWLEDGE:\n')[1].split('\n\nORSON RISK PAYLOAD:')[0]);
  const ids = knowledge.parameter_guidance.map(k => k.id);
  for (const id of ['dissolved_oxygen', 'ph', 'alkalinity', 'plankton_transparency']) assert.ok(ids.includes(id), id);
});

test('unknown nitrite basis removes threshold guidance and adds an explicit data conflict', () => {
  const result = buildOrsonAnalysis([pond('Test Pond', [{ id: 'n1', date: '2026-09-03', nitriteMgL: 0.85 }])], 'Why is nitrite rising in Test Pond?', now);
  const knowledge = JSON.parse(result.promptPackage.context.split('ORSON SELECTED KNOWLEDGE:\n')[1].split('\n\nORSON RISK PAYLOAD:')[0]);
  const nitrite = knowledge.parameter_guidance.find(item => item.id === 'nitrite');
  assert.equal(nitrite.target, undefined);
  assert.equal(nitrite.warning, undefined);
  assert.equal(nitrite.critical, undefined);
  assert.match(result.metrics[0].diagnosticContext.dataQuality.conflicts.join(' '), /nitrite has an unverified/);
});

test('all handover knowledge topics are selectable and have attributable guidance', () => {
  for (const topic of ['temperature', 'FCR', 'feed index', 'biomass', 'carrying capacity', 'mortality', 'disease', 'N:P']) {
    const result = buildOrsonAnalysis([], `Explain ${topic} in shrimp farming in general`, now);
    assert.match(result.promptPackage.context, /"parameter_guidance":\[\{/);
    assert.match(result.promptPackage.context, /"source_ids":\["/);
  }
});

test('context recovery: reproduces fixture 01 context loss fix: retains risk payload and selected knowledge within token budget', () => {
  const scenarios = require('./fixtures/diagnosticEvaluation.cjs');
  const scenario01 = scenarios.find((s) => s.id === '01');
  assert.ok(scenario01, 'fixture 01 exists');

  const result = buildOrsonAnalysis(scenario01.ponds, scenario01.question, new Date(scenario01.asOf));
  const pack = result.promptPackage;

  // Verify that the initial uncompacted context reproduced the oversized condition (>50,000 chars)
  assert.ok(pack.context.length > 50000, `context length ${pack.context.length} reproduced oversized context`);
  assert.ok(pack.context.includes('ORSON RISK PAYLOAD:'), 'context includes risk payload before budgeting');

  const request = buildOrsonRequestPrompt(pack.context, pack.userMessage);
  const tokenCount = estimateOrsonPromptTokens(request);

  // Must retain risk evidence and relevant knowledge under 16000 weighted tokens
  assert.ok(tokenCount <= ORSON_PROMPT_TOKEN_BUDGET, `prompt fits within ${ORSON_PROMPT_TOKEN_BUDGET} tokens (got ${tokenCount})`);
  assert.ok(request.includes('ORSON RISK PAYLOAD:'), 'retains ORSON RISK PAYLOAD section');
  assert.ok(request.includes('ORSON SELECTED KNOWLEDGE:'), 'retains ORSON SELECTED KNOWLEDGE section');
  assert.ok(request.includes('ORSON QUESTION FOCUS:'), 'retains ORSON QUESTION FOCUS section');
  assert.ok(request.includes(pack.userMessage), 'retains the full user question');

  // Parse structured sections cleanly with extractJsonSection
  const origRiskBody = extractJsonSection(pack.context, 'ORSON RISK PAYLOAD');
  assert.ok(origRiskBody, 'unbudgeted context has original risk payload');
  const originalRisk = JSON.parse(origRiskBody);

  const riskPayloadBody = extractJsonSection(request, 'ORSON RISK PAYLOAD');
  assert.ok(riskPayloadBody, 'risk payload section extracted cleanly without omission note');
  const rawPayloads = JSON.parse(riskPayloadBody);
  assert.equal(rawPayloads.length, 1, 'contains exactly one pond payload');

  // Recursively expand explicit references using independent test decoder
  const decoded = independentDecode(rawPayloads);
  const normalizedOriginal = independentNormalizeExactAliases(originalRisk);

  // Assert WHOLE independently expanded final risk JSON deepEqual to entire ORIGINAL prebudget risk JSON after independent normalization
  assert.deepEqual(decoded, normalizedOriginal, 'fixture 01 risk payload is 100% semantically equal to normalized original');

  const pond = decoded[0];

  assert.equal(pond.pond, 'Test Pond');
  assert.equal(pond.species, 'Litopenaeus vannamei');
  assert.equal(pond.pond_area_m2, 1000);
  assert.equal(pond.initial_population, 100000);

  // Preserve full requested dates and records (14 days)
  assert.equal(pond.daily_records_14d.length, 14, 'retains all 14 requested daily records');
  assert.equal(pond.daily_records_14d[0].date, '2026-08-22');
  assert.equal(pond.daily_records_14d[13].date, '2026-09-04');

  // Morning DO vs dawn distinction (never rename morning to dawn)
  assert.ok(typeof pond.daily_records_14d[0].do_morning === 'number', 'preserves morning DO as do_morning');
  assert.equal(pond.daily_records_14d[0].do_dawn, undefined, 'does not rename morning DO to dawn');

  // Recorded feed vs sampling estimate distinction
  assert.equal(pond.daily_records_14d[0].feed_source, 'daily_feed', 'preserves authoritative feed source');
  assert.equal(pond.daily_records_14d[0].feed_kg, 50, 'preserves initial feed allocation');
  assert.equal(pond.daily_records_14d[13].feed_kg, 63, 'preserves final feed allocation');

  // Deduplication: exact equivalent duplicate aliases removed, authoritative snake keys preserved
  assert.ok(pond.evidence, 'evidence summary exists');
  assert.equal(pond.evidence.dailyFeed, undefined, 'removes exact duplicate dailyFeed camel alias');
  assert.ok(pond.evidence.daily_feed, 'preserves authoritative daily_feed evidence item');
  assert.equal(pond.growth_evidence.sampleCount, undefined, 'removes duplicate sampleCount camel alias');
  assert.equal(pond.growth_evidence.sample_count, 3, 'preserves canonical sample_count snake key');
  assert.equal(pond.growth_evidence.adg_source, 'measured', 'preserves adg_source');

  // Parse knowledge section and verify guidance
  const knowledgeBody = extractSectionBody(request, 'ORSON SELECTED KNOWLEDGE');
  assert.ok(knowledgeBody, 'selected knowledge section extracted cleanly');
  const knowledge = JSON.parse(knowledgeBody);
  assert.ok(Array.isArray(knowledge.parameter_guidance), 'parameter_guidance is an array');
  assert.ok(knowledge.parameter_guidance.length > 0, 'retains relevant parameter guidance');
});

const runScenarioEvaluation = (scenario) => {
  const history = scenario.conversationHistory || [
    { role: 'user', text: 'Halo Orson, saya ingin konsultasi kondisi tambak.' },
    { role: 'model', text: 'Halo! Saya siap menganalisis data kualitas air dan pakan kolam Anda.' },
  ];
  const result = buildOrsonAnalysis(scenario.ponds, scenario.question, new Date(scenario.asOf), null, null, undefined, history);
  const pack = result.promptPackage;
  assert.notEqual(pack.questionFocus.analysisMode, 'standard', `Scenario ${scenario.id} enters diagnostic mode`);

  if (scenario.id === '19') {
    let threw = false;
    try {
      buildOrsonRequestPrompt(pack.context, pack.userMessage);
    } catch (err) {
      threw = true;
      assert.ok(err instanceof Error);
      assert.match(
        err.message,
        /Orson context budget exceeded: protected structured evidence cannot fit within token budget\./,
        'Scenario 19 fails explicitly before provider',
      );
    }
    assert.ok(threw, 'Scenario 19 threw explicit budget exceeded error');

    // Verify unbudgeted context has the full 30 days intact
    const origRiskBody = extractJsonSection(pack.context, 'ORSON RISK PAYLOAD');
    assert.ok(origRiskBody, 'Scenario 19 has original risk payload');
    const origRisk = JSON.parse(origRiskBody);
    assert.ok(origRisk[0].diagnostic_context?.history?.extended_daily, 'Scenario 19 has extended_daily in original context');
    assert.equal(origRisk[0].diagnostic_context.history.extended_daily.length, 30, 'Scenario 19 retains full 30 days of records in context');
    return { id: '19', status: 'guarded_overflow', days: 30 };
  }

  const request = buildOrsonRequestPrompt(pack.context, pack.userMessage);
  const tokens = estimateOrsonPromptTokens(request);

  assert.ok(tokens <= ORSON_PROMPT_TOKEN_BUDGET, `Scenario ${scenario.id} (${scenario.title}) fits budget: ${tokens} <= ${ORSON_PROMPT_TOKEN_BUDGET}`);
  assert.ok(request.includes(pack.userMessage), `Scenario ${scenario.id} retains full question`);

  // Parse question focus cleanly & compare to original
  assert.match(request, /ORSON QUESTION FOCUS:/, `Scenario ${scenario.id} retains question focus`);
  const focusBody = extractJsonSection(request, 'ORSON QUESTION FOCUS');
  assert.ok(focusBody, `Scenario ${scenario.id} has question focus body`);
  const parsedFocus = JSON.parse(focusBody);
  assert.ok(parsedFocus.route, `Scenario ${scenario.id} has focus route`);
  const origFocus = JSON.parse(extractJsonSection(pack.context, 'ORSON QUESTION FOCUS'));
  assert.deepEqual(parsedFocus, origFocus, `Scenario ${scenario.id} whole question focus matches original`);

  // Parse selected knowledge cleanly & compare to original
  assert.match(request, /ORSON SELECTED KNOWLEDGE:/, `Scenario ${scenario.id} retains selected knowledge`);
  const knowledgeBody = extractJsonSection(request, 'ORSON SELECTED KNOWLEDGE');
  assert.ok(knowledgeBody, `Scenario ${scenario.id} has selected knowledge body`);
  const parsedKnowledge = JSON.parse(knowledgeBody);
  assert.ok(Array.isArray(parsedKnowledge.parameter_guidance), `Scenario ${scenario.id} has parameter guidance`);
  const origKnowledge = JSON.parse(extractJsonSection(pack.context, 'ORSON SELECTED KNOWLEDGE'));
  assert.deepEqual(parsedKnowledge, origKnowledge, `Scenario ${scenario.id} whole selected knowledge matches original`);

  // Parse conversation section & compare to original
  const convoBody = extractJsonSection(request, 'ORSON RECENT CONVERSATION');
  assert.ok(convoBody, `Scenario ${scenario.id} retains conversation section`);
  const origConvoBody = extractJsonSection(pack.context, 'ORSON RECENT CONVERSATION');
  assert.deepEqual(JSON.parse(convoBody), JSON.parse(origConvoBody), `Scenario ${scenario.id} whole conversation matches original`);

  // Compare user comparisons if present in original
  const origUrcBody = extractSectionBody(pack.context, 'ORSON USER-REPORTED COMPARISONS');
  if (origUrcBody) {
    const reqUrcBody = extractSectionBody(request, 'ORSON USER-REPORTED COMPARISONS');
    assert.ok(reqUrcBody, `Scenario ${scenario.id} retains user-reported comparisons`);
    const parsedUrc = JSON.parse(reqUrcBody);
    assert.deepEqual(parsedUrc, JSON.parse(origUrcBody), `Scenario ${scenario.id} whole user-reported comparisons matches original`);
    if (scenario.id === '20') {
      assert.ok(parsedUrc.some((item) => item.metric === 'adg' && (item.percent_change === -29 || item.percent_change === -29.0)), 'scenario 20 calculates -29.0% adg change');
      assert.ok(parsedUrc.some((item) => item.metric === 'dawn_do' && item.percent_change === -21.6), 'scenario 20 calculates -21.6% dawn DO change');
    }
  }

  // Grounding contracts & issues across EVERY fitting fixture
  const rawLimits = getClaimLimits(`${pack.context}\n\nUSER QUESTION:\n${pack.userMessage}`);
  const budgetedLimits = getClaimLimits(request);
  assert.deepEqual(budgetedLimits.contract, rawLimits.contract, `Scenario ${scenario.id} grounding contract matches raw`);
  const testDraft = 'LIKELY CAUSES\n1. Growing biomass increased feed demand.\n2. Sampling error caused the drop.\n3. Disease caused deaths.';
  assert.deepEqual(findUnsupportedClaims(testDraft, budgetedLimits), findUnsupportedClaims(testDraft, rawLimits), `Scenario ${scenario.id} grounding issues match raw`);

  if (scenario.ponds.length > 0) {
    assert.match(request, /ORSON RISK PAYLOAD:/, `Scenario ${scenario.id} retains risk payload`);
    const payloadBody = extractJsonSection(request, 'ORSON RISK PAYLOAD');
    assert.ok(payloadBody, `Scenario ${scenario.id} has risk payload body`);
    const rawPayloads = JSON.parse(payloadBody);
    assert.ok(Array.isArray(rawPayloads) && rawPayloads.length >= 1, `Scenario ${scenario.id} has parsed pond payloads`);

    // Independent decode
    const decoded = independentDecode(rawPayloads);
    const p = decoded[0];
    const origPond = scenario.ponds[0];
    assert.equal(p.pond, origPond.pondName, `Scenario ${scenario.id} preserves pond name`);

    // Compare whole decoded risk JSON deepEqual to entire original pre-budget risk JSON after independent normalization
    const origRiskBody = extractJsonSection(pack.context, 'ORSON RISK PAYLOAD');
    assert.ok(origRiskBody, `Scenario ${scenario.id} has original risk payload`);
    const originalRisk = JSON.parse(origRiskBody);
    const normalizedOriginal = independentNormalizeExactAliases(originalRisk);

    assert.deepEqual(decoded, normalizedOriginal, `Scenario ${scenario.id} decoded risk is deepEqual to normalized original risk`);

    // Scenario-specific semantic normalization checks
    if (scenario.id === '01') {
      assert.ok(typeof p.daily_records_14d[0].do_morning === 'number', 'preserves morning DO as do_morning');
      assert.equal(p.daily_records_14d[0].do_dawn, undefined, 'does not rename morning DO to dawn');
      assert.equal(p.daily_records_14d[0].feed_source, 'daily_feed');
      assert.equal(p.daily_records_14d[0].feed_kg, 50);
      assert.equal(p.daily_records_14d[13].feed_kg, 63);
    } else if (scenario.id === '03') {
      assert.equal(p.biomass_kg, 1091.37, 'scenario 03 preserves calculated estimate biomass_kg 1091.37');
      const eb = p.diagnostic_context?.comparisons?.estimated_biomass;
      assert.ok(eb, 'scenario 03 has estimated_biomass comparison');
      assert.equal(eb.previous.value, 1200, 'scenario 03 previous value 1200');
      assert.equal(eb.current.value, 1200, 'scenario 03 current value 1200');
      assert.equal(eb.unit, 'kg', 'scenario 03 unit is kg');
      assert.equal(eb.absolute_change, 0, 'scenario 03 absolute change is 0');
      assert.ok(eb.previous.farm_date, 'scenario 03 previous farm_date');
      assert.ok(eb.current.farm_date, 'scenario 03 current farm_date');
      assert.match(eb.method, /matching calculation basis/i, 'scenario 03 basis method');
      assert.ok(p.calculation_context?.fcr, 'scenario 03 preserves FCR calculation context');
    } else if (scenario.id === '06') {
      const deathRecord = p.daily_records_14d.find((r) => r.date === '2026-09-04');
      assert.ok(deathRecord, 'scenario 06 contains 2026-09-04 daily record');
      assert.equal(deathRecord.mortality_observed_recovered, 40, 'scenario 06 preserves observed recovered deaths');
      assert.deepEqual(deathRecord.mortality_observation_types, ['observed_recovered'], 'scenario 06 preserves observation types');
    } else if (scenario.id === '07') {
      const weakRecord = p.daily_records_14d.find((r) => r.date === '2026-09-04');
      assert.ok(weakRecord, 'scenario 07 contains 2026-09-04 daily record');
      assert.equal(weakRecord.feeding_response, 'weak', 'scenario 07 preserves weak feeding response');
    } else if (scenario.id === '14') {
      const observations = p.diagnostic_context?.history?.observations;
      assert.ok(Array.isArray(observations) && observations.length > 0, 'scenario 14 contains observations in diagnostic_context');
      const nitriteObs = observations.find((o) => typeof o.nitriteMgL === 'number' || typeof o.nitrite_mg_l === 'number' || o.parameter === 'nitrite');
      assert.ok(nitriteObs, 'scenario 14 preserves nitrite observation in history');
    }
  }

  return { id: scenario.id, status: 'lossless_fit' };
};

test('context recovery: all 20 scenario contexts parse sections and retain semantically normalized evidence and uncertainty under budget', () => {
  const scenarios = require('./fixtures/diagnosticEvaluation.cjs');
  assert.equal(scenarios.length, 20, 'has all 20 diagnostic evaluation scenarios');

  const outcomes = [];
  for (const scenario of scenarios) {
    try {
      const outcome = runScenarioEvaluation(scenario);
      outcomes.push(outcome);
    } catch (err) {
      outcomes.push({ id: scenario.id, status: 'error', error: err });
    }
  }

  const errors = outcomes.filter((o) => o.status === 'error');
  assert.equal(errors.length, 0, `Scenarios failed: ${errors.map((e) => `${e.id}: ${e.error.message}`).join(', ')}`);
  assert.equal(outcomes.filter((o) => o.status === 'lossless_fit').length, 19, '19 lossless fits');
  assert.equal(outcomes.filter((o) => o.status === 'guarded_overflow').length, 1, '1 explicit guarded overflow (scenario 19)');
});

const scenarios = require('./fixtures/diagnosticEvaluation.cjs');
for (const scenario of scenarios) {
  test(`context recovery: fixture ${scenario.id} - ${scenario.title}`, () => {
    const outcome = runScenarioEvaluation(scenario);
    if (scenario.id === '19') {
      assert.equal(outcome.status, 'guarded_overflow');
      assert.equal(outcome.days, 30);
    } else {
      assert.equal(outcome.status, 'lossless_fit');
    }
  });
}

test('context recovery: exact records, explicit zero, missing values, conflicts, Unicode, invalid JSON, and deterministic fits', () => {
  // 1. Deterministic complete fits: fitting prompt context remains bytewise unchanged
  const fittingContext = [
    'ORSON QUESTION FOCUS:\n{"route":"farm_analysis","intent":"diagnostic"}',
    'ORSON SELECTED KNOWLEDGE:\n{"parameter_guidance":[]}',
    'ORSON RISK PAYLOAD:\n[{"pond":"Small Pond","biomass_kg":500}]',
  ].join('\n\n');
  assert.equal(
    selectCompleteContextSections(fittingContext, 16000),
    fittingContext,
    'fitting context remains bytewise unchanged',
  );

  // 2. Unicode weighting: characters with code point > 127 count as 2 weighted chars
  assert.equal(estimateOrsonPromptTokens('abc'), 1, '3 ASCII chars = ceil(3/3) = 1 token');
  assert.equal(estimateOrsonPromptTokens('üñî'), 2, '3 non-ASCII chars = ceil(6/3) = 2 tokens');
  const unicodeContext = [
    'ORSON QUESTION FOCUS:\n{"route":"farm_analysis","pond_alias":"Kolam Induk — Udang Vaname \u00e9\u00e8\u00e0 \u00f1 🦐"}',
    'ORSON SELECTED KNOWLEDGE:\n{"parameter_guidance":[]}',
    'ORSON RISK PAYLOAD:\n[{"pond":"Kolam 1","notes":"Kondisi air jernih dan stabil"}]',
  ].join('\n\n');
  const unicodeFit = selectCompleteContextSections(unicodeContext, 16000);
  assert.equal(unicodeFit, unicodeContext, 'Unicode context preserved without corruption');

  // 3. Invalid JSON handling: oversized sections with malformed JSON do not crash
  const malformedContext = [
    'ORSON QUESTION FOCUS:\n{"route":"farm_analysis"}',
    `ORSON RISK PAYLOAD:\n[{ pond: 'unquoted_keys', ${'data:'.repeat(100)}`,
  ].join('\n\n');
  let malformedError = null;
  try {
    selectCompleteContextSections(malformedContext, 50);
  } catch (err) {
    malformedError = err;
  }
  // Throws explicit budget exceeded error rather than SyntaxError crash
  assert.ok(malformedError instanceof Error, 'throws controlled error for oversized invalid JSON protected payload');
  assert.match(malformedError.message, /Orson context budget exceeded/, 'identifies budget exceeded');

  // 4. Irreducible protected evidence overflow throws explicit error
  let overflowError = null;
  try {
    const hugePayload = Array.from({ length: 50 }, (_, i) => ({
      pond: `Pond-${i}`,
      data: 'x'.repeat(2000),
    }));
    selectCompleteContextSections(`ORSON RISK PAYLOAD:\n${JSON.stringify(hugePayload)}`, 500);
  } catch (err) {
    overflowError = err;
  }
  assert.ok(overflowError instanceof Error, 'irreducible overflow throws explicit error');
  assert.match(
    overflowError.message,
    /Orson context budget exceeded: protected structured evidence cannot fit within token budget\./,
    'explicit error message before provider',
  );

  // 5. Expand references handles arbitrary interned structures correctly
  const dict = {
    ref_src: ['src-1', 'src-2'],
    ref_obj: { date: '2026-09-04', source: { $ref: '#/reference_dictionary/ref_src' } },
  };
  const testPond = {
    pond: 'Test',
    reference_dictionary: dict,
    entry1: { $ref: '#/reference_dictionary/ref_obj' },
    entry2: { $ref: '#/reference_dictionary/ref_obj' },
  };
  const exp = expandReferences(testPond);
  assert.equal(exp.entry1.date, '2026-09-04');
  assert.deepEqual(exp.entry1.source, ['src-1', 'src-2']);
  assert.deepEqual(exp.entry1, exp.entry2);
  assert.equal(exp.reference_dictionary, undefined);

  // 6. Conflict alias sourceId vs list non-equivalent: where sourceId is NOT in sourceIds or multiple sourceIds exist, assert both preserved
  const sharedLargeDetails = {
    source: 'authoritative_sensor_grid',
    sensor_model: 'pro_optical_do_ph_v3',
    calibration: {
      standard: 'iso_aquaculture_17025',
      certified_date: '2026-01-01',
      valid_until: '2027-01-01',
      tolerances: { ph: 0.05, do: 0.1, temp: 0.2, salinity: 0.5 },
    },
    metadata: {
      station: 'station_north_alpha',
      firmware: '4.12.0-rc3',
      operator: 'PT Central Aqua Tech',
      telemetry: { interval_seconds: 60, retry_limit: 5, encryption: 'tls-1.3' },
    },
    verified: true,
  };
  const conflictPond = {
    pond: 'Conflict Pond',
    daily_records_14d: [
      {
        date: '2026-09-04',
        measurement_provenance: {
          water: { sourceId: 'single-match', sourceIds: ['single-match'] },
          do: { sourceId: 'sensor-1', sourceIds: ['sensor-2'] },
          ph: { sourceId: 'meter-1', sourceIds: ['meter-1', 'meter-2'] },
          salinity: { sourceId: 'id-a', source_id: 'id-b' },
        },
      },
    ],
    repeated_provenance: Array.from({ length: 220 }, (_, i) => ({
      id: `prov-${i}`,
      details: sharedLargeDetails,
    })),
  };
  const conflictContext = [
    'ORSON QUESTION FOCUS:\n{"route":"farm_analysis"}',
    `ORSON RISK PAYLOAD:\n${JSON.stringify([conflictPond])}`,
  ].join('\n\n');
  assert.ok(estimateOrsonPromptTokens(conflictContext) > 5000, 'uncompressed context exceeds 5000 token budget');
  const compactedConflict = selectCompleteContextSections(conflictContext, 5000);
  assert.ok(estimateOrsonPromptTokens(compactedConflict) <= 5000, 'compacted context fits within 5000 token budget');
  const parsedConflict = independentDecode(JSON.parse(extractJsonSection(compactedConflict, 'ORSON RISK PAYLOAD')))[0];
  const confProv = parsedConflict.daily_records_14d[0].measurement_provenance;
  assert.equal(confProv.water.sourceId, undefined, 'removes exact single match sourceId');
  assert.equal(confProv.do.sourceId, 'sensor-1', 'preserves sourceId when not in sourceIds list');
  assert.deepEqual(confProv.do.sourceIds, ['sensor-2'], 'preserves sourceIds when non-equivalent');
  assert.equal(confProv.ph.sourceId, 'meter-1', 'preserves sourceId when multiple sourceIds exist');
  assert.equal(confProv.ph.sourceIds.length, 2, 'preserves sourceIds list with multiple items');
  assert.equal(confProv.salinity.sourceId, 'id-a', 'preserves sourceId when different from source_id');
  assert.equal(confProv.salinity.source_id, 'id-b', 'preserves source_id when different from sourceId');
  assert.equal(parsedConflict.repeated_provenance.length, 220, 'roundtrip retains all 220 repeated records');
  assert.deepEqual(parsedConflict.repeated_provenance[0].details, sharedLargeDetails, 'retains full details in repeated provenance');

  // Full independent decoded payload equals original (EXACT approved alias norm only)
  const expectedConflictPond = JSON.parse(JSON.stringify(conflictPond));
  delete expectedConflictPond.daily_records_14d[0].measurement_provenance.water.sourceId;
  assert.deepEqual(parsedConflict, expectedConflictPond, 'full independent decoded payload equals original (exact approved alias norm only)');

  // Separately keep irreducible literal padding overflow test
  let irreducibleOverflow = false;
  try {
    selectCompleteContextSections(`ORSON RISK PAYLOAD:\n${JSON.stringify([{ pond: 'Irreducible', dummy: 'x'.repeat(45000) }])}`, 5000);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Orson context budget exceeded')) {
      irreducibleOverflow = true;
    }
  }
  assert.ok(irreducibleOverflow, 'irreducible literal padding explicitly overflows budget');

  // 7. Protected ORSON RECENT CONVERSATION overflow throws explicit error before provider
  let convErr = null;
  try {
    const hugeConvContext = [
      `ORSON RECENT CONVERSATION:\n${JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ role: 'user', text: `Message ${i}: ${'u'.repeat(1000)}` })))}`,
      `ORSON RISK PAYLOAD:\n${JSON.stringify([{ pond: 'P1', val: 'v'.repeat(2000) }])}`,
    ].join('\n\n');
    selectCompleteContextSections(hugeConvContext, 200);
  } catch (err) {
    convErr = err;
  }
  assert.ok(convErr instanceof Error, 'protected conversation overflow throws explicit error');
  assert.match(
    convErr.message,
    /Orson context budget exceeded: protected structured evidence cannot fit within token budget\./,
    'explicit error before provider on protected conversation overflow',
  );

  // 8. References interned with refs and r1 format and expanded by independent decoder
  const internRefsPond = {
    pond: 'Refs Pond',
    refs: {
      r1: { unit: 'mg/L', precision: 2, basis: 'NO2-N' },
    },
    metric_a: { $ref: '#/refs/r1' },
    metric_b: { $ref: '#/refs/r1' },
  };
  const decodedIntern = independentDecode(internRefsPond);
  assert.equal(decodedIntern.refs, undefined, 'independent decoder removes refs dictionary');
  assert.deepEqual(decodedIntern.metric_a, { unit: 'mg/L', precision: 2, basis: 'NO2-N' }, 'expands #/refs/r1');
  assert.deepEqual(decodedIntern.metric_a, decodedIntern.metric_b, 'both pointers expand to identical objects');

  // 9. Nested references interned and expanded by independent decoder
  const nestedPond = {
    pond: 'Nested Refs Pond',
    refs: {
      r1: { unit: 'mg/L', basis: 'NO2-N' },
      r2: { measurement: { $ref: '#/refs/r1' }, method: 'spectrophotometry' },
    },
    sample_a: { $ref: '#/refs/r2' },
    sample_b: { $ref: '#/refs/r2' },
  };
  const decodedNested = independentDecode(nestedPond);
  assert.equal(decodedNested.refs, undefined, 'independent decoder removes refs dictionary for nested refs');
  assert.deepEqual(decodedNested.sample_a.measurement, { unit: 'mg/L', basis: 'NO2-N' }, 'expands nested reference');
  assert.equal(decodedNested.sample_a.method, 'spectrophotometry');
  assert.deepEqual(decodedNested.sample_a, decodedNested.sample_b, 'both nested pointers expand identically');
});

test('prompt context carries evidence provenance, freshness, per-metric coverage, and preserves explicit zero feed without double counting', () => {
  const result = buildOrsonAnalysis([
    pond('Truth Pond', [
      { id: 's-stock', date: '2026-08-01', mbw: 2.0 },
      { id: 's-mid', date: '2026-08-15', mbw: 5.0, feed: 30 },
      {
        id: 's-zero',
        date: '2026-09-02',
        mbw: 12.0,
        feed: 20,
        feedData: { totalDailyFeed: 0 },
        doMorning: 5.2,
      },
      {
        id: 's-prev',
        date: '2026-09-03',
        feedData: { totalDailyFeed: 45 },
        doMorning: 4.8,
        doEvening: 5.5,
      },
      dailyRecord('2026-09-04', 1, {
        id: 'rec-latest',
        feedData: { totalDailyFeed: 50 },
        doMorning: 4.5,
        doEvening: 5.2,
      }),
    ]),
  ], 'Analyze feed and water quality in Truth Pond', now);

  const pack = result.promptPackage;
  const payload = riskPayload(pack.context)[0];

  assert.ok(payload.evidence, 'evidence summary exists');
  assert.equal(payload.evidence.as_of_date, '2026-09-04');
  assert.equal(payload.evidence.farm_time_zone, 'UTC');
  assert.ok(payload.evidence.water, 'water metric evidence exists');
  assert.equal(payload.evidence.water.date, '2026-09-04');
  assert.equal(payload.evidence.water.is_fresh, true);
  assert.equal(payload.evidence.water.age_days, 0);
  assert.ok(payload.evidence.water.coverage.recorded_days > 0);

  const dayZero = payload.daily_records_14d.find((r) => r.date === '2026-09-02');
  assert.ok(dayZero, 'record for 2026-09-02 exists');
  assert.equal(dayZero.feed_kg, 0, 'authoritative zero feed is preserved');
  assert.equal(dayZero.feed_kg_display, '0.0', 'zero feed formatted display is preserved');
  assert.equal(dayZero.feed_source, 'daily_feed', 'authoritative feed wins over sampling estimate');
  assert.equal(dayZero.actual_daily_feed_kg, 0);
  assert.equal(dayZero.sampling_feed_estimate_kg, 20);

  assert.equal(dayZero.ph_morning, undefined, 'missing ph_morning stays undefined/unknown');
  assert.equal(dayZero.ammonia_mg_l, undefined, 'missing ammonia stays undefined/unknown');

  assert.ok(payload.growth_evidence, 'growth evidence exists');
  assert.equal(payload.growth_evidence.adg_source, 'measured');
  assert.equal(typeof payload.growth_evidence.sample_count, 'number');
  assert.equal(payload.growth_evidence.latest_date, '2026-09-02');
  assert.equal(payload.growth_evidence.age_days, 2);
  assert.equal(payload.growth_evidence.is_fresh, true);

  assert.match(pack.systemInstruction, /Always use farm-local calendar dates/);
  assert.match(pack.systemInstruction, /Stale normal data is not current safety/);
  assert.match(pack.systemInstruction, /Logged feed allocation is an operational distribution/);
  assert.match(pack.systemInstruction, /Explicit zero feed \(0 kg\) means the recorded daily feed allocation or total is zero/);
  assert.match(pack.systemInstruction, /Do not infer fasting, halted feeding, appetite, tray clearance, or consumption from this value/);
  assert.match(pack.systemInstruction, /A missing observation is strictly unknown/);
});
