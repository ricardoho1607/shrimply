const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrsonAppDataReader } = require('./orsonAppData');
const {
  toWaterQualityRecordDto,
  toPondSummaryDto,
  hasWaterQualityData,
} = require('./readOnlyFarmApi');
const fixture = (role = 'technician', data = {}, more = false, timeZone = 'UTC') => {
  const paths = [];
  const makeRef = path => ({
    collection: name => makeRef(`${path}/${name}`), doc: id => makeRef(`${path}/${id}`),
    where: (field, op, value) => { paths.push({ field, op, value }); return makeRef(path); },
    orderBy: () => makeRef(path), startAfter: cursor => { paths.push({ cursor }); return makeRef(path); },
    limit: () => makeRef(path + '/list'),
    get: async () => {
      paths.push(path);
      const doc = id => ({ id, exists: true, data: () => data });
      return path.endsWith('/list') ? { docs: Array.from({ length: more ? 11 : 1 }, (_, i) => doc(`record-${i}`)) } : doc('record');
    },
  });
  const reader = createOrsonAppDataReader({ db: { collection: name => makeRef(name) }, company: { ownerId: 'owner', teamMembers: ['member'], timeZone }, user: { role, companyId: 'company' }, uid: role === 'owner' ? 'owner' : 'member', companyId: 'company' });
  return { ...reader, paths };
};
test('data tool enforces permissions and cannot read another company or arbitrary path', async () => {
  const reader = fixture();
  for (const args of [{ dataset: 'expenses' }, { dataset: '../users' }, { dataset: 'ponds', documentId: '../other' }, { dataset: 'ponds', after: 'other/path' }]) {
    await assert.rejects(reader.execute('read_app_records', args));
  }
  await assert.rejects(reader.execute('read_pond_timeline', { pondId: '../other', days: 30 }));
  assert.deepEqual(reader.paths, []);
  assert.ok(!reader.tools[0].parameters.properties.dataset.enum.includes('expenses'));
});
test('pond lists disclose pagination and use only the authorized company path', async () => {
  const reader = fixture('technician', { pondName: 'A1', feedCost: 500, samplings: [{ mbw: 5 }], secret: 'private' }, true);
  const result = await reader.execute('read_app_records', { dataset: 'ponds' });
  assert.equal(result.complete, false);
  assert.equal(result.nextCursor, 'record-9');
  assert.equal(result.records.length, 10);
  assert.equal(result.documentDetailsOmitted, true);
  assert.deepEqual(result.records[0].data, { pondName: 'A1' });
  assert.ok(reader.paths.includes('companies/company/ponds/list'));
});
test('historical arrays are reachable beyond the initial page without turning nulls into zero', async () => {
  const reader = fixture('technician', { samplings: Array.from({ length: 35 }, (_, i) => ({ mbw: i === 34 ? null : i, cost: 100 })) });
  const first = await reader.execute('read_app_records', { dataset: 'ponds', documentId: 'a1', field: 'samplings' });
  assert.equal(first.nextOffset, 30);
  const next = await reader.execute('read_app_records', { dataset: 'ponds', documentId: 'a1', field: 'samplings', offset: 30 });
  assert.equal(next.complete, true);
  assert.deepEqual(next.data.at(-1), { mbw: null });
});
test('historical array pages shrink to the byte limit and offsets never skip records', async () => {
  const records = Array.from({ length: 30 }, (_, i) => ({ id: `row-${i}`, note: 'x'.repeat(1800) }));
  const reader = fixture('technician', { samplings: records });
  const first = await reader.execute('read_app_records', { dataset: 'ponds', documentId: 'pond-a', field: 'samplings' });
  assert.ok(Buffer.byteLength(JSON.stringify(first.data), 'utf8') <= 24000);
  assert.ok(first.data.length < 30);
  assert.equal(first.nextOffset, first.data.length);
  const received = [...first.data];
  let offset = first.nextOffset;
  while (offset !== null) {
    const page = await reader.execute('read_app_records', { dataset: 'ponds', documentId: 'pond-a', field: 'samplings', offset });
    assert.ok(Buffer.byteLength(JSON.stringify(page.data), 'utf8') <= 24000);
    received.push(...page.data);
    offset = page.nextOffset;
  }
  assert.deepEqual(received, records);
});
test('oversized single array item is reported with its exact offset, never silently omitted', async () => {
  const reader = fixture('technician', { samplings: [{ note: 'x'.repeat(25000) }] });
  const result = await reader.execute('read_app_records', { dataset: 'ponds', documentId: 'pond-a', field: 'samplings' });
  assert.equal(result.status, 'array_item_too_large');
  assert.equal(result.offset, 0);
});
test('owners can read finance but private credentials and contact fields stay excluded', async () => {
  const reader = fixture('owner', { amount: 123, date: '2026-09-09', token: 'private', email: 'private' });
  const result = await reader.execute('read_app_records', { dataset: 'expenses', documentId: 'expense' });
  assert.deepEqual(result.data, { amount: 123, date: '2026-09-09' });
});
test('top-level assets require company ownership even for an exact ID', async () => {
  const reader = fixture('owner', { companyId: 'other' });
  await assert.rejects(reader.execute('read_app_records', { dataset: 'assets', documentId: 'asset' }));
  await reader.execute('read_app_records', { dataset: 'assets' });
  assert.ok(reader.paths.some(item => item.value === 'company' && item.field === 'companyId'));
});

