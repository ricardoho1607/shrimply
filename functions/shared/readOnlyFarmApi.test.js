'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createReadOnlyFarmApi,
  ReadOnlyFarmApi,
  listPonds,
  encodeCursor,
  decodeCursor,
  computeSamplingsDigest,
  extractRealDailyFeed,
  CURRENT_CURSOR_REVISION,
  toWaterQualityRecordDto,
  toFeedRecordDto,
  hasFeedData,
  getDeterministicRecordId,
} = require('./readOnlyFarmApi');

const buildMockDb = (data = {}, { failOn = null, failCode = 'internal' } = {}) => {
  const store = {
    companies: data.companies || {},
    users: data.users || {},
    blocks: data.blocks || {},
    ponds: data.ponds || {},
  };

  const checkFailure = (path, action) => {
    if (failOn && (path.includes(failOn) || action.includes(failOn))) {
      const err = new Error(`Simulated backend error for ${path}:${action}`);
      if (failCode) err.code = failCode;
      throw err;
    }
  };

  const makeQuery = (items, parentPath, filters = [], sortField = null, cursor = null, limitCount = null) => ({
    where: (field, op, val) =>
      makeQuery(items, parentPath, [...filters, { field, op, val }], sortField, cursor, limitCount),
    orderBy: (field) => makeQuery(items, parentPath, filters, field, cursor, limitCount),
    startAfter: (cur) => makeQuery(items, parentPath, filters, sortField, cur, limitCount),
    limit: (n) => makeQuery(items, parentPath, filters, sortField, cursor, n),
    get: async () => {
      checkFailure(parentPath, 'query.get');
      let result = [...items];
      for (const f of filters) {
        if (f.op === '==') {
          result = result.filter((it) => it.data[f.field] === f.val);
        } else if (f.op === 'in') {
          result = result.filter((it) => f.val.includes(it.data[f.field]));
        }
      }
      if (sortField) {
        result.sort((a, b) => {
          const va = sortField === '__name__' ? a.id : a.data[sortField] || '';
          const vb = sortField === '__name__' ? b.id : b.data[sortField] || '';
          return String(va).localeCompare(String(vb));
        });
      }
      if (cursor) {
        const idx = result.findIndex((it) => it.id === cursor);
        if (idx >= 0) {
          result = result.slice(idx + 1);
        }
      }
      if (limitCount !== null) {
        result = result.slice(0, limitCount);
      }
      return {
        docs: result.map((it) => ({
          id: it.id,
          exists: true,
          data: () => ({ ...it.data }),
        })),
        empty: result.length === 0,
      };
    },
  });

  return {
    collection: (collName) => ({
      doc: (docId) => ({
        get: async () => {
          checkFailure(`${collName}/${docId}`, 'doc.get');
          const docData = store[collName]?.[docId];
          return {
            id: docId,
            exists: !!docData,
            data: () => (docData ? { ...docData } : undefined),
          };
        },
        collection: (subColl) => {
          const parentKey = `${docId}`;
          const subItemsMap = store[subColl]?.[parentKey] || {};
          const items = Object.entries(subItemsMap).map(([id, itemData]) => ({
            id,
            data: itemData,
          }));

          return {
            doc: (subDocId) => ({
              get: async () => {
                checkFailure(`${collName}/${docId}/${subColl}/${subDocId}`, 'subdoc.get');
                const subData = subItemsMap[subDocId];
                return {
                  id: subDocId,
                  exists: !!subData,
                  data: () => (subData ? { ...subData } : undefined),
                };
              },
            }),
            where: (field, op, val) =>
              makeQuery(items, `${collName}/${docId}/${subColl}`, [{ field, op, val }]),
            orderBy: (field) => makeQuery(items, `${collName}/${docId}/${subColl}`, [], field),
            startAfter: (cur) => makeQuery(items, `${collName}/${docId}/${subColl}`, [], null, cur),
            limit: (n) => makeQuery(items, `${collName}/${docId}/${subColl}`, [], null, null, n),
            get: async () =>
              makeQuery(items, `${collName}/${docId}/${subColl}`).get(),
          };
        },
      }),
    }),
  };
};

