const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const {
  acquireDeliveryLease,
  createNotificationIfAbsent,
  getNotificationDocId,
  buildNotificationManifest,
  deliverCompanyDailyNotifications,
} = require('./orsonDailyDelivery');

test('orson daily delivery emulator concurrency, retry recovery and tenant isolation', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const projectId = 'demo-shrimply-daily-delivery';
  process.env.GCLOUD_PROJECT = projectId;
  process.env.NODE_ENV = 'test';

  const { initializeApp } = require('node:module').createRequire(require.resolve('./firebaseAdmin'))('firebase-admin/app');
  initializeApp({ projectId });
  const admin = require('./firebaseAdmin');
  const db = admin.firestore();

  const env = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });

  try {
    await env.clearFirestore();

    const companyIdA = 'company-alpha';
    const companyIdB = 'company-beta';
    const dayKey = '2026-10-02';
    const tzInfo = { timeZone: 'Asia/Jakarta', usedUtcFallback: false };

    // Seed companies
    await db.doc(`companies/${companyIdA}`).set({
      ownerId: 'owner-a',
      timeZone: 'Asia/Jakarta',
      primaryLocation: { latitude: -6.2, longitude: 106.8 },
    });
    await db.doc(`companies/${companyIdB}`).set({
      ownerId: 'owner-b',
      timeZone: 'Asia/Jakarta',
      primaryLocation: { latitude: -7.2, longitude: 112.7 },
    });
    const companyIdC = 'company-charlie';
    await db.doc(`companies/${companyIdC}`).set({
      ownerId: 'owner-c',
      timeZone: 'Asia/Jakarta',
      primaryLocation: { latitude: -8.2, longitude: 113.7 },
    });

    // 1. Concurrency: Two workers simultaneously attempt to acquire the lease for Company A
    const now = new Date('2026-10-02T00:00:00Z');
    const [leaseA, leaseB] = await Promise.all([
      acquireDeliveryLease({
        db,
        companyId: companyIdA,
        dayKey,
        timeZoneInfo: tzInfo,
        leaseOwner: 'worker-1',
        leaseDurationMs: 30_000,
        now,
      }),
      acquireDeliveryLease({
        db,
        companyId: companyIdA,
        dayKey,
        timeZoneInfo: tzInfo,
        leaseOwner: 'worker-2',
        leaseDurationMs: 30_000,
        now,
      }),
    ]);

    const acquiredCount = [leaseA, leaseB].filter((l) => l.acquired).length;
    const rejectedCount = [leaseA, leaseB].filter((l) => !l.acquired && l.reason === 'active_lease').length;
    assert.equal(acquiredCount, 1, 'exactly one worker must acquire the active lease under concurrency');
    assert.equal(rejectedCount, 1, 'the other worker must be rejected with active_lease');

    // 2. Crash and retry recovery
    // Simulate Worker 1 crashing. Advance time past leaseDurationMs (35 seconds later).
    const laterTime = new Date('2026-10-02T00:00:35Z');
    const recoveryLease = await acquireDeliveryLease({
      db,
      companyId: companyIdA,
      dayKey,
      timeZoneInfo: tzInfo,
      leaseOwner: 'worker-recovery',
      leaseDurationMs: 30_000,
      now: laterTime,
    });

    assert.equal(recoveryLease.acquired, true, 'recovery lease acquired after expiration');
    assert.equal(recoveryLease.recovered, true, 'flagged as recovered lease');
    assert.equal(recoveryLease.generation, 2, 'generation incremented on recovery to fence old worker');

    // 3. Stable create-if-absent notifications and completion
    const manifest = buildNotificationManifest({
      companyId: companyIdA,
      dayKey,
      inventoryForecasts: [
        { itemId: 'feed-1', itemName: 'Feed Pro', itemType: 'feed', daysLeft: 2, currentStock: 100, avgDailyUsage: 50, unit: 'kg' },
      ],
      nearbyDiseaseReports: [],
      riskSummary: { warningFindings: [], watchFindings: [], biosecurityFindings: [] },
    });

    assert.equal(manifest.length, 2, 'inventory notice and daily brief are included');
    const notifItem = manifest[0];
    const docId = getNotificationDocId(companyIdA, notifItem.dedupeKey);
    const notifRef = db.collection('notifications').doc(docId);

    // Create notification
    const firstWrite = await createNotificationIfAbsent(db, notifRef, {
      companyId: companyIdA,
      ...notifItem,
    });
    assert.equal(firstWrite, true, 'first write creates notification document');

    // Duplicate create-if-absent attempt
    const secondWrite = await createNotificationIfAbsent(db, notifRef, {
      companyId: companyIdA,
      ...notifItem,
    });
    assert.equal(secondWrite, false, 'second write is safely ignored without duplicates');

    // Complete delivery
    const deliveryDocRef = db.collection('companies').doc(companyIdA).collection('orsonDailyDelivery').doc(dayKey);
    await deliveryDocRef.update({
      status: 'completed',
      deliveredCount: 1,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const completedSnap = await deliveryDocRef.get();
    assert.equal(completedSnap.data().status, 'completed');

    // Subsequent acquisition attempt after completion is rejected
    const postCompleteLease = await acquireDeliveryLease({
      db,
      companyId: companyIdA,
      dayKey,
      timeZoneInfo: tzInfo,
      leaseOwner: 'worker-late',
      now: new Date('2026-10-02T01:00:00Z'),
    });
    assert.equal(postCompleteLease.acquired, false);
    assert.equal(postCompleteLease.reason, 'already_completed');

    // 4. Company B retries a partial read failure with stable notification IDs
    const companyBDoc = await db.doc(`companies/${companyIdB}`).get();
    let shouldFailCompanyB = true;
    const readersB = {
      getCompanyInventoryForecasts: async () => {
        if (shouldFailCompanyB) throw new Error('temporary inventory read failure');
        return [{ itemId: 'feed-b', itemName: 'Feed B', itemType: 'feed', daysLeft: 2, currentStock: 100, avgDailyUsage: 50, unit: 'kg' }];
      },
      getNearbyActiveDiseaseReports: async () => [],
      getPondRiskSummary: async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }),
    };
    const firstAttemptB = await deliverCompanyDailyNotifications({
      db,
      companyDoc: companyBDoc,
      now: new Date('2026-10-01T23:30:00Z'), // 06:30 AM Jakarta (due)
      readers: readersB,
    });
    assert.equal(firstAttemptB.status, 'failed');
    assert.equal((await db.doc(`companies/${companyIdB}/orsonDailyDelivery/${dayKey}`).get()).data().manifest, null);

    shouldFailCompanyB = false;
    const resultB = await deliverCompanyDailyNotifications({
      db,
      companyDoc: companyBDoc,
      now: new Date('2026-10-01T23:31:00Z'),
      readers: readersB,
    });

    assert.equal(resultB.status, 'completed');
    assert.equal(resultB.companyId, companyIdB);
    assert.equal(resultB.totalManifestCount, 2, 'inventory notice and daily brief are both delivered');

    const notificationSnapshot = await db.collection('notifications').where('companyId', '==', companyIdB).get();
    assert.equal(notificationSnapshot.size, 2, 'retry creates each stable notification once');
    const repeatedResultB = await deliverCompanyDailyNotifications({
      db,
      companyDoc: companyBDoc,
      now: new Date('2026-10-02T00:30:00Z'),
      readers: readersB,
    });
    assert.equal(repeatedResultB.reason, 'already_completed');
    const afterRepeatSnapshot = await db.collection('notifications').where('companyId', '==', companyIdB).get();
    assert.equal(afterRepeatSnapshot.size, 2, 'later dispatch does not duplicate notifications');

    // A failure after one notification write reuses the frozen manifest on retry.
    const companyCDoc = await db.doc(`companies/${companyIdC}`).get();
    const partialFailureDb = {
      collection: (...args) => db.collection(...args),
      doc: (...args) => db.doc(...args),
      runTransaction: (callback, ...args) => db.runTransaction((transaction) => callback({
        get: (ref) => transaction.get(ref),
        update: (ref, value) => transaction.update(ref, value),
        set: (ref, value, ...setArgs) => {
          if (ref.path.startsWith('notifications/') && value.type === 'orson_daily_brief') {
            throw new Error('simulated failure after first notification');
          }
          return transaction.set(ref, value, ...setArgs);
        },
      }), ...args),
    };
    const readersC = {
      getCompanyInventoryForecasts: async () => [{ itemId: 'feed-c', itemName: 'Feed C', itemType: 'feed', daysLeft: 2, currentStock: 100, avgDailyUsage: 50, unit: 'kg' }],
      getNearbyActiveDiseaseReports: async () => [],
      getPondRiskSummary: async () => ({ warningFindings: [], watchFindings: [], biosecurityFindings: [] }),
    };
    const partialAttemptC = await deliverCompanyDailyNotifications({
      db: partialFailureDb,
      companyDoc: companyCDoc,
      now: new Date('2026-10-01T23:30:00Z'),
      readers: readersC,
    });
    assert.equal(partialAttemptC.status, 'failed');
    const partialState = await db.doc(`companies/${companyIdC}/orsonDailyDelivery/${dayKey}`).get();
    assert.equal(partialState.data().status, 'failed');
    assert.equal(partialState.data().manifest.length, 2, 'manifest remains frozen after partial notification delivery');
    assert.equal((await db.collection('notifications').where('companyId', '==', companyIdC).get()).size, 1);

    const recoveredAttemptC = await deliverCompanyDailyNotifications({
      db,
      companyDoc: companyCDoc,
      now: new Date('2026-10-01T23:31:00Z'),
      readers: readersC,
    });
    assert.equal(recoveredAttemptC.status, 'completed');
    assert.equal(recoveredAttemptC.deliveredCount, 2);
    assert.equal(recoveredAttemptC.createdCount, 1, 'only the missing notification is created on retry');
    assert.equal((await db.collection('notifications').where('companyId', '==', companyIdC).get()).size, 2);

    // Verify Company A and Company B state docs are in their own company subcollections
    const snapA = await db.collection('companies').doc(companyIdA).collection('orsonDailyDelivery').doc(dayKey).get();
    const snapB = await db.collection('companies').doc(companyIdB).collection('orsonDailyDelivery').doc(dayKey).get();
    assert.ok(snapA.exists, 'Company A delivery document exists');
    assert.ok(snapB.exists, 'Company B delivery document exists');
    assert.equal(snapA.data().companyId, companyIdA);
    assert.equal(snapB.data().companyId, companyIdB);

    // Internal delivery state and dispatcher cursor remain unavailable to clients.
    const unauthenticated = env.unauthenticatedContext().firestore();
    await assert.rejects(() => unauthenticated.doc(`companies/${companyIdB}/orsonDailyDelivery/${dayKey}`).get());
    await assert.rejects(() => unauthenticated.doc('system/orsonDailyDispatcherCursor').get());
    const nonMember = env.authenticatedContext('outside-farm-user').firestore();
    await assert.rejects(() => nonMember.doc(`companies/${companyIdB}/orsonDailyDelivery/${dayKey}`).get());
    await assert.rejects(() => nonMember.doc('system/orsonDailyDispatcherCursor').set({ lastCompanyId: companyIdB }));
  } finally {
    await env.cleanup();
  }
});
