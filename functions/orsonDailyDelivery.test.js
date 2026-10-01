const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveCompanyTimeZone,
  getCalendarDayKey,
  getLocalCalendarHour,
  isCompanyDailyDue,
  getNotificationDocId,
  createNotificationIfAbsent,
  acquireDeliveryLease,
  buildNotificationManifest,
  deliverCompanyDailyNotifications,
  runDailySupervisorDelivery,
} = require('./orsonDailyDelivery');
const { farmDateKey } = require('./farmDate');

// Test 1: IANA timezone validation & UTC fallback
test('validate IANA time zone and record UTC fallback', () => {
  const jakarta = resolveCompanyTimeZone({ timeZone: 'Asia/Jakarta' });
  assert.equal(jakarta.timeZone, 'Asia/Jakarta');
  assert.equal(jakarta.usedUtcFallback, false);

  const ny = resolveCompanyTimeZone({ timezone: 'America/New_York' });
  assert.equal(ny.timeZone, 'America/New_York');
  assert.equal(ny.usedUtcFallback, false);

  const invalid = resolveCompanyTimeZone({ timeZone: 'Invalid/Mars_Zone' });
  assert.equal(invalid.timeZone, 'UTC');
  assert.equal(invalid.usedUtcFallback, true);

  const empty = resolveCompanyTimeZone({});
  assert.equal(empty.timeZone, 'UTC');
  assert.equal(empty.usedUtcFallback, true);

  const directString = resolveCompanyTimeZone('Europe/London');
  assert.equal(directString.timeZone, 'Europe/London');
  assert.equal(directString.usedUtcFallback, false);
});

// Test 2: Due-time rules at 06:00 local calendar boundary
test('due-time calculation boundary at 06:00 local time', () => {
  // Asia/Jakarta is UTC+7
  // 2026-10-01T22:59:59Z in UTC is 2026-10-02 05:59:59 in Jakarta
  const justBeforeDue = new Date('2026-10-01T22:59:59.000Z');
  const beforeResult = isCompanyDailyDue('Asia/Jakarta', justBeforeDue, 6);
  assert.equal(beforeResult.isDue, false);
  assert.equal(beforeResult.localHour, 5);
  assert.equal(beforeResult.dayKey, '2026-10-02');
  assert.equal(beforeResult.reason, 'before_due_hour');

  // 2026-10-01T23:00:00Z in UTC is exactly 2026-10-02 06:00:00 in Jakarta
  const exactlyDue = new Date('2026-10-01T23:00:00.000Z');
  const dueResult = isCompanyDailyDue('Asia/Jakarta', exactlyDue, 6);
  assert.equal(dueResult.isDue, true);
  assert.equal(dueResult.localHour, 6);
  assert.equal(dueResult.dayKey, '2026-10-02');
  assert.equal(dueResult.reason, 'due');

  // Afternoon in Jakarta: 2026-10-02T07:00:00Z is 14:00:00 Jakarta
  const afternoon = new Date('2026-10-02T07:00:00.000Z');
  const afternoonResult = isCompanyDailyDue('Asia/Jakarta', afternoon, 6);
  assert.equal(afternoonResult.isDue, true);
  assert.equal(afternoonResult.localHour, 14);
  assert.equal(afternoonResult.dayKey, '2026-10-02');
});

// Test 3: Separate 03:00 operational rollover vs 06:00 daily delivery
test('preserves separate 03:00 operational rollover while delivery is at 06:00', () => {
  // Asia/Jakarta is UTC+7
  // At 02:30 Jakarta time (UTC 2026-10-01T19:30:00Z):
  const at0230 = new Date('2026-10-01T19:30:00.000Z');
  // Operational rollover is at 03:00, so operational day is still 2026-10-01!
  assert.equal(farmDateKey('Asia/Jakarta', at0230, 3), '2026-10-01');
  // Delivery is not due (local hour is 2 < 6)
  const delivery0230 = isCompanyDailyDue('Asia/Jakarta', at0230, 6);
  assert.equal(delivery0230.isDue, false);
  assert.equal(delivery0230.dayKey, '2026-10-02'); // calendar day is 2nd

  // At 04:30 Jakarta time (UTC 2026-10-01T21:30:00Z):
  const at0430 = new Date('2026-10-01T21:30:00.000Z');
  // Operational day has rolled over to 2026-10-02 at 03:00
  assert.equal(farmDateKey('Asia/Jakarta', at0430, 3), '2026-10-02');
  // But delivery is STILL not due (local hour is 4 < 6)
  const delivery0430 = isCompanyDailyDue('Asia/Jakarta', at0430, 6);
  assert.equal(delivery0430.isDue, false);

  // At 06:30 Jakarta time (UTC 2026-10-01T23:30:00Z):
  const at0630 = new Date('2026-10-01T23:30:00.000Z');
  assert.equal(farmDateKey('Asia/Jakarta', at0630, 3), '2026-10-02');
  // Delivery IS due!
  const delivery0630 = isCompanyDailyDue('Asia/Jakarta', at0630, 6);
  assert.equal(delivery0630.isDue, true);
});