const createStandardFarmFixture = () => {
  return {
    companies: {
      'farm-std': {
        name: 'Standard Shrimp Farm',
        ownerId: 'owner-1',
        teamMembers: ['owner-1', 'mgr-1', 'tech-1', 'buyer-1', 'tech-no-farm'],
        businessSize: 'standard',
        timeZone: 'UTC',
      },
    },
    users: {
      'owner-1': { role: 'owner', companyId: 'farm-std' },
      'mgr-1': { role: 'manager', companyId: 'farm-std' },
      'tech-1': { role: 'technician', companyId: 'farm-std' },
      'buyer-1': { role: 'buyer', companyId: 'farm-std' },
      'tech-no-farm': {
        role: 'technician',
        companyId: 'farm-std',
        permissionOverrides: { viewFarm: false },
      },
    },
    blocks: {
      'farm-std': {
        'blk-1': { name: 'Block 1' },
      },
    },
    ponds: {
      'farm-std': {
        'pond-1': {
          pondName: 'Standard Pond 1',
          blockId: 'blk-1',
          pondArea: 2500,
          cycleStatus: 'active',
          samplings: [
            {
              id: 's1',
              date: '2026-09-01',
              phMorning: 7.8,
              phEvening: 8.2,
              doMorning: 5.5,
              doEvening: 6.0,
              salinity: 25,
              mbw: 5.2,
              feedData: { totalDailyFeed: 45, feedingResponse: 'good' },
            },
          ],
        },
      },
    },
  };
};

const createEnterpriseFarmFixture = () => {
  return {
    companies: {
      'farm-ent': {
        name: 'Enterprise Shrimp Co',
        ownerId: 'ent-owner',
        teamMembers: ['ent-owner', 'ent-mgr', 'tech-a', 'tech-b', 'unassigned-tech'],
        businessSize: 'enterprise',
        timeZone: 'Asia/Jakarta',
      },
      'other-farm': {
        name: 'Other Farm Ltd',
        ownerId: 'other-owner',
        teamMembers: ['other-owner'],
        businessSize: 'standard',
      },
    },
    users: {
      'ent-owner': { role: 'owner', companyId: 'farm-ent' },
      'ent-mgr': { role: 'manager', companyId: 'farm-ent' },
      'tech-a': { role: 'technician', companyId: 'farm-ent' },
      'tech-b': { role: 'technician', companyId: 'farm-ent' },
      'unassigned-tech': { role: 'technician', companyId: 'farm-ent' },
    },
    blocks: {
      'farm-ent': {
        'block-alpha': { name: 'Alpha Block', assignedTechnicianId: 'tech-a' },
        'block-beta': { name: 'Beta Block', assignedTechnicianId: 'tech-b' },
      },
    },
    ponds: {
      'farm-ent': {
        'pond-a1': {
          pondName: 'Pond Alpha 1',
          blockId: 'block-alpha',
          pondArea: 2000,
          cycleStatus: 'active',
          samplings: [
            {
              id: 'samp-a1-1',
              date: '2026-09-01',
              phMorning: 7.9,
              doMorning: 5.8,
              salinity: 28,
              mbw: 4.5,
              feedData: { totalDailyFeed: 40, feedingResponse: 'normal' },
            },
            {
              id: 'samp-a1-2',
              date: '2026-09-02',
              phMorning: 8.0,
              doMorning: 5.2,
              salinity: 28,
              mbw: 5.0,
              feedData: { totalDailyFeed: 0, isExplicitZero: true },
            },
          ],
        },
        'pond-a2': {
          pondName: 'Pond Alpha 2',
          blockId: 'block-alpha',
          pondArea: 2200,
          cycleStatus: 'active',
          samplings: [],
        },
        'pond-b1': {
          pondName: 'Pond Beta 1',
          blockId: 'block-beta',
          pondArea: 3000,
          cycleStatus: 'active',
          samplings: [
            {
              id: 'samp-b1-1',
              date: '2026-09-01',
              phMorning: 7.7,
              doMorning: 5.0,
              salinity: 27,
              mbw: 6.0,
              feedData: { totalDailyFeed: 60 },
            },
          ],
        },
      },
    },
  };
};