test('pond timeline returns date-aligned chart series without inventing missing mortality', async () => {
  const reader = fixture('technician', {
    pondName: 'Pond A', pondCycleId: 'cycle-a',
    samplings: [
      { date: '2026-09-08', pondCycleId: 'cycle-a', mortality: 7, mbw: 0 },
      { date: '2026-09-09', pondCycleId: 'cycle-a', doMorning: '5.2', doEvening: '6.1', phMorning: '7.8', phEvening: '8.2', feedData: { totalDailyFeed: 20, feedingResponse: 'normal' } },
      { date: '2026-09-10', pondCycleId: 'old-cycle', doMorning: '1.2' },
      { date: '2026-09-11', pondCycleId: 'cycle-a', doMorning: '4.1', doEvening: '5.4', weatherEvent: 'heavy_rain', mbw: 8.4 },
    ],
    mortalityRecords: [
      { date: '2026-09-09', pondCycleId: 'cycle-a', observationType: 'none_observed', count: 0 },
      { date: '2026-09-11', pondCycleId: 'cycle-a', observationType: 'observed_recovered', count: 118 },
    ],
  });
  const result = await reader.execute('read_pond_timeline', { pondId: 'pond-a', days: 7, endDate: '2026-09-12' });

  assert.deepEqual(result.lineSeries.mortalityCount, [{ date: '2026-09-08', value: 7 }, { date: '2026-09-09', value: 0 }, { date: '2026-09-11', value: 118 }]);
  assert.deepEqual(result.lineSeries.doMinimumMgL, [{ date: '2026-09-09', value: 5.2 }, { date: '2026-09-11', value: 4.1 }]);
  assert.equal(result.timeline.some(day => day.date === '2026-09-10'), false);
  assert.equal(result.lineSeries.mbwG.some(point => point.date === '2026-09-08'), false);
  assert.equal(result.coverage.missingDatesAreUnknown, true);
  assert.ok(reader.tools.some(item => item.name === 'read_pond_timeline'));
  await assert.rejects(reader.execute('read_pond_timeline', { pondId: 'pond-a', days: 91, endDate: '2026-09-12' }));
  await assert.rejects(reader.execute('read_pond_timeline', { pondId: 'pond-a', days: 30, endDate: '2026-02-31' }));
});