// Test 4: Daylight Saving Time handling in IANA zone
test('handles daylight saving time transitions accurately', () => {
  // America/New_York
  // Winter (EST, UTC-5): UTC 11:00 is 06:00 EST
  const winter = new Date('2026-01-15T11:00:00.000Z');
  const winterResult = isCompanyDailyDue('America/New_York', winter, 6);
  assert.equal(winterResult.localHour, 6);
  assert.equal(winterResult.isDue, true);
  assert.equal(winterResult.dayKey, '2026-01-15');

  // Summer (EDT, UTC-4): UTC 10:00 is 06:00 EDT
  const summer = new Date('2026-07-15T10:00:00.000Z');
  const summerResult = isCompanyDailyDue('America/New_York', summer, 6);
  assert.equal(summerResult.localHour, 6);
  assert.equal(summerResult.isDue, true);
  assert.equal(summerResult.dayKey, '2026-07-15');

  // Australia/Melbourne ends daylight saving on the local 2026-04-05 transition.
  const melbourneBefore = isCompanyDailyDue('Australia/Melbourne', new Date('2026-04-04T19:59:00Z'), 6);
  assert.equal(melbourneBefore.localHour, 5);
  assert.equal(melbourneBefore.isDue, false);
  const melbourneAfter = isCompanyDailyDue('Australia/Melbourne', new Date('2026-04-04T20:00:00Z'), 6);
  assert.equal(melbourneAfter.localHour, 6);
  assert.equal(melbourneAfter.dayKey, '2026-04-05');
  assert.equal(melbourneAfter.isDue, true);

  const melbourneWinter = isCompanyDailyDue('Australia/Melbourne', new Date('2026-07-15T20:00:00Z'), 6);
  assert.equal(melbourneWinter.localHour, 6);
  assert.equal(melbourneWinter.dayKey, '2026-07-16');
  assert.equal(melbourneWinter.isDue, true);
});

test('calendar day follows local date on the UTC-west side of midnight', () => {
  const afterUtcMidnight = new Date('2026-10-01T02:00:00Z');
  assert.equal(getCalendarDayKey('America/Los_Angeles', afterUtcMidnight), '2026-09-30');
  const dueForLocalDay = isCompanyDailyDue('America/Los_Angeles', new Date('2026-10-01T13:00:00Z'), 6);
  assert.equal(dueForLocalDay.dayKey, '2026-10-01');
  assert.equal(dueForLocalDay.isDue, true);
});