test('auth & scoping: requires valid user, derives company strictly from user, and enforces viewFarm permissions', async () => {
  const db = buildMockDb(createStandardFarmFixture());
  const api = createReadOnlyFarmApi({ db });

  // Missing or empty uid throws unauthenticated
  await assert.rejects(
    api.listPonds({ uid: null }),
    (err) => err.code === 'unauthenticated',
  );
  await assert.rejects(
    api.listPonds({ uid: '   ' }),
    (err) => err.code === 'unauthenticated',
  );

  // Non-existent user doc throws permission-denied
  await assert.rejects(
    api.listPonds({ uid: 'non-existent-user' }),
    (err) => err.code === 'permission-denied' && err.message.includes('User profile not found'),
  );

  // User without company throws permission-denied
  const fixtureOrphan = createStandardFarmFixture();
  fixtureOrphan.users['user-orphan'] = { role: 'technician' };
  const apiOrphan = createReadOnlyFarmApi({ db: buildMockDb(fixtureOrphan) });
  await assert.rejects(
    apiOrphan.listPonds({ uid: 'user-orphan' }),
    (err) => err.code === 'permission-denied' && err.message.includes('not associated with a valid company'),
  );

  // Caller cannot specify another company
  await assert.rejects(
    api.listPonds({ uid: 'tech-1', companyId: 'other-farm' }),
    (err) => err.code === 'permission-denied' && err.message.includes('do not have access to this company'),
  );

  // User document company link changed (owner transferred/left)
  const fixtureTransferred = createStandardFarmFixture();
  fixtureTransferred.users['owner-1'].companyId = 'new-company';
  fixtureTransferred.companies['new-company'] = { ownerId: 'other', teamMembers: [] };
  const apiTransferred = createReadOnlyFarmApi({ db: buildMockDb(fixtureTransferred) });
  await assert.rejects(
    apiTransferred.listPonds({ uid: 'owner-1', companyId: 'farm-std' }),
    (err) => err.code === 'permission-denied',
  );

  // A stale owner role and old team membership cannot survive a current owner transfer.
  const fixtureOwnerTransferred = createStandardFarmFixture();
  fixtureOwnerTransferred.companies['farm-std'].ownerId = 'new-owner';
  const apiOwnerTransferred = createReadOnlyFarmApi({ db: buildMockDb(fixtureOwnerTransferred) });
  await assert.rejects(
    apiOwnerTransferred.listPonds({ uid: 'owner-1' }),
    (err) => err.code === 'permission-denied',
  );

  // Role without viewFarm (buyer) throws permission-denied
  await assert.rejects(
    api.listPonds({ uid: 'buyer-1' }),
    (err) => err.code === 'permission-denied' && err.message.includes('do not have permission'),
  );

  // Technician with permissionOverride viewFarm: false throws permission-denied
  await assert.rejects(
    api.listPonds({ uid: 'tech-no-farm' }),
    (err) => err.code === 'permission-denied' && err.message.includes('do not have permission'),
  );

  // Authorized roles succeed
  const mgrResult = await api.listPonds({ uid: 'mgr-1' });
  assert.equal(mgrResult.items.length, 1);
  const ownerResult = await api.listPonds({ uid: 'owner-1' });
  assert.equal(ownerResult.items.length, 1);
  const techResult = await api.listPonds({ uid: 'tech-1' });
  assert.equal(techResult.items.length, 1);
});

test('enterprise scoping: enterprise technicians restricted to assigned blocks; inaccessible ponds return 404', async () => {
  const db = buildMockDb(createEnterpriseFarmFixture());
  const api = createReadOnlyFarmApi({ db });

  // Tech A has access only to block-alpha (pond-a1, pond-a2)
  const techAResult = await api.listPonds({ uid: 'tech-a' });
  assert.equal(techAResult.items.length, 2);
  const techAPondIds = techAResult.items.map((p) => p.id).sort();
  assert.deepEqual(techAPondIds, ['pond-a1', 'pond-a2']);

  // Tech B has access only to block-beta (pond-b1)
  const techBResult = await api.listPonds({ uid: 'tech-b' });
  assert.equal(techBResult.items.length, 1);
  assert.equal(techBResult.items[0].id, 'pond-b1');

  // Unassigned enterprise technician sees 0 ponds
  const unassignedResult = await api.listPonds({ uid: 'unassigned-tech' });
  assert.equal(unassignedResult.items.length, 0);

  // Enterprise technician accessing pond outside scope returns 404 (not 403, preventing enumeration)
  await assert.rejects(
    api.getPondSummary({ uid: 'tech-a', pondId: 'pond-b1' }),
    (err) => err.code === 'not-found' && err.message.includes('Pond not found'),
  );

  await assert.rejects(
    api.getWaterQualityRecords({
      uid: 'tech-a',
      pondId: 'pond-b1',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    }),
    (err) => err.code === 'not-found',
  );

  await assert.rejects(
    api.getFeedSummary({
      uid: 'tech-a',
      pondId: 'pond-b1',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    }),
    (err) => err.code === 'not-found',
  );
});

