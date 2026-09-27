const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrsonAppDataReader } = require('./orsonAppData');
const fixture = (role = 'technician', data = {}, more = false) => {
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
  const reader = createOrsonAppDataReader({ db: { collection: name => makeRef(name) }, company: { ownerId: 'owner', teamMembers: ['member'] }, user: { role, companyId: 'company' }, uid: role === 'owner' ? 'owner' : 'member', companyId: 'company' });
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