// Test helper: in-memory mock Firestore
const createMockFirestore = () => {
  const store = new Map();
  const getDocData = (path) => store.get(path);
  const setDocData = (path, data) => store.set(path, structuredClone(data));

  const makeDocRef = (path) => ({
    path,
    id: path.split('/').pop(),
    get: async () => {
      const data = getDocData(path);
      return { exists: data !== undefined, data: () => structuredClone(data), id: path.split('/').pop() };
    },
    set: async (val, opts = {}) => {
      if (opts.merge && store.has(path)) {
        setDocData(path, { ...getDocData(path), ...val });
      } else {
        setDocData(path, val);
      }
    },
    update: async (val) => {
      if (!store.has(path)) throw new Error('Document does not exist');
      setDocData(path, { ...getDocData(path), ...val });
    },
    collection: (subCollName) => makeCollectionRef(`${path}/${subCollName}`),
  });

  const makeQuery = (collPath, filters = [], orders = [], limitCount = Infinity, cursor = null) => {
    const query = {
      where: (field, operator, value) => makeQuery(collPath, [...filters, { field, operator, value }], orders, limitCount, cursor),
      orderBy: (field, direction = 'asc') => makeQuery(collPath, filters, [...orders, { field, direction }], limitCount, cursor),
      limit: (value) => makeQuery(collPath, filters, orders, value, cursor),
      startAfter: (value) => makeQuery(collPath, filters, orders, limitCount, value),
      get: async () => {
        const prefix = `${collPath}/`;
        let docs = [];
        for (const [path, data] of store.entries()) {
          if (path.startsWith(prefix) && path.slice(prefix.length).indexOf('/') === -1) {
            const id = path.slice(prefix.length);
            docs.push({ id, data: () => structuredClone(data), ref: makeDocRef(path), _data: data });
          }
        }
        docs = docs.filter((doc) => filters.every(({ field, operator, value }) => {
          const actual = typeof field === 'string' ? doc._data?.[field] : doc.id;
          if (operator === '==') return actual === value;
          if (operator === '<=') return actual != null && actual <= value;
          if (operator === 'in') return Array.isArray(value) && value.includes(actual);
          return false;
        }));
        docs.sort((a, b) => {
          for (const { field, direction } of orders) {
            const av = typeof field === 'string' ? a._data?.[field] : a.id;
            const bv = typeof field === 'string' ? b._data?.[field] : b.id;
            const compared = av === bv ? 0 : (av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1);
            if (compared) return direction === 'desc' ? -compared : compared;
          }
          return a.id.localeCompare(b.id);
        });
        const cursorId = typeof cursor === 'string' ? cursor : cursor?.id;
        if (cursorId) {
          const cursorIndex = docs.findIndex((doc) => doc.id === cursorId);
          if (cursorIndex >= 0) docs = docs.slice(cursorIndex + 1);
        }
        return { docs: docs.slice(0, limitCount).map(({ _data, ...doc }) => doc) };
      },
    };
    return query;
  };

  const makeCollectionRef = (collPath) => ({
    doc: (docId) => makeDocRef(`${collPath}/${docId}`),
    where: (field, operator, value) => makeQuery(collPath).where(field, operator, value),
    orderBy: (field, direction = 'asc') => makeQuery(collPath).orderBy(field, direction),
    startAfter: (cursor) => makeQuery(collPath).startAfter(cursor),
  });

  const db = {
    _store: store,
    doc: (docPath) => makeDocRef(docPath),
    collection: (collName) => makeCollectionRef(collName),
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => ref.get(),
        set: (ref, val, opts) => ref.set(val, opts),
        update: (ref, val) => ref.update(val),
      };
      return fn(tx);
    },
  };
  return db;
};

// Test 5: Lease acquisition, active concurrency, expiration, recovery, and completion
test('lease acquisition, generation fencing, expiration recovery, and completion', async () => {
  const db = createMockFirestore();
  const companyId = 'farm-123';
  const dayKey = '2026-10-02';
  const tzInfo = { timeZone: 'Asia/Jakarta', usedUtcFallback: false };
  const now = new Date('2026-10-02T00:00:00Z');

  // 1. Initial acquisition
  const lease1 = await acquireDeliveryLease({
    db,
    companyId,
    dayKey,
    timeZoneInfo: tzInfo,
    leaseOwner: 'worker-1',
    leaseDurationMs: 60_000,
    now,
  });
  assert.equal(lease1.acquired, true);
  assert.equal(lease1.isNew, true);
  assert.equal(lease1.generation, 1);

  // 2. Concurrent worker while active lease is unexpired: rejected
  const lease2 = await acquireDeliveryLease({
    db,
    companyId,
    dayKey,
    timeZoneInfo: tzInfo,
    leaseOwner: 'worker-2',
    leaseDurationMs: 60_000,
    now: new Date('2026-10-02T00:00:30Z'), // 30s later (still valid)
  });
  assert.equal(lease2.acquired, false);
  assert.equal(lease2.reason, 'active_lease');

  // 3. Lease expires after 60s: worker 3 recovers with incremented generation
  const lease3 = await acquireDeliveryLease({
    db,
    companyId,
    dayKey,
    timeZoneInfo: tzInfo,
    leaseOwner: 'worker-3',
    leaseDurationMs: 60_000,
    now: new Date('2026-10-02T00:01:05Z'), // 65s later (expired)
  });
  assert.equal(lease3.acquired, true);
  assert.equal(lease3.recovered, true);
  assert.equal(lease3.generation, 2);

  // 4. Complete the delivery
  await db.collection('companies').doc(companyId).collection('orsonDailyDelivery').doc(dayKey).update({
    status: 'completed',
    deliveredCount: 3,
  });

  // 5. Subsequent attempt after completion: rejected as already completed
  const lease4 = await acquireDeliveryLease({
    db,
    companyId,
    dayKey,
    timeZoneInfo: tzInfo,
    leaseOwner: 'worker-4',
    now: new Date('2026-10-02T00:02:00Z'),
  });
  assert.equal(lease4.acquired, false);
  assert.equal(lease4.reason, 'already_completed');
});