test('feed records & summary: uses canonical selectDailyFeedEntries, prevents isExplicitZero overriding positive total, excludes sampling.feed', async () => {
  const fixture = createStandardFarmFixture();
  fixture.ponds['farm-std']['pond-1'].samplings = [
    {
      id: 'd1',
      date: '2026-09-01',
      phMorning: 7.8,
      doMorning: 5.5,
      feedData: { totalDailyFeed: 25 },
    },
    {
      id: 'd2',
      date: '2026-09-02',
      phMorning: 7.9,
      // explicit zero feed
      feedData: { totalDailyFeed: 0, isExplicitZero: true },
    },
    {
      id: 'd3',
      date: '2026-09-03',
      // water quality only, no feedData
      phMorning: 8.0,
      doMorning: 4.8,
    },
    {
      id: 'd4',
      date: '2026-09-04',
      // biological sampling feed ONLY (MUST NEVER BE USED AS REAL DAILY FEED)
      feed: 35,
    },
    {
      id: 'd5-conflict',
      date: '2026-09-05',
      // Positive total MUST NOT be overridden by isExplicitZero: true
      feedData: { totalDailyFeedKg: 50, isExplicitZero: true },
    },
  ];

  const db = buildMockDb(fixture);
  const api = createReadOnlyFarmApi({ db });

  // Feed summary query: should ONLY return d1, d2, and d5 (strictly ignoring d4 with sampling.feed)
  const feedRes = await api.getFeedSummary({
    uid: 'tech-1',
    pondId: 'pond-1',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
  });

  assert.equal(feedRes.items.length, 3, 'Must only include records with real feedData');
  assert.equal(feedRes.unit, 'kg');
  assert.equal(feedRes.totalFeedKg, 75); // 25 + 0 + 50
  assert.equal(feedRes.dataCoverage.requestedDays, 5);
  assert.equal(feedRes.dataCoverage.recordedDays, 3);
  assert.equal(feedRes.dataCoverage.explicitZeroDays, 1);

  // d5 has positive feed 50 and isExplicitZero is false
  const d5Feed = feedRes.items.find((i) => i.date === '2026-09-05');
  assert.equal(d5Feed.feedKg, 50);
  assert.equal(d5Feed.isExplicitZero, false);

  // Preserves explicit zero feed on d2
  const d2Feed = feedRes.items.find((i) => i.date === '2026-09-02');
  assert.equal(d2Feed.feedKg, 0);
  assert.equal(d2Feed.isExplicitZero, true);

  // Verify extractRealDailyFeed directly ignores sampling.feed
  const biologicalOnly = extractRealDailyFeed({ id: 'bio-1', date: '2026-09-04', feed: 50 });
  assert.equal(biologicalOnly.hasFeed, false);
  assert.equal(biologicalOnly.feedKg, null);
  assert.equal(hasFeedData({ feed: 50 }), false);

  const realDailyFeed = extractRealDailyFeed({
    feedData: { totalDailyFeedKg: 42.5 },
  });
  assert.equal(realDailyFeed.hasFeed, true);
  assert.equal(realDailyFeed.feedKg, 42.5);
  assert.equal(realDailyFeed.isExplicitZero, false);
});

test('feed parsing: direct zero outranks allocations and feedData measurement time selects the farm-local day', async () => {
  const fixture = createStandardFarmFixture();
  fixture.ponds['farm-std']['pond-1'].samplings = [
    {
      id: 'feed-zero-wins',
      date: '2026-09-01',
      feedData: {
        totalDailyFeedKg: 0,
        feedAllocations: [{ quantityKg: 12 }],
        measuredAt: '2026-09-02T04:00:00.000Z',
      },
    },
  ];
  const api = createReadOnlyFarmApi({ db: buildMockDb(fixture) });
  const result = await api.getFeedSummary({
    uid: 'tech-1',
    pondId: 'pond-1',
    startDate: '2026-09-02',
    endDate: '2026-09-02',
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].date, '2026-09-02');
  assert.equal(result.items[0].feedKg, 0);
  assert.equal(result.items[0].isExplicitZero, true);
  assert.equal(result.totalFeedKg, 0);
});

test('water history pagination uses offsets for duplicate source IDs and counts days separately from observations', async () => {
  const fixture = createStandardFarmFixture();
  fixture.ponds['farm-std']['pond-1'].samplings = [
    { id: 'duplicate-id', date: '2026-09-01', measuredAt: '2026-09-01T08:00:00Z', phMorning: 7.1 },
    { id: 'duplicate-id', date: '2026-09-01', measuredAt: '2026-09-01T12:00:00Z', phMorning: 7.2 },
    { id: 'duplicate-id', date: '2026-09-01', measuredAt: '2026-09-01T16:00:00Z', phMorning: 7.3 },
  ];
  const api = createReadOnlyFarmApi({ db: buildMockDb(fixture) });
  const first = await api.getWaterQualityRecords({
    uid: 'tech-1', pondId: 'pond-1', startDate: '2026-09-01', endDate: '2026-09-01', limit: 1,
  });
  assert.equal(first.items.length, 1);
  assert.equal(first.hasMore, true);
  assert.equal(first.dataCoverage.recordedDays, 1);
  assert.equal(first.dataCoverage.observationCount, 3);

  const second = await api.getWaterQualityRecords({
    uid: 'tech-1', pondId: 'pond-1', startDate: '2026-09-01', endDate: '2026-09-01', limit: 1,
    cursor: first.nextCursor,
  });
  assert.equal(second.items.length, 1);
  assert.notEqual(second.items[0].phMorning, first.items[0].phMorning);
  assert.equal(second.hasMore, true);

  const third = await api.getWaterQualityRecords({
    uid: 'tech-1', pondId: 'pond-1', startDate: '2026-09-01', endDate: '2026-09-01', limit: 1,
    cursor: second.nextCursor,
  });
  assert.equal(third.items.length, 1);
  assert.notEqual(third.items[0].phMorning, second.items[0].phMorning);
  assert.equal(third.hasMore, false);
});

