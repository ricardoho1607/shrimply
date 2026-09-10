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