// Test 6: Frozen manifest and create-if-absent notifications
test('frozen manifest and stable create-if-absent notification delivery', async () => {
  const db = createMockFirestore();
  const companyId = 'farm-abc';
  const dayKey = '2026-10-02';

  const manifest = buildNotificationManifest({
    companyId,
    dayKey,
    inventoryForecasts: [
      { itemId: 'feed-1', itemName: 'Shrimp Grow 3', itemType: 'feed', daysLeft: 2, currentStock: 50, avgDailyUsage: 25, unit: 'kg' },
    ],
    nearbyDiseaseReports: [
      { id: 'dis-1', diseaseName: 'WSSV', diseaseType: 'viral', distanceKm: 25, severity: 'critical' },
    ],
    riskSummary: {
      warningFindings: [{ id: 'low_do', title: 'Low DO', summary: 'DO 3.2 mg/L', severity: 'warning', pondId: 'p1', pondName: 'Pond 1' }],
      watchFindings: [],
      biosecurityFindings: [{ id: 'low_do', title: 'Low DO', summary: 'DO 3.2 mg/L', severity: 'warning', pondId: 'p1', pondName: 'Pond 1' }],
    },
  });

  assert.equal(manifest.length, 3);
  assert.equal(manifest[0].type, 'inventory_forecast');
  assert.equal(manifest[1].type, 'orson_biosecurity');
  assert.equal(manifest[2].type, 'orson_daily_brief');

  // Verify deterministic doc IDs
  const id1 = getNotificationDocId(companyId, manifest[0].dedupeKey);
  const id2 = getNotificationDocId(companyId, manifest[0].dedupeKey);
  assert.equal(id1, id2, 'deterministic notification ID is repeatable');

  // Deliver notifications create-if-absent
  let createdCount = 0;
  for (const item of manifest) {
    const docId = getNotificationDocId(companyId, item.dedupeKey);
    const ref = db.collection('notifications').doc(docId);
    const created = await createNotificationIfAbsent(db, ref, item);
    if (created) createdCount++;
  }
  assert.equal(createdCount, 3);

  // Re-running create-if-absent does NOT create duplicates
  let duplicateCount = 0;
  for (const item of manifest) {
    const docId = getNotificationDocId(companyId, item.dedupeKey);
    const ref = db.collection('notifications').doc(docId);
    const created = await createNotificationIfAbsent(db, ref, item);
    if (created) duplicateCount++;
  }
  assert.equal(duplicateCount, 0, 'create-if-absent prevents duplicate notifications');
});

// Test 7: Skip reading farm data when not due or already completed
test('skips reading farm subcollections when not due or already completed', async () => {
  const db = createMockFirestore();
  const companyDoc = {
    id: 'farm-lazy',
    data: () => ({ timeZone: 'Asia/Jakarta' }),
  };

  let readerCalled = false;
  const mockReaders = {
    getCompanyInventoryForecasts: async () => {
      readerCalled = true;
      return [];
    },
  };

  // Case A: Before 06:00 local time
  const earlyMorning = new Date('2026-10-01T21:00:00Z'); // 04:00 AM Jakarta
  const resultEarly = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now: earlyMorning,
    readers: mockReaders,
  });
  assert.equal(resultEarly.status, 'skipped');
  assert.equal(resultEarly.reason, 'before_due_hour');
  assert.equal(readerCalled, false, 'farm reader must not be called when not due');

  // Case B: Exactly at 06:00 local time, delivery completes
  const atDue = new Date('2026-10-01T23:00:00Z'); // 06:00 AM Jakarta (Oct 2)
  const resultDue = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now: atDue,
    readers: mockReaders,
  });
  assert.equal(resultDue.status, 'completed');
  assert.equal(readerCalled, true, 'farm reader called when due');

  // Case C: Subsequent run on same day
  readerCalled = false;
  const resultAgain = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now: new Date('2026-10-02T02:00:00Z'), // 09:00 AM Jakarta (same day)
    readers: mockReaders,
  });
  assert.equal(resultAgain.status, 'skipped');
  assert.equal(resultAgain.reason, 'already_completed');
  assert.equal(readerCalled, false, 'farm reader must not be called when already completed');
});