test('biological calculations: AGENTS MBW rule verifies valid lookback, initialWeight, and 0.5g default fallback with mbwSource', async () => {
  const fixture = createStandardFarmFixture();

  // Case 1: Valid sampling MBW exists
  fixture.ponds['farm-std']['pond-mbw-1'] = {
    id: 'pond-mbw-1',
    pondName: 'MBW Test Pond 1',
    initialWeight: 1.2,
    samplings: [
      { id: 's1', date: '2026-09-01', mbw: 3.5 },
      { id: 's2', date: '2026-09-05', mbw: 0 }, // invalid 0 mbw
    ],
  };

  // Case 2: No valid sampling MBW, but initialWeight exists
  fixture.ponds['farm-std']['pond-mbw-2'] = {
    id: 'pond-mbw-2',
    pondName: 'MBW Test Pond 2',
    initialWeight: 1.5,
    samplings: [
      { id: 's3', date: '2026-09-01', mbw: 0 },
    ],
  };

  // Case 3: No valid sampling MBW and no initialWeight -> default fallback 0.5g
  fixture.ponds['farm-std']['pond-mbw-3'] = {
    id: 'pond-mbw-3',
    pondName: 'MBW Test Pond 3',
    samplings: [],
  };

  const db = buildMockDb(fixture);
  const api = createReadOnlyFarmApi({ db });

  const p1 = await api.getPondSummary({ uid: 'tech-1', pondId: 'pond-mbw-1' });
  assert.equal(p1.currentMbw, 3.5);
  assert.equal(p1.mbwSource, 'sampling');

  const p2 = await api.getPondSummary({ uid: 'tech-1', pondId: 'pond-mbw-2' });
  assert.equal(p2.currentMbw, 1.5);
  assert.equal(p2.mbwSource, 'initialWeight');

  const p3 = await api.getPondSummary({ uid: 'tech-1', pondId: 'pond-mbw-3' });
  assert.equal(p3.currentMbw, 0.5);
  assert.equal(p3.mbwSource, 'default_fallback');
});

test('date validation: requires explicit startDate and endDate, rejects invalid ranges, caps window to 90 days', async () => {
  const db = buildMockDb(createStandardFarmFixture());
  const api = createReadOnlyFarmApi({ db });

  // Missing startDate
  await assert.rejects(
    api.getWaterQualityRecords({
      uid: 'tech-1',
      pondId: 'pond-1',
      endDate: '2026-09-05',
    }),
    (err) => err.code === 'invalid-argument' && err.message.includes('startDate is required'),
  );

  // Missing endDate
  await assert.rejects(
    api.getWaterQualityRecords({
      uid: 'tech-1',
      pondId: 'pond-1',
      startDate: '2026-09-01',
    }),
    (err) => err.code === 'invalid-argument' && err.message.includes('endDate is required'),
  );

  // Invalid date format
  await assert.rejects(
    api.getWaterQualityRecords({
      uid: 'tech-1',
      pondId: 'pond-1',
      startDate: 'not-a-date',
      endDate: '2026-09-05',
    }),
    (err) => err.code === 'invalid-argument',
  );

  // Inverted date range
  await assert.rejects(
    api.getWaterQualityRecords({
      uid: 'tech-1',
      pondId: 'pond-1',
      startDate: '2026-09-10',
      endDate: '2026-09-01',
    }),
    (err) => err.code === 'invalid-argument' && err.message.includes('startDate cannot be after endDate'),
  );

  // Window exceeding 90 days
  await assert.rejects(
    api.getWaterQualityRecords({
      uid: 'tech-1',
      pondId: 'pond-1',
      startDate: '2026-01-01',
      endDate: '2026-04-10', // > 90 days
    }),
    (err) => err.code === 'invalid-argument' && err.message.includes('exceeds maximum allowed window of 90 days'),
  );

  // Valid 90 day window passes
  const validRes = await api.getWaterQualityRecords({
    uid: 'tech-1',
    pondId: 'pond-1',
    startDate: '2026-06-01',
    endDate: '2026-08-29', // 90 days
  });
  assert.ok(validRes);
  assert.equal(validRes.dataCoverage.requestedDays, 90);
});