test('pond timeline preserves zero feed, authoritative daily-feed precedence, and prevents duplicate summing', async () => {
  const reader = fixture('technician', {
    pondName: 'Pond Feed',
    samplings: [
      // 2026-09-07: authoritative feed (25kg) and sampling (40kg)
      { date: '2026-09-07', feed: 40 },
      { date: '2026-09-07', feedData: { totalDailyFeed: 25, feedingResponse: 'normal' } },
      // 2026-09-08: duplicate daily feed totals (30kg and 30kg)
      { date: '2026-09-08', feedData: { totalDailyFeed: 30 } },
      { date: '2026-09-08', feedData: { totalDailyFeed: 30 } },
      // 2026-09-09: explicit zero feed (0kg) and sampling (15kg)
      { date: '2026-09-09', feedData: { totalDailyFeed: 0, isExplicitZero: true } },
      { date: '2026-09-09', feed: 15 },
      // 2026-09-10: no feed logged at all
      { date: '2026-09-10', doMorning: '5.0' },
    ],
  });

  const result = await reader.execute('read_pond_timeline', { pondId: 'pond-feed', days: 7, endDate: '2026-09-10' });
  const d7 = result.timeline.find(d => d.date === '2026-09-07');
  const d8 = result.timeline.find(d => d.date === '2026-09-08');
  const d9 = result.timeline.find(d => d.date === '2026-09-09');
  const d10 = result.timeline.find(d => d.date === '2026-09-10');

  // Authoritative feed wins over sampling
  assert.equal(d7?.feedKg, 25, 'authoritative feed wins over sampling');
  // Duplicate totals do not sum
  assert.equal(d8?.feedKg, 30, 'duplicate feed totals do not sum to 60');
  // Explicit zero is preserved
  assert.equal(d9?.feedKg, 0, 'explicit zero feed is preserved as 0');
  // Missing feed remains null
  assert.equal(d10?.feedKg, null, 'missing feed remains null, not zero');

  // Chart lineSeries includes zero but excludes null
  const feedSeries = result.lineSeries.feedKg;
  assert.deepEqual(feedSeries, [
    { date: '2026-09-07', value: 25 },
    { date: '2026-09-08', value: 30 },
    { date: '2026-09-09', value: 0 },
  ]);
});

test('pond timeline selects latest feed correction and zero correction after positive', async () => {
  const reader = fixture('technician', {
    pondName: 'Pond Corrections',
    samplings: [
      // Day 1: unequal corrections (20kg at 08:00, 35kg at 16:00)
      { id: 'z-old', date: '2026-09-01', updatedAt: '2026-09-01T16:00:00Z', feedData: { totalDailyFeed: 20, measuredAt: '2026-09-01T08:00:00Z' } },
      { id: 'a-new', date: '2026-09-01', updatedAt: '2026-09-01T08:00:00Z', feedData: { totalDailyFeed: 35, measuredAt: '2026-09-01T16:00:00Z' } },
      // Day 2: positive (50kg at 08:00), then zero correction (0kg at 12:00)
      { id: 'z-positive', date: '2026-09-02', updatedAt: '2026-09-02T14:00:00Z', feedData: { totalDailyFeed: 50, measuredAt: '2026-09-02T08:00:00Z' } },
      { id: 'a-zero', date: '2026-09-02', updatedAt: '2026-09-02T07:00:00Z', feedData: { totalDailyFeed: 0, isExplicitZero: true, measuredAt: '2026-09-02T12:00:00Z' } },
    ],
  });

  const result = await reader.execute('read_pond_timeline', { pondId: 'pond-corr', days: 7, endDate: '2026-09-03' });
  const d1 = result.timeline.find(d => d.date === '2026-09-01');
  const d2 = result.timeline.find(d => d.date === '2026-09-02');

  assert.equal(d1?.feedKg, 35, 'later correction of 35kg must win over 20kg without summing to 55kg');
  assert.equal(d2?.feedKg, 0, 'zero correction after positive must be selected as 0kg');
});

test('pond timeline assigns exact measurement timestamps to farm-local dates', async () => {
  const reader = fixture('technician', {
    pondName: 'Jakarta Boundary',
    samplings: [{
      id: 'boundary-feed',
      date: '2026-08-31',
      feedData: { totalDailyFeed: 12, measuredAt: '2026-08-31T17:30:00Z' },
    }],
  }, false, 'Asia/Jakarta');

  const result = await reader.execute('read_pond_timeline', { pondId: 'pond-boundary', days: 7, endDate: '2026-09-01' });
  const farmDay = result.timeline.find(day => day.date === '2026-09-01');
  assert.equal(farmDay?.feedKg, 12);
  assert.equal(farmDay?.feedMeasuredAt, '2026-08-31T17:30:00Z');
  assert.equal(farmDay?.feedPrecision, 'timestamp');
});