// Test 8: Durable recurring company pagination across multiple invocations
test('durable company pagination advances cursor across pages, wraps back to start, and cannot strand companies', async () => {
  const db = createMockFirestore();

  // Seed 5 companies: comp-1 to comp-5
  for (let i = 1; i <= 5; i++) {
    const cid = `comp-${i}`;
    await db.collection('companies').doc(cid).set({
      id: cid,
      timeZone: 'Asia/Jakarta',
    });
  }

  const mockReaders = {
    getCompanyInventoryForecasts: async () => [],
    getNearbyActiveDiseaseReports: async () => [],
    getPondRiskSummary: async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }),
  };

  const cursorRef = db.doc('system/orsonDailyDispatcherCursor');
  const batchSize = 2;
  const deliveryTime = new Date('2026-10-01T23:30:00Z'); // 06:30 AM Jakarta (due)

  // Invocation 1: processes comp-1, comp-2
  const run1 = await runDailySupervisorDelivery({
    db,
    now: deliveryTime,
    batchSize,
    cursorRef,
    readers: mockReaders,
  });
  assert.equal(run1.processedCount, 2);
  assert.deepEqual(run1.results.map((r) => r.companyId), ['comp-1', 'comp-2']);
  assert.equal(run1.nextCursorId, 'comp-2');
  assert.equal(run1.wrapped, false);

  // Invocation 2: processes comp-3, comp-4
  const run2 = await runDailySupervisorDelivery({
    db,
    now: deliveryTime,
    batchSize,
    cursorRef,
    readers: mockReaders,
  });
  assert.equal(run2.processedCount, 2);
  assert.deepEqual(run2.results.map((r) => r.companyId), ['comp-3', 'comp-4']);
  assert.equal(run2.nextCursorId, 'comp-4');
  assert.equal(run2.wrapped, false);

  // Invocation 3: processes comp-5 (end of list)
  const run3 = await runDailySupervisorDelivery({
    db,
    now: deliveryTime,
    batchSize,
    cursorRef,
    readers: mockReaders,
  });
  assert.equal(run3.processedCount, 1);
  assert.deepEqual(run3.results.map((r) => r.companyId), ['comp-5']);
  assert.equal(run3.nextCursorId, 'comp-5');
  assert.equal(run3.wrapped, false);

  // Invocation 4: cursor is comp-5; wrap around to start and process comp-1, comp-2
  const run4 = await runDailySupervisorDelivery({
    db,
    now: deliveryTime,
    batchSize,
    cursorRef,
    readers: mockReaders,
  });
  assert.equal(run4.processedCount, 2);
  assert.deepEqual(run4.results.map((r) => r.companyId), ['comp-1', 'comp-2']);
  assert.equal(run4.nextCursorId, 'comp-2');
  assert.equal(run4.wrapped, true, 'wrapped back to beginning of company list');
});

// Test 9: Read failures must propagate and retry without creating incomplete manifest
test('read failures propagate into retryable failed state and leave manifest incomplete', async () => {
  const db = createMockFirestore();
  const companyId = 'farm-fail-retry';
  const companyDoc = {
    id: companyId,
    data: () => ({ timeZone: 'Asia/Jakarta' }),
  };

  const deliveryTime = new Date('2026-10-01T23:30:00Z'); // 06:30 AM Jakarta
  const dayKey = '2026-10-02';

  let shouldFail = true;
  const failingReaders = {
    getCompanyInventoryForecasts: async () => {
      if (shouldFail) throw new Error('Firestore connection timeout on inventory');
      return [{ itemId: 'feed-1', itemName: 'Feed A', itemType: 'feed', daysLeft: 2, currentStock: 10, avgDailyUsage: 5, unit: 'kg' }];
    },
    getNearbyActiveDiseaseReports: async () => [],
    getPondRiskSummary: async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }),
  };

  // Attempt 1: Reader fails
  const result1 = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now: deliveryTime,
    readers: failingReaders,
  });

  assert.equal(result1.status, 'failed', 'failure is propagated instead of swallowed');
  assert.ok(result1.error.includes('Firestore connection timeout on inventory'));

  // Document state in Firestore must be 'failed', and manifest must be null (not frozen as empty success)
  const docRef = db.collection('companies').doc(companyId).collection('orsonDailyDelivery').doc(dayKey);
  const snap1 = await docRef.get();
  assert.equal(snap1.data().status, 'failed');
  assert.equal(snap1.data().manifest, null, 'manifest must remain incomplete when reads fail');

  // Attempt 2: Reader recovers on subsequent dispatch -> succeeds and freezes genuine manifest
  shouldFail = false;
  const result2 = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now: new Date('2026-10-02T00:00:00Z'), // 30 min later
    readers: failingReaders,
  });

  assert.equal(result2.status, 'completed', 'retried dispatch succeeds upon reader recovery');
  assert.equal(result2.deliveredCount, 2); // 1 inventory_forecast + 1 orson_daily_brief

  const snap2 = await docRef.get();
  assert.equal(snap2.data().status, 'completed');
  assert.ok(snap2.data().manifest.length > 0, 'manifest frozen after successful read');
});