test('cursor revision 2 & security: requires all context fields and maps stale digest to aborted', () => {
  assert.equal(CURRENT_CURSOR_REVISION, 2);
  const digest = computeSamplingsDigest([{ id: 's1', date: '2026-09-01' }]);

  const validToken = encodeCursor({
    id: 's1',
    revision: CURRENT_CURSOR_REVISION,
    route: 'water-quality',
    order: 'date_id',
    uid: 'user-1',
    companyId: 'farm-1',
    pondId: 'pond-1',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    digest,
    offset: 1,
  });

  // Valid decode
  const decoded = decodeCursor(validToken, {
    route: 'water-quality',
    order: 'date_id',
    uid: 'user-1',
    companyId: 'farm-1',
    pondId: 'pond-1',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    digest,
  });
  assert.equal(decoded.id, 's1');
  assert.equal(decoded.revision, 2);

  // User mismatch
  assert.throws(
    () =>
      decodeCursor(validToken, {
        route: 'water-quality',
        order: 'date_id',
        uid: 'attacker-user',
        companyId: 'farm-1',
        pondId: 'pond-1',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        digest,
      }),
    (err) => err.code === 'invalid-argument' && err.message.includes('uid is missing or does not match'),
  );

  // Company mismatch
  assert.throws(
    () =>
      decodeCursor(validToken, {
        route: 'water-quality',
        order: 'date_id',
        uid: 'user-1',
        companyId: 'other-farm',
        pondId: 'pond-1',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        digest,
      }),
    (err) => err.code === 'invalid-argument' && err.message.includes('companyId is missing or does not match'),
  );

  // Pond mismatch
  assert.throws(
    () =>
      decodeCursor(validToken, {
        route: 'water-quality',
        order: 'date_id',
        uid: 'user-1',
        companyId: 'farm-1',
        pondId: 'other-pond',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        digest,
      }),
    (err) => err.code === 'invalid-argument' && err.message.includes('pondId is missing or does not match'),
  );

  // Filter mismatch (different startDate)
  assert.throws(
    () =>
      decodeCursor(validToken, {
        route: 'water-quality',
        order: 'date_id',
        uid: 'user-1',
        companyId: 'farm-1',
        pondId: 'pond-1',
        startDate: '2026-09-02',
        endDate: '2026-09-10',
        digest,
      }),
    (err) => err.code === 'invalid-argument' && err.message.includes('Cursor filter mismatch'),
  );

  // Stale cursor (digest changed) -> throws aborted (mapped to 409)
  const modifiedDigest = computeSamplingsDigest([
    { id: 's1', date: '2026-09-01' },
    { id: 's2', date: '2026-09-02' },
  ]);
  assert.throws(
    () =>
      decodeCursor(validToken, {
        route: 'water-quality',
        order: 'date_id',
        uid: 'user-1',
        companyId: 'farm-1',
        pondId: 'pond-1',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        digest: modifiedDigest,
      }),
    (err) => err.code === 'aborted' && err.message.includes('Cursor is stale'),
  );

  // Unsupported old cursor revision 1
  const oldToken = encodeCursor({ id: 'p1', revision: 1, route: 'ponds', order: '__name__' });
  assert.throws(
    () => decodeCursor(oldToken, { route: 'ponds', order: '__name__' }),
    (err) => err.code === 'invalid-argument' && err.message.includes('Unsupported cursor revision: 1'),
  );
});

test('DTO: excludes operationalNotes and inventoryFeedId; generates deterministic stable record IDs', () => {
  const rawSampling = {
    date: '2026-09-01',
    phMorning: '7.854',
    phEvening: '8.216',
    doMorning: '5.555',
    salinity: '25.0',
    temperature: '29.4',
    operationalNotes: 'Private note content',
    secretKey: 'leak',
  };

  const waterDto = toWaterQualityRecordDto(rawSampling, 'pond-test');
  assert.equal(waterDto.phMorning, 7.85);
  assert.equal(waterDto.doMorning, 5.56);
  assert.equal(waterDto.operationalNotes, undefined, 'Must exclude operationalNotes from water quality DTO');
  assert.equal(waterDto.secretKey, undefined);
  assert.ok(waterDto.id.startsWith('2026-09-01-'));

  // Deterministic stable IDs
  const id1 = getDeterministicRecordId(rawSampling, 'pond-test', 0);
  const id2 = getDeterministicRecordId(rawSampling, 'pond-test', 0);
  assert.equal(id1, id2, 'Fallback IDs must be deterministic and stable for same snapshot');

  const rawFeedSampling = {
    date: '2026-09-01',
    feedData: {
      totalDailyFeed: '45.678',
      feedingResponse: 'vigorous',
      inventoryFeedId: 'feed-stock-private',
    },
  };

  const feedDto = toFeedRecordDto(rawFeedSampling, 'pond-test');
  assert.equal(feedDto.feedKg, 45.68);
  assert.equal(feedDto.inventoryFeedId, undefined, 'Must exclude inventoryFeedId from feed DTO');
});