test('observation values: false and zero survive, basis and sessions retained, missing stays unknown', async () => {
  const reader = fixture('technician', {
    pondName: 'Observation Pond',
    samplings: [
      {
        id: 'obs-d1',
        date: '2026-09-01',
        surfaceScum: false,
        nitriteMgL: 0,
        nitriteBasis: 'NO2',
        waterDepthCmMorning: 110,
        waterExchangePercent: 0,
        temperatureMorning: 27.5,
      },
      {
        id: 'obs-d2',
        date: '2026-09-02',
        surfaceScum: true,
        nitriteMgL: 0.25,
        nitriteBasis: 'NO2',
        waterDepthCmEvening: 115,
        waterExchangePercent: 15,
        temperatureEvening: 29.0,
      },
      {
        id: 'obs-d3',
        date: '2026-09-03',
        phMorning: 7.8,
      },
    ],
  });

  const timelineResult = await reader.execute('read_pond_timeline', { pondId: 'pond-obs', days: 7, endDate: '2026-09-03' });
  const d1 = timelineResult.timeline.find(d => d.date === '2026-09-01');
  const d2 = timelineResult.timeline.find(d => d.date === '2026-09-02');
  const d3 = timelineResult.timeline.find(d => d.date === '2026-09-03');

  // Day 1: false and zero survive, basis and morning session retained
  assert.equal(d1?.surfaceScum, false, 'surfaceScum: false must survive as boolean false');
  assert.equal(d1?.nitriteMgL, 0, 'nitriteMgL: 0 must survive as number 0');
  assert.equal(d1?.nitriteBasis, 'NO2', 'nitriteBasis: NO2 must be retained');
  assert.equal(d1?.waterDepthCmMorning, 110, 'waterDepthCmMorning must be 110');
  assert.equal(d1?.waterDepthCmEvening, null, 'waterDepthCmEvening must be null when omitted');
  assert.equal(d1?.waterDepthCm, 110, 'waterDepthCm should reflect morning depth');
  assert.equal(d1?.waterExchangePercent, 0, 'waterExchangePercent: 0 must survive as 0');
  assert.equal(d1?.temperatureMorningC, 27.5);
  assert.equal(d1?.temperatureEveningC, null);
  assert.ok(d1?.events.includes('No surface scum'));
  assert.ok(d1?.events.includes('Water exchange: 0%'));

  // Day 2: positive values and evening session retained
  assert.equal(d2?.surfaceScum, true);
  assert.equal(d2?.nitriteMgL, 0.25);
  assert.equal(d2?.nitriteBasis, 'NO2');
  assert.equal(d2?.waterDepthCmMorning, null, 'waterDepthCmMorning must remain null when omitted');
  assert.equal(d2?.waterDepthCmEvening, 115, 'waterDepthCmEvening must be 115');
  assert.equal(d2?.waterDepthCm, 115);
  assert.equal(d2?.waterExchangePercent, 15);
  assert.ok(d2?.events.includes('Surface scum observed'));
  assert.ok(d2?.events.includes('Water exchange: 15%'));

  // Day 3: missing stays unknown (null), never converted to 0 or false
  assert.equal(d3?.surfaceScum, null, 'missing surfaceScum remains null');
  assert.equal(d3?.nitriteMgL, null, 'missing nitriteMgL remains null');
  assert.equal(d3?.nitriteBasis, null, 'missing nitriteBasis remains null');
  assert.equal(d3?.waterDepthCmMorning, null, 'missing waterDepthCmMorning remains null');
  assert.equal(d3?.waterDepthCmEvening, null, 'missing waterDepthCmEvening remains null');
  assert.equal(d3?.waterDepthCm, null, 'missing waterDepthCm remains null');
  assert.equal(d3?.waterExchangePercent, null, 'missing waterExchangePercent remains null');

  // lineSeries: zero survives, missing dates are excluded without converting to 0
  assert.deepEqual(timelineResult.lineSeries.nitriteMgL, [
    { date: '2026-09-01', value: 0 },
    { date: '2026-09-02', value: 0.25 },
  ]);
  assert.deepEqual(timelineResult.lineSeries.waterDepthCmMorning, [
    { date: '2026-09-01', value: 110 },
  ]);
  assert.deepEqual(timelineResult.lineSeries.waterDepthCmEvening, [
    { date: '2026-09-02', value: 115 },
  ]);
  assert.deepEqual(timelineResult.lineSeries.waterExchangePercent, [
    { date: '2026-09-01', value: 0 },
    { date: '2026-09-02', value: 15 },
  ]);

  // read_app_records: raw array read preserves primitives
  const appRecords = await reader.execute('read_app_records', { dataset: 'ponds', documentId: 'pond-obs', field: 'samplings' });
  assert.equal(appRecords.data[0].surfaceScum, false);
  assert.equal(appRecords.data[0].nitriteMgL, 0);
  assert.equal(appRecords.data[0].waterExchangePercent, 0);
  assert.equal(appRecords.data[0].waterDepthCmMorning, 110);
  assert.equal(appRecords.data[2].surfaceScum ?? null, null);
});