// Test 10: Prior-day crash recovery / catch-up across midnight boundary
test('prior-day incomplete run is discovered and completed via catch-up across midnight', async () => {
  const db = createMockFirestore();
  const companyId = 'farm-catchup';
  const companyDoc = {
    id: companyId,
    data: () => ({ timeZone: 'Asia/Jakarta' }),
  };

  const yesterdayKey = '2026-10-01';
  const deliveryColl = db.collection('companies').doc(companyId).collection('orsonDailyDelivery');

  // Seed yesterday's run as crashed at 23:50 (status 'processing', lease expired)
  await deliveryColl.doc(yesterdayKey).set({
    companyId,
    dayKey: yesterdayKey,
    timeZone: 'Asia/Jakarta',
    usedUtcFallback: false,
    status: 'processing',
    generation: 1,
    leaseOwner: 'worker-crashed',
    leaseExpiresAtMs: new Date('2026-10-01T16:55:00Z').getTime(), // expired
    manifest: [
      {
        type: 'inventory_forecast',
        priority: 'high',
        title: 'Yesterday Forecast',
        message: 'Stock running low',
        dedupeKey: `inventory_forecast:feed:yesterday:${yesterdayKey}`,
        data: {},
      },
    ],
    deliveredCount: 0,
  });

  // Now it is 00:30 the next day in Jakarta (UTC 2026-10-01T17:30:00Z)
  // Local hour is 0 < 6, so today (2026-10-02) is NOT due yet.
  const pastMidnight = new Date('2026-10-01T17:30:00Z');

  const result = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now: pastMidnight,
    readers: {
      getCompanyInventoryForecasts: async () => [],
      getNearbyActiveDiseaseReports: async () => [],
      getPondRiskSummary: async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }),
    },
  });

  // Catch-up completes yesterday's unfinished delivery!
  assert.equal(result.status, 'completed');
  assert.equal(result.dayKey, yesterdayKey);

  const yesterdaySnap = await deliveryColl.doc(yesterdayKey).get();
  assert.equal(yesterdaySnap.data().status, 'completed', 'yesterdays unfinished day is completed');
  assert.equal(yesterdaySnap.data().deliveredCount, 1);

  // Today (2026-10-02) was not yet due, so no today doc created yet
  const todaySnap = await deliveryColl.doc('2026-10-02').get();
  assert.equal(todaySnap.exists, false, 'today was not yet due and remains unstarted');
});

// Test 11: Pinned timezone and company timezone change handling
test('effective timezone is pinned for in-progress days and company timezone change applies to future days', async () => {
  const db = createMockFirestore();
  const companyId = 'farm-tz-pinned';
  const deliveryColl = db.collection('companies').doc(companyId).collection('orsonDailyDelivery');

  const inProgressDay = '2026-10-01';
  // Seed in-progress day pinned to Asia/Jakarta
  await deliveryColl.doc(inProgressDay).set({
    companyId,
    dayKey: inProgressDay,
    timeZone: 'Asia/Jakarta',
    usedUtcFallback: false,
    status: 'failed', // failed, eligible for retry
    generation: 1,
    leaseExpiresAtMs: 0,
    manifest: [
      {
        type: 'inventory_forecast',
        priority: 'high',
        title: 'Low feed',
        message: 'Feed is low',
        dedupeKey: `feed_warn:${inProgressDay}`,
      },
    ],
  });

  // Company changes timezone in profile to America/New_York
  const companyDoc = {
    id: companyId,
    data: () => ({ timeZone: 'America/New_York' }),
  };

  const now = new Date('2026-10-01T20:00:00Z');

  const result = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now,
    readers: {
      getCompanyInventoryForecasts: async () => [],
      getNearbyActiveDiseaseReports: async () => [],
      getPondRiskSummary: async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }),
    },
  });

  // It retries and completes inProgressDay with pinned Asia/Jakarta timezone
  assert.equal(result.status, 'completed');
  assert.equal(result.dayKey, inProgressDay);

  const snap = await deliveryColl.doc(inProgressDay).get();
  assert.equal(snap.data().status, 'completed');
  assert.equal(snap.data().timeZone, 'Asia/Jakarta', 'timeZone remains pinned to Asia/Jakarta on the in-progress day');
});