test('backend-error behavior: handles and wraps unexpected Firestore errors with fixed safe messages', async () => {
  const dbTimeout = buildMockDb(createStandardFarmFixture(), {
    failOn: 'users/tech-1',
    failCode: 'unavailable',
  });
  const apiTimeout = createReadOnlyFarmApi({ db: dbTimeout });

  await assert.rejects(
    apiTimeout.listPonds({ uid: 'tech-1' }),
    (err) => err.code === 'unavailable' && err.message === 'Backend database service is temporarily unavailable.',
  );

  const dbInternal = buildMockDb(createStandardFarmFixture(), {
    failOn: 'users/tech-1',
    failCode: null,
  });
  const apiInternal = createReadOnlyFarmApi({ db: dbInternal });

  await assert.rejects(
    apiInternal.listPonds({ uid: 'tech-1' }),
    (err) => err.code === 'internal' && err.message === 'An unexpected backend database error occurred.',
  );
});

test('service instantiation: supports createReadOnlyFarmApi factory, ReadOnlyFarmApi class, and direct functions', async () => {
  const db = buildMockDb(createStandardFarmFixture());

  const apiFactory = createReadOnlyFarmApi({ db });
  assert.ok(typeof apiFactory.listPonds === 'function');
  assert.ok(typeof apiFactory.getPondSummary === 'function');
  assert.ok(typeof apiFactory.getWaterQualityRecords === 'function');
  assert.ok(typeof apiFactory.getFeedSummary === 'function');

  const apiClass = new ReadOnlyFarmApi({ db });
  const classList = await apiClass.listPonds({ uid: 'tech-1' });
  assert.equal(classList.items.length, 1);

  const directList = await listPonds({ db, uid: 'tech-1' });
  assert.equal(directList.items.length, 1);

  assert.throws(() => createReadOnlyFarmApi(), /requires a Firestore db instance/);
  assert.throws(() => new ReadOnlyFarmApi(), /requires a Firestore db instance/);
});