test('observation freshness: later corrections on same day overwrite earlier values without dropping unaffected sessions', async () => {
  const reader = fixture('technician', {
    pondName: 'Correction Pond',
    samplings: [
      {
        id: 'obs-am',
        date: '2026-09-05',
        measuredAt: '2026-09-05T07:00:00Z',
        updatedAt: '2026-09-05T07:05:00Z',
        waterDepthCmMorning: 100,
        nitriteMgL: 0.4,
        surfaceScum: true,
        doMorning: 4.5,
      },
      {
        id: 'obs-pm',
        date: '2026-09-05',
        measuredAt: '2026-09-05T18:00:00Z',
        updatedAt: '2026-09-05T18:05:00Z',
        waterDepthCmEvening: 108,
        nitriteMgL: 0,
        surfaceScum: false,
        doEvening: 5.8,
      },
    ],
  });

  const result = await reader.execute('read_pond_timeline', { pondId: 'pond-corr', days: 7, endDate: '2026-09-05' });
  const day = result.timeline.find(d => d.date === '2026-09-05');

  // Both morning and evening sessions survive
  assert.equal(day?.waterDepthCmMorning, 100, 'morning session is preserved');
  assert.equal(day?.waterDepthCmEvening, 108, 'evening session is preserved');

  // Later correction of 0 wins over 0.4
  assert.equal(day?.nitriteMgL, 0, 'later correction to 0 wins');
  assert.equal(day?.nitriteBasis, 'NO2');

  // Later correction of false wins over true, and conflicting event is deduplicated
  assert.equal(day?.surfaceScum, false, 'later correction to false wins');
  assert.ok(day?.events.includes('No surface scum'));
  assert.ok(!day?.events.includes('Surface scum observed'), 'superseded surface scum event is removed');

  // Evidence freshness metadata tracks the latest record
  assert.equal(day?.waterQualitySourceId, 'obs-pm');
  assert.equal(day?.waterQualityPrecision, 'timestamp');
});