test('an active processing lease does not hide a later failed delivery', async () => {
  const db = createMockFirestore();
  const companyId = 'farm-failed-behind-active';
  const deliveryColl = db.collection('companies').doc(companyId).collection('orsonDailyDelivery');
  await deliveryColl.doc('2026-09-30').set({
    companyId,
    dayKey: '2026-09-30',
    timeZone: 'Asia/Jakarta',
    usedUtcFallback: false,
    status: 'processing',
    generation: 1,
    leaseExpiresAtMs: new Date('2026-10-02T01:00:00Z').getTime(),
    manifest: [],
  });
  await deliveryColl.doc('2026-10-01').set({
    companyId,
    dayKey: '2026-10-01',
    timeZone: 'Asia/Jakarta',
    usedUtcFallback: false,
    status: 'failed',
    generation: 1,
    leaseExpiresAtMs: 0,
    manifest: [],
  });

  const result = await deliverCompanyDailyNotifications({
    db,
    companyDoc: { id: companyId, data: () => ({ timeZone: 'Asia/Jakarta' }) },
    now: new Date('2026-10-02T00:00:00Z'),
  });

  assert.equal(result.status, 'completed');
  assert.equal((await deliveryColl.doc('2026-10-01').get()).data().status, 'completed');
  assert.equal((await deliveryColl.doc('2026-09-30').get()).data().status, 'processing');
});

test('retry resumes a frozen manifest after one notification was created', async () => {
  const db = createMockFirestore();
  const companyId = 'farm-partial-notification';
  const companyDoc = { id: companyId, data: () => ({ timeZone: 'Asia/Jakarta' }) };
  const partialFailureDb = {
    collection: (...args) => db.collection(...args),
    doc: (...args) => db.doc(...args),
    runTransaction: (callback) => db.runTransaction((transaction) => callback({
      get: (ref) => transaction.get(ref),
      update: (ref, value) => transaction.update(ref, value),
      set: (ref, value, ...setArgs) => {
        if (ref.path.startsWith('notifications/') && value.type === 'orson_daily_brief') {
          throw new Error('simulated second notification failure');
        }
        return transaction.set(ref, value, ...setArgs);
      },
    })),
  };
  const readers = {
    getCompanyInventoryForecasts: async () => [{ itemId: 'feed-1', itemName: 'Feed A', itemType: 'feed', daysLeft: 2, currentStock: 10, avgDailyUsage: 5, unit: 'kg' }],
    getNearbyActiveDiseaseReports: async () => [],
    getPondRiskSummary: async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }),
  };
  const now = new Date('2026-10-01T23:30:00Z');

  const firstAttempt = await deliverCompanyDailyNotifications({ db: partialFailureDb, companyDoc, now, readers });
  assert.equal(firstAttempt.status, 'failed');
  const deliveryRef = db.collection('companies').doc(companyId).collection('orsonDailyDelivery').doc('2026-10-02');
  const failedState = await deliveryRef.get();
  assert.equal(failedState.data().status, 'failed');
  assert.equal(failedState.data().manifest.length, 2);
  assert.equal((await db.collection('notifications').where('companyId', '==', companyId).get()).docs.length, 1);

  const retry = await deliverCompanyDailyNotifications({
    db,
    companyDoc,
    now: new Date('2026-10-01T23:31:00Z'),
    readers,
  });
  assert.equal(retry.status, 'completed');
  assert.equal(retry.deliveredCount, 2);
  assert.equal(retry.createdCount, 1);
  assert.equal((await db.collection('notifications').where('companyId', '==', companyId).get()).docs.length, 2);
});