test('decision input baseline fixtures: cross-company isolation, strict finance omission, null preservation for unmeasured water/feed, and read-path gaps', async () => {
  const farmWithFinanceAndMissingData = {
    companies: {
      'company-a': {
        name: 'Company A Farm',
        ownerId: 'owner-a',
        teamMembers: ['owner-a', 'tech-a'],
        businessSize: 'enterprise',
        timeZone: 'UTC',
      },
      'company-b': {
        name: 'Company B Farm',
        ownerId: 'owner-b',
        teamMembers: ['owner-b'],
        businessSize: 'standard',
        timeZone: 'UTC',
      },
    },
    users: {
      'owner-a': { role: 'owner', companyId: 'company-a' },
      'tech-a': { role: 'technician', companyId: 'company-a' },
      'owner-b': { role: 'owner', companyId: 'company-b' },
    },
    blocks: {
      'company-a': {
        'blk-1': { name: 'Block 1', assignedTechnicianId: 'tech-a' },
        'blk-2': { name: 'Block 2', assignedTechnicianId: 'other-tech' },
      },
    },
    ponds: {
      'company-a': {
        'pond-1': {
          pondName: 'Pond 1',
          blockId: 'blk-1',
          pondArea: 1000,
          cycleStatus: 'active',
          initialWeight: 1.2,
          feedCost: 55000,
          seedCost: 8000,
          revenue: 120000,
          secretBillingToken: 'leak-test-123',
          samplings: [
            {
              id: 'samp-1',
              date: '2026-09-01',
              measuredAt: '2026-09-01T08:00:00Z',
              mbw: 4.5,
              phMorning: 7.8,
              phEvening: null,
              doMorning: null,
              doEvening: 6.2,
              salinity: 25,
              cost: 150,
              price: 20,
              feedData: {
                totalDailyFeed: 50,
                feedingResponse: 'good',
                inventoryFeedId: 'inv-feed-abc',
                costPerKg: 1.5,
              },
            },
            {
              id: 'samp-2',
              date: '2026-09-02',
              measuredAt: '2026-09-02T08:00:00Z',
              mbw: null,
              phMorning: 8.0,
              doMorning: 5.5,
              feedData: {
                totalDailyFeed: 0,
                isExplicitZero: true,
              },
            },
            {
              id: 'samp-3',
              date: '2026-09-03',
              measuredAt: '2026-09-03T08:00:00Z',
              phMorning: 8.1,
              doMorning: 5.4,
            },
          ],
        },
        'pond-2': {
          pondName: 'Pond 2 (Unassigned Block)',
          blockId: 'blk-2',
          cycleStatus: 'active',
        },
        'pond-fallback': {
          pondName: 'Pond Fallback',
          blockId: 'blk-1',
          cycleStatus: 'active',
          samplings: [],
        },
      },
      'company-b': {
        'pond-b1': {
          pondName: 'Company B Pond',
          blockId: 'blk-b',
          cycleStatus: 'active',
        },
      },
    },
  };

  const db = buildMockDb(farmWithFinanceAndMissingData);
  const api = createReadOnlyFarmApi({ db });

  // 1. Cross-company isolation
  await assert.rejects(
    api.getPondSummary({ uid: 'owner-b', pondId: 'pond-1' }),
    (err) => err.code === 'not-found',
    'Cannot access pond across companies (derived company lookup finds nothing)',
  );
  await assert.rejects(
    api.getPondSummary({ uid: 'owner-b', companyId: 'company-a', pondId: 'pond-1' }),
    (err) => err.code === 'permission-denied' && err.message.includes('You do not have access to this company.'),
    'Cannot spoof foreign companyId',
  );

  // Enterprise block scoping isolation: tech-a cannot access pond-2 in unassigned blk-2
  await assert.rejects(
    api.getPondSummary({ uid: 'tech-a', pondId: 'pond-2' }),
    (err) => err.code === 'not-found',
    'Enterprise technician receives 404 for unassigned block pond (no existence leakage)',
  );

  // 2. Finance data isolation & omission
  const summary = await api.getPondSummary({ uid: 'owner-a', pondId: 'pond-1' });
  assert.equal(summary.feedCost, undefined, 'feedCost must never exist in PondSummaryDto');
  assert.equal(summary.seedCost, undefined, 'seedCost must never exist in PondSummaryDto');
  assert.equal(summary.revenue, undefined, 'revenue must never exist in PondSummaryDto');
  assert.equal(summary.secretBillingToken, undefined, 'private tokens must never exist in PondSummaryDto');

  const wqResult = await api.getWaterQualityRecords({
    uid: 'owner-a',
    pondId: 'pond-1',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
  });
  assert.equal(wqResult.items.length, 3);
  for (const item of wqResult.items) {
    assert.equal(item.cost, undefined, 'Water quality DTO must omit cost');
    assert.equal(item.price, undefined, 'Water quality DTO must omit price');
  }

  const feedResult = await api.getFeedSummary({
    uid: 'owner-a',
    pondId: 'pond-1',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
  });
  for (const item of feedResult.items) {
    assert.equal(item.inventoryFeedId, undefined, 'Feed DTO must omit inventoryFeedId');
    assert.equal(item.costPerKg, undefined, 'Feed DTO must omit costPerKg');
  }

  // 3. Null preservation (no synthetic business results)
  const samp1Wq = wqResult.items.find((it) => it.date === '2026-09-01');
  assert.equal(samp1Wq.phEvening, null, 'Unmeasured phEvening must remain null');
  assert.equal(samp1Wq.doMorning, null, 'Unmeasured doMorning must remain null');
  assert.equal(samp1Wq.doEvening, 6.2, 'Measured doEvening is preserved');

  const samp2Feed = feedResult.items.find((it) => it.date === '2026-09-02');
  assert.equal(samp2Feed.feedKg, 0, 'Explicit zero feed is preserved as 0');
  assert.equal(samp2Feed.isExplicitZero, true);

  const samp3Feed = feedResult.items.find((it) => it.date === '2026-09-03');
  assert.equal(samp3Feed, undefined, 'Day without feedData must not generate a synthetic 0kg feed entry');

  // MBW look-back fallback hierarchy
  assert.equal(summary.currentMbw, 4.5, 'Look-back finds valid non-zero MBW from previous sampling');
  assert.equal(summary.mbwSource, 'sampling');

  const fallbackSummary = await api.getPondSummary({ uid: 'owner-a', pondId: 'pond-fallback' });
  assert.equal(fallbackSummary.currentMbw, 0.5, 'Fallback MBW is exactly 0.5g');
  assert.equal(fallbackSummary.mbwSource, 'default_fallback');
  assert.equal(fallbackSummary.totalSamplings, 0, 'No synthetic sampling record was created');

  // 4. Exposed read-path gaps
  assert.equal(summary.mortalityCount, undefined, 'Read-only API does not provide mortality records');
  assert.equal(summary.cumulativeMortality, undefined, 'Read-only API does not calculate cumulative mortality');

  await assert.rejects(
    api.getWaterQualityRecords({
      uid: 'owner-a',
      pondId: 'pond-1',
      startDate: '2026-01-01',
      endDate: '2026-05-01',
    }),
    (err) => err.code === 'invalid-argument' && err.message.includes('90 days'),
    'Exposes read-path limitation: max 90 day query window',
  );
});