test('readOnlyFarmApi DTOs preserve canonical values, units, basis, sessions and freshness', () => {
  // hasWaterQualityData recognizes false and 0
  assert.equal(hasWaterQualityData({ surfaceScum: false }), true);
  assert.equal(hasWaterQualityData({ nitriteMgL: 0 }), true);
  assert.equal(hasWaterQualityData({ waterDepthCmMorning: 0 }), true);
  assert.equal(hasWaterQualityData({ waterExchangePercent: 0 }), true);
  assert.equal(hasWaterQualityData({ mbw: 12, feed: 25 }), false);

  // toWaterQualityRecordDto: canonical values, units, basis and sessions
  const dto1 = toWaterQualityRecordDto({
    id: 'wq-1',
    date: '2026-09-01',
    surfaceScum: false,
    nitriteMgL: 0,
    nitriteBasis: 'NO2',
    waterDepthCmMorning: 120,
    waterExchangePercent: 0,
  }, 'pond-1');

  assert.equal(dto1.surfaceScum, false);
  assert.equal(dto1.nitriteMgL, 0);
  assert.equal(dto1.nitriteBasis, 'NO2');
  assert.equal(dto1.waterDepthCmMorning, 120);
  assert.equal(dto1.waterDepthCmEvening, null);
  assert.equal(dto1.waterDepthCm, 120);
  assert.equal(dto1.waterExchangePercent, 0);
  assert.equal(dto1.units.nitriteMgL, 'mg/L NO2');
  assert.equal(dto1.units.waterDepthCm, 'cm');
  assert.equal(dto1.units.waterDepthCmMorning, 'cm');
  assert.equal(dto1.units.waterDepthCmEvening, 'cm');
  assert.equal(dto1.units.waterExchangePercent, '%');

  // toWaterQualityRecordDto: evening depth does not leak into morning
  const dtoEvening = toWaterQualityRecordDto({
    id: 'wq-2',
    date: '2026-09-02',
    waterDepthCmEvening: 125,
    waterDepthCm: 125,
  }, 'pond-1');
  assert.equal(dtoEvening.waterDepthCmMorning, null, 'evening depth must not leak into morningDepth');
  assert.equal(dtoEvening.waterDepthCmEvening, 125);
  assert.equal(dtoEvening.waterDepthCm, 125);

  // toWaterQualityRecordDto: missing stays null
  const dtoEmpty = toWaterQualityRecordDto({
    id: 'wq-3',
    date: '2026-09-03',
    phMorning: 7.5,
  }, 'pond-1');
  assert.equal(dtoEmpty.surfaceScum, null);
  assert.equal(dtoEmpty.nitriteMgL, null);
  assert.equal(dtoEmpty.nitriteBasis, null);
  assert.equal(dtoEmpty.waterDepthCmMorning, null);
  assert.equal(dtoEmpty.waterDepthCmEvening, null);
  assert.equal(dtoEmpty.waterDepthCm, null);

  // toPondSummaryDto: latestWaterQuality selects the freshest update on the same date
  const summary = toPondSummaryDto({
    id: 'pond-summary-test',
    samplings: [
      {
        id: 'old-obs',
        date: '2026-09-01',
        measuredAt: '2026-09-01T08:00:00Z',
        updatedAt: '2026-09-01T08:00:00Z',
        nitriteMgL: 0.5,
        surfaceScum: true,
      },
      {
        id: 'new-obs',
        date: '2026-09-01',
        measuredAt: '2026-09-01T16:00:00Z',
        updatedAt: '2026-09-01T16:00:00Z',
        nitriteMgL: 0,
        surfaceScum: false,
      },
    ],
  }, 'pond-summary-test');

  assert.equal(summary.latestWaterQuality?.nitriteMgL, 0, 'freshest observation wins');
  assert.equal(summary.latestWaterQuality?.surfaceScum, false, 'freshest surfaceScum wins');
  assert.equal(summary.latestWaterQuality?.nitriteBasis, 'NO2');
});

test('decision input baseline fixtures: data isolation, no synthetic values, and read-path gaps', async () => {
  const deterministicPond = {
    pondName: 'Decision Pond 1',
    pondCycleId: 'cycle-q3',
    cycleId: 'cycle-q3',
    initialStock: 100000,
    initialWeight: 0.5,
    feedCost: 8500,
    seedCost: 1500,
    samplings: [
      {
        id: 'samp-1',
        date: '2026-08-20',
        pondCycleId: 'cycle-q3',
        mbw: 3.2,
        feed: 45,
        doMorning: 5.8,
        doEvening: 6.2,
        phMorning: 7.8,
        phEvening: 8.2,
        salinity: 25,
        feedData: { totalDailyFeed: 45, feedingResponse: 'normal' },
        cost: 90,
      },
      {
        id: 'samp-2',
        date: '2026-08-25',
        pondCycleId: 'cycle-q3',
        mbw: 4.8,
        feed: 50,
        doMorning: 5.5,
        doEvening: 6.0,
        phMorning: 7.7,
        phEvening: 8.1,
        salinity: 25,
        feedData: { totalDailyFeed: 50, feedingResponse: 'normal' },
        cost: 100,
      },
      {
        id: 'samp-3',
        date: '2026-08-30',
        pondCycleId: 'cycle-q3',
        mbw: 6.5,
        doMorning: null,
        doEvening: 5.9,
        feedData: { totalDailyFeed: 0, isExplicitZero: true },
      },
      {
        id: 'samp-old',
        date: '2026-08-22',
        pondCycleId: 'cycle-q2',
        mbw: 18.0,
        feed: 120,
      },
    ],
    mortalityRecords: [
      { date: '2026-08-25', pondCycleId: 'cycle-q3', observationType: 'estimated_total', count: 15 },
      { date: '2026-08-29', pondCycleId: 'cycle-q3', observationType: 'none_observed', count: 0 },
    ],
  };

  const techReader = fixture('technician', deterministicPond);
  await assert.rejects(techReader.execute('read_app_records', { dataset: 'expenses' }), /Not permitted/);
  await assert.rejects(techReader.execute('read_app_records', { dataset: 'revenues' }), /Not permitted/);

  const techPondRead = await techReader.execute('read_app_records', { dataset: 'ponds', documentId: 'pond-1' });
  assert.equal(techPondRead.status, 'ok');
  assert.equal(techPondRead.data.feedCost, undefined, 'feedCost must be stripped from technician read');
  assert.equal(techPondRead.data.seedCost, undefined, 'seedCost must be stripped from technician read');

  const techSamplings = await techReader.execute('read_app_records', { dataset: 'ponds', documentId: 'pond-1', field: 'samplings' });
  assert.equal(techSamplings.status, 'ok');
  assert.equal(techSamplings.data[0].cost, undefined, 'sampling cost must be stripped from technician view');
  assert.equal(techSamplings.data[0].mbw, 3.2, 'biological values remain accessible');

  const ownerReader = fixture('owner', deterministicPond);
  const ownerPondRead = await ownerReader.execute('read_app_records', { dataset: 'ponds', documentId: 'pond-1' });
  assert.equal(ownerPondRead.data.feedCost, 8500, 'owner can view feedCost');
  assert.equal(ownerPondRead.data.seedCost, 1500, 'owner can view seedCost');

  const timeline = await techReader.execute('read_pond_timeline', {
    pondId: 'pond-1',
    days: 7,
    endDate: '2026-08-31',
  });
  assert.equal(timeline.status, 'ok');

  assert.equal(timeline.timeline.some(day => day.mbwG === 18.0), false, 'previous cycle mbw must not leak into current cycle');

  const day30 = timeline.timeline.find(d => d.date === '2026-08-30');
  assert.ok(day30, 'day 2026-08-30 exists');
  assert.equal(day30.feedKg, 0, 'explicit zero feed is preserved as 0');
  assert.equal(day30.doMorningMgL, null, 'missing morning DO must be null, never fabricated as 0');
  assert.equal(day30.doEveningMgL, 5.9, 'measured evening DO is preserved');
  assert.equal(day30.mortalityCount, null, 'missing mortality on 2026-08-30 must be null, never fabricated as 0');

  const day31 = timeline.timeline.find(d => d.date === '2026-08-31');
  assert.ok(day31, 'day 2026-08-31 exists in window');
  assert.equal(day31.feedKg, null, 'unrecorded feed day must be null, never fabricated as 0');
  assert.equal(day31.mortalityCount, null, 'unrecorded mortality day must be null, never fabricated as 0');

  const day29 = timeline.timeline.find(d => d.date === '2026-08-29');
  assert.ok(day29);
  assert.equal(day29.mortalityCount, 0, 'explicit none_observed mortality is preserved as 0');

  const pondList = await techReader.execute('read_app_records', { dataset: 'ponds' });
  assert.equal(pondList.status, 'ok');
  assert.equal(pondList.documentDetailsOmitted, true, 'read_app_records list mode omits nested array details');
  assert.equal(pondList.records[0].data.samplings, undefined, 'samplings array omitted in list view');
});
