'use strict';
const { Buffer } = require('node:buffer');

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  summarizePeriodFeedAndCost,
  comparePondCycles,
  evaluateInventoryReplenishment,
  evaluateHarvestScenario,
  executeDecisionTool,
  decisionToolSchemas,
  periodFeedCostTool,
  comparePondCyclesTool,
  inventoryReplenishmentTool,
  harvestScenarioTool,
} = require('./orsonDecisionTools');
const { createOrsonAppDataReader } = require('./orsonAppData');

// Helper to construct mock Firestore database
const buildMockDb = (data = {}) => {
  const store = {
    companies: data.companies || {},
    blocks: data.blocks || {},
    ponds: data.ponds || {},
    expenses: data.expenses || {},
    feeds: data.feeds || {},
    additives: data.additives || {},
    users: data.users || {},
    cycles: data.cycles || {},
  };

  const makeQuery = (items, filters = [], limitCount = null, orderedByName = false, afterId = null) => ({
    where: (field, op, val) =>
      makeQuery(items, [...filters, { field, op, val }], limitCount, orderedByName, afterId),
    orderBy: () => makeQuery(items, filters, limitCount, true, afterId),
    startAfter: (cursor) => makeQuery(items, filters, limitCount, orderedByName, cursor?.id || cursor),
    limit: (n) => makeQuery(items, filters, n, orderedByName, afterId),
    get: async () => {
      let res = [...items];
      for (const f of filters) {
        if (f.op === '==') res = res.filter((it) => it.data[f.field] === f.val);
      }
      if (orderedByName) res.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      if (afterId !== null) res = res.filter((it) => String(it.id).localeCompare(String(afterId)) > 0);
      if (typeof limitCount === 'number') {
        res = res.slice(0, limitCount);
      }
      return {
        docs: res.map((it) => ({
          id: it.id,
          exists: true,
          data: () => ({ ...it.data }),
        })),
      };
    },
  });

  return {
    collection: (collName) => {
      const topMap = store[collName] || {};
      const items = Object.entries(topMap).map(([id, itemData]) => ({
        id,
        data: itemData,
      }));
      const query = makeQuery(items);
      return {
        doc: (docId) => ({
          get: async () => {
            const docData = store[collName]?.[docId];
            return {
              id: docId,
              exists: !!docData,
              data: () => (docData ? { ...docData } : undefined),
            };
          },
          collection: (subColl) => {
            const subMap = store[subColl]?.[docId] || {};
            const subItems = Object.entries(subMap).map(([id, itemData]) => ({
              id,
              data: itemData,
            }));
            const subQuery = makeQuery(subItems);
            return {
              doc: (subDocId) => ({
                get: async () => {
                  const subData = subMap[subDocId];
                  return {
                    id: subDocId,
                    exists: !!subData,
                    data: () => (subData ? { ...subData } : undefined),
                  };
                },
              }),
              where: (field, op, val) => makeQuery(subItems, [{ field, op, val }]),
              orderBy: (...args) => subQuery.orderBy(...args),
              limit: (n) => subQuery.limit(n),
              get: async () => subQuery.get(),
            };
          },
        }),
        where: (field, op, val) => makeQuery(items, [{ field, op, val }]),
        orderBy: (...args) => query.orderBy(...args),
        limit: (n) => query.limit(n),
        get: async () => query.get(),
      };
    },
  };
};

const createTestFarmFixture = () => {
  return {
    companies: {
      'farm-1': {
        name: 'Shrimply Farm Alpha',
        ownerId: 'owner-1',
        teamMembers: ['owner-1', 'tech-1'],
        businessSize: 'enterprise',
        timeZone: 'UTC',
      },
      'farm-2': {
        name: 'Other Farm Beta',
        ownerId: 'owner-2',
        teamMembers: ['owner-2'],
        businessSize: 'standard',
        timeZone: 'UTC',
      },
    },
    users: {
      'owner-1': { role: 'owner', companyId: 'farm-1' },
      'tech-1': { role: 'technician', companyId: 'farm-1' },
      'owner-2': { role: 'owner', companyId: 'farm-2' },
    },
    blocks: {
      'farm-1': {
        'blk-1': { name: 'Block 1', assignedTechnicianId: 'tech-1' },
        'blk-2': { name: 'Block 2', assignedTechnicianId: 'other-tech' },
      },
    },
    ponds: {
      'farm-1': {
        'pond-a': {
          pondName: 'Pond A',
          blockId: 'blk-1',
          pondArea: 1000,
          cycleStatus: 'active',
          pondCycleId: 'cycle-101',
          cycleStartedAt: '2026-09-01',
          docStart: '2026-09-01',
          initialPopulation: 100000,
          initialWeight: 0.8,
          feedCost: 4500,
          samplings: [
            {
              id: 's-a1',
              date: '2026-09-01',
              pondCycleId: 'cycle-101',
              mbw: 3.5,
              feedData: { totalDailyFeed: 40, feedingResponse: 'normal' },
            },
            {
              id: 's-a2',
              date: '2026-09-02',
              pondCycleId: 'cycle-101',
              mbw: 3.8,
              feedData: { totalDailyFeed: 0, isExplicitZero: true },
            },
            {
              id: 's-a3',
              date: '2026-09-05',
              pondCycleId: 'cycle-101',
              mbw: 4.6,
              feedData: { totalDailyFeed: 45 },
            },
            {
              id: 's-old',
              date: '2026-06-20',
              pondCycleId: 'cycle-old',
              mbw: 12.0,
              feedData: { totalDailyFeed: 100 },
            },
          ],
          mortalityRecords: [
            { date: '2026-10-06', pondCycleId: 'cycle-101', observationType: 'estimated_total', count: 20 },
          ],
        },
        'pond-b': {
          pondName: 'Pond B',
          blockId: 'blk-1',
          pondArea: 1200,
          cycleStatus: 'active',
          pondCycleId: 'cycle-201',
          initialPopulation: 120000,
          initialWeight: 0.9,
          feedCost: 6000,
          samplings: [
            {
              id: 's-b1',
              date: '2026-09-01',
              pondCycleId: 'cycle-201',
              mbw: 4.2,
              feedData: { totalDailyFeed: 55 },
            },
            {
              id: 's-b2',
              date: '2026-09-05',
              pondCycleId: 'cycle-201',
              mbw: 5.5,
              feedData: { totalDailyFeed: 60 },
            },
          ],
        },
        'pond-restricted': {
          pondName: 'Pond Restricted in Block 2',
          blockId: 'blk-2',
          cycleStatus: 'active',
          pondCycleId: 'cycle-301',
          initialPopulation: 80000,
          initialWeight: 0.7,
        },
      },
      'farm-2': {
        'pond-other': {
          pondName: 'Foreign Pond',
          blockId: 'blk-other',
          cycleStatus: 'active',
        },
      },
    },
    expenses: {
      'farm-1': {
        'exp-1': {
          date: '2026-09-01',
          amount: 500,
          category: 'feed',
          pondId: 'pond-a',
          voided: false,
        },
        'exp-2': {
          date: '2026-09-03',
          amount: 250,
          category: 'chemicals',
          pondId: 'pond-a',
          voided: false,
        },
        'exp-3': {
          date: '2026-09-04',
          amount: 800,
          category: 'energy',
          voided: false, // farm-wide expense
        },
        'exp-voided': {
          date: '2026-09-02',
          amount: 9999,
          category: 'feed',
          pondId: 'pond-a',
          voided: true, // must be excluded
        },
        'exp-inv-feed': {
          date: '2026-09-01',
          amount: 3000,
          category: 'feed purchase',
          reference: 'INVENTORY-FEED-01',
          linkedInventory: 'feed-starter',
          pondId: 'pond-a',
          voided: false, // must be excluded as inventory purchase
        },
      },
    },
    cycles: {
      'farm-1': {
        'cycle-old': {
          pondId: 'pond-a',
          cycleName: 'Cycle 2025 Old',
          cycleStartedAt: '2026-06-01',
          startDate: '2026-06-01',
          initialPopulation: 90000,
          initialWeight: 0.6,
          feedCost: 3500,
        },
      },
    },
    feeds: {
      'farm-1': {
        'feed-starter': {
          feedName: 'Starter Crumble',
          totalStock: 100,
          reorderLevel: 50,
          unit: 'kg',
          costPerUnit: 2.5,
          usageHistory: [
            { date: '2026-10-06', quantity: 10, totalCost: 25, pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'cycle-101' },
            { date: '2026-10-07', quantity: 10, totalCost: 25, pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'cycle-101' },
          ],
        },
        'feed-depleted': {
          feedName: 'Finisher Pellet',
          totalStock: 0,
          reorderLevel: 40,
          unit: 'kg',
          costPerUnit: 2.2,
          usageHistory: [
            { date: '2026-10-06', quantity: 20 },
          ],
        },
        'feed-zero-usage': {
          feedName: 'Broodstock Specialty',
          totalStock: 80,
          reorderLevel: 20,
          unit: 'kg',
          costPerUnit: 5.0,
          usageHistory: [],
        },
        'feed-unknown-stock': {
          feedName: 'Trial Microfeed',
          totalStock: null,
          unit: 'kg',
        },
      },
      'farm-2': {
        'feed-foreign': {
          feedName: 'Foreign Feed Beta',
          totalStock: 100,
          unit: 'kg',
        },
      },
    },
    additives: {
      'farm-1': {
        'add-calcium': {
          additiveName: 'Calcium Chloride',
          totalStock: 25,
          reorderLevel: 30,
          unit: 'kg',
          costPerUnit: 1.8,
          usageHistory: [
            { date: '2026-10-06', quantity: 5, totalCost: 9, pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'cycle-101' },
          ],
        },
      },
    },
  };
};

test('saved expense allocations retain unequal pond shares in Orson period costs', async () => {
  const fixture = createTestFarmFixture();
  fixture.ponds['farm-1']['pond-a'].cycleId = 'shared-cycle';
  fixture.ponds['farm-1']['pond-b'].cycleId = 'shared-cycle';
  fixture.expenses['farm-1'] = { bill: {
    date: '2026-09-03', amount: 1000, category: 'Utilities', cycleId: 'shared-cycle', allocationMethod: 'active_pond_area',
    pondAllocations: [{ pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'shared-cycle', amount: 800 }, { pondId: 'pond-b', pondCycleId: 'cycle-201', cycleId: 'shared-cycle', amount: 200 }],
  } };
  const result = await summarizePeriodFeedAndCost({ pondId: 'pond-a', startDate: '2026-09-01', endDate: '2026-09-05' }, {
    db: buildMockDb(fixture), company: { timeZone: 'UTC' }, companyId: 'farm-1', allowed: permission => ['viewFarm', 'viewFinance'].includes(permission), enterpriseScoped: false, timeZone: 'UTC',
  });
  assert.equal(result.finance.recordedOperatingExpenseSubtotal, 800);
  assert.equal(result.finance.unallocatedCompanyWideExpenseCount, 0);
});

test('a technician with finance access reads only assigned-block shares of a shared bill', async () => {
  const fixture = createTestFarmFixture();
  fixture.expenses['farm-1'] = { bill: {
    date: '2026-09-03', amount: 1000, category: 'Utilities', notes: 'Private invoice note', reference: 'full-invoice', settlements: [{ id: 'paid', amount: 1000, date: '2026-09-03' }], allocationBasisTotal: 4000,
    pondAllocations: [{ pondId: 'pond-a', pondCycleId: 'cycle-101', pondArea: 1000, amount: 250, share: 0.25 }, { pondId: 'pond-restricted', pondArea: 3000, amount: 750, share: 0.75 }],
  } };
  const reader = createOrsonAppDataReader({ db: buildMockDb(fixture), company: fixture.companies['farm-1'], user: { ...fixture.users['tech-1'], permissionOverrides: { viewFinance: true } }, uid: 'tech-1', companyId: 'farm-1' });
  const result = await reader.execute('read_app_records', { dataset: 'expenses', documentId: 'bill' });
  assert.equal(result.data.amount, 250); assert.equal(result.data.allocationBasisTotal, 1000);
  assert.deepEqual(result.data.pondAllocations.map(row => row.pondId), ['pond-a']);
  assert.equal(result.data.pondAllocations[0].share, undefined, 'full invoice value cannot be reconstructed from the company-wide share');
  assert.equal(result.data.settlements, undefined); assert.equal(result.data.reference, undefined); assert.equal(result.data.notes, undefined);
});

test('decisionToolSchemas exposes valid tool definitions with parameters', () => {
  assert.equal(decisionToolSchemas.length, 4);
  assert.equal(periodFeedCostTool.name, 'summarize_period_feed_and_cost');
  assert.equal(comparePondCyclesTool.name, 'compare_pond_cycles');
  assert.equal(inventoryReplenishmentTool.name, 'evaluate_inventory_replenishment');
  assert.equal(harvestScenarioTool.name, 'evaluate_harvest_scenario');
  assert.deepEqual(periodFeedCostTool.parameters.required, []);
  assert.ok(comparePondCyclesTool.parameters.required.includes('pondId'));
});

test('summarize_period_feed_and_cost: calculates single pond feed totals and coverage metrics', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm', // technician without finance
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await summarizePeriodFeedAndCost(
    {
      pondId: 'pond-a',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    },
    context,
  );

  assert.equal(result.status, 'partial');
  assert.equal(result.scope.pondId, 'pond-a');
  assert.equal(result.period.daysInPeriod, 5);

  // Feed metrics
  // On 2026-09-01: 40kg, 2026-09-02: 0kg (explicit zero), 2026-09-05: 45kg -> total 85kg
  // Old cycle feed (s-old) is strictly excluded
  assert.equal(result.feed.totalFeedKg, 85);
  assert.equal(result.feed.daysWithFeedRecorded, 3);
  assert.equal(result.feed.daysWithExplicitZero, 1);
  assert.equal(result.feed.daysUnrecorded, 2); // 2026-09-03 and 2026-09-04 unrecorded, not 0kg!
  assert.equal(result.feed.averageDailyFeedKg, 28.33); // 85 / 3 days
  assert.equal(result.feed.coveragePercent, 60); // 3/5 = 60%
  assert.equal(result.feed.completeness, 'partial');

  // Unauthorized finance: technician receives no financial leakage
  assert.equal(Object.hasOwn(result, 'finance'), false);
  assert.equal(Object.hasOwn(result, 'farmTotal'), false);
  assert.equal(Object.hasOwn(result.ponds[0], 'finance'), false);
  assert.equal(Object.hasOwn(result.retrieval.recordsRead, 'expenses'), false);
  assert.equal(Object.hasOwn(result.retrieval, 'expensesTruncated'), false);
  assert.equal(result.ponds[0].retrieval.complete, true);
  assert.equal(result.ponds[0].retrieval.recordsRead.feedDaysSelected, 3);
});

test('summarize_period_feed_and_cost: separates operating expenses from consumed inventory costs', async () => {
  const fixture = createTestFarmFixture();
  fixture.feeds['farm-1']['feed-starter'].usageHistory.push({
    date: '2026-09-02', quantity: 5, totalCost: 12.5,
    pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'cycle-101',
  });
  fixture.feeds['farm-1']['feed-starter'].usageHistory.push({
    date: '2026-09-02', quantity: 99, totalCost: 999,
    pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'cycle-101', transfer: true,
  });
  fixture.additives['farm-1']['add-calcium'].usageHistory.push({
    date: '2026-09-03', quantity: 2, totalCost: 3,
    pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'cycle-101',
  });
  const db = buildMockDb(fixture);
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await summarizePeriodFeedAndCost(
    {
      pondId: 'pond-a',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    },
    context,
  );

  assert.equal(result.status, 'partial');
  assert.equal(result.finance.financeAllowed, true);

  // exp-1 (feed: 500) and exp-2 (chemicals: 250) match pond-a. exp-voided (9999) excluded.
  assert.equal(result.finance.totalExpenses, null, 'Unallocated company-wide costs prevent a complete pond total');
  assert.equal(result.finance.recordedOperatingExpenseSubtotal, 750);
  assert.equal(result.finance.expenseCount, null, 'Incomplete company-wide expense evidence prevents a complete entry count');
  assert.equal(result.ponds[0].finance.operatingExpenseEntryCount, 2);
  assert.equal(result.finance.expensesByCategory, null);
  assert.equal(result.finance.partialRecordedExpensesByCategory.feed, 500);
  assert.equal(result.finance.partialRecordedExpensesByCategory.chemicals, 250);
  assert.equal(result.finance.averageExpensePerDay, null, 'Partial expenses do not get a complete daily average');

  assert.equal(result.finance.consumedFeedCost, 12.5);
  assert.equal(result.finance.consumedFeedCostCompleteness, 'complete');
  assert.equal(result.finance.feedUsageRecordCount, 1);
  assert.equal(result.finance.consumedAdditiveCost, 3);
  assert.equal(result.finance.consumedAdditiveCostCompleteness, 'complete');
  assert.equal(result.finance.additiveUsageRecords, 1);
  assert.equal(result.finance.feedCostPerKg, undefined);
});

test('summarize_period_feed_and_cost: aggregates across all accessible ponds when pondId is omitted', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await summarizePeriodFeedAndCost(
    {
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    },
    context,
  );

  assert.equal(result.status, 'partial');
  assert.equal(result.scope.pondId, null);
  assert.ok(result.scope.pondsCount >= 2);

  // Pond A feed (85) + Pond B feed (55 on Sep 1 + 60 on Sep 5 = 115) = 200kg total
  assert.equal(result.feed.totalFeedKg, 200);
  assert.ok(Array.isArray(result.feed.ponds));
  assert.equal(result.feed.ponds.length, 3); // pond-a, pond-b, pond-restricted
  assert.equal(result.feed.expectedPondDays, 15);
  assert.equal(result.feed.coveragePercent, 33.3);
  assert.equal(result.retrieval.complete, true);

  // Company-wide exp-3 cannot be attributed; stock-in purchases are excluded.
  assert.equal(result.finance.totalExpenses, null);
  assert.equal(result.finance.recordedOperatingExpenseSubtotal, 750);
  assert.equal(result.finance.unallocatedCompanyWideExpenseCount, 1);
  assert.equal(result.finance.expensesByCategory, null);
  assert.equal(result.finance.partialRecordedExpensesByCategory.energy, undefined);
  assert.equal(result.farmTotal.available, false);
});

test('summarize_period_feed_and_cost: cycle expense shares conserve totals and stale direct-cycle rows are excluded', async () => {
  const fixture = createTestFarmFixture();
  fixture.ponds['farm-1']['pond-a'].cycleId = 'shared-cycle';
  fixture.ponds['farm-1']['pond-b'].cycleId = 'shared-cycle';
  fixture.expenses['farm-1'] = {
    'shared-cycle-expense': {
      date: '2026-09-03', amount: 1000, category: 'energy', cycleId: 'shared-cycle',
    },
    'stale-direct-expense': {
      date: '2026-09-03', amount: 900, category: 'chemicals', pondId: 'pond-a', cycleId: 'old-cycle',
    },
  };
  const db = buildMockDb(fixture);
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };
  const pondResult = await summarizePeriodFeedAndCost({
    pondId: 'pond-a', startDate: '2026-09-01', endDate: '2026-09-05',
  }, context);
  const farmResult = await summarizePeriodFeedAndCost({
    startDate: '2026-09-01', endDate: '2026-09-05',
  }, context);

  assert.equal(pondResult.finance.totalExpenses, null, 'An excluded stale row prevents a complete total claim');
  assert.equal(pondResult.finance.recordedOperatingExpenseSubtotal, 500);
  assert.equal(pondResult.ponds[0].finance.operatingExpenseReadStatus, 'partial');
  assert.equal(pondResult.ponds[0].finance.staleCycleExpenseCount, 1);
  assert.equal(pondResult.finance.expensesByCategory, null);
  assert.equal(farmResult.finance.totalExpenses, null);
  assert.equal(farmResult.finance.recordedOperatingExpenseSubtotal, 1000);
});

test('summarize_period_feed_and_cost: missing usage cost stays unavailable instead of looking complete', async () => {
  const fixture = createTestFarmFixture();
  fixture.feeds['farm-1']['feed-starter'].usageHistory.push({
    date: '2026-09-02', quantity: 5,
    pondId: 'pond-a', pondCycleId: 'cycle-101', cycleId: 'cycle-101',
  });
  const db = buildMockDb(fixture);
  const result = await summarizePeriodFeedAndCost({
    pondId: 'pond-a', startDate: '2026-09-01', endDate: '2026-09-05',
  }, {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  });

  assert.equal(result.finance.consumedFeedCost, null);
  assert.equal(result.finance.consumedFeedCostCompleteness, 'partial');
  assert.equal(result.finance.feedUsageRecordsMissingCost, 1);
});

test('summarize_period_feed_and_cost: defaults to 30 farm-local days and returns per-pond coverage', async () => {
  const periodDays = Array.from({ length: 30 }, (_, index) =>
    new Date(Date.parse('2026-09-08T00:00:00.000Z') + index * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)
  );
  const fixture = {
    companies: { 'farm-1': { timeZone: 'Australia/Melbourne' } },
    ponds: { 'farm-1': {
      'pond-a': {
        pondName: 'Pond A', pondCycleId: 'cycle-a', cycleStatus: 'active',
        samplings: periodDays.map((date, index) => ({
          id: `a-${index}`, date, pondCycleId: 'cycle-a',
          feedData: { totalDailyFeed: 10 },
        })),
      },
      'pond-b': {
        pondName: 'Pond B', pondCycleId: 'cycle-b', cycleStatus: 'active',
        samplings: [
          { id: 'b-zero', date: '2026-09-08', pondCycleId: 'cycle-b', feedData: { totalDailyFeed: 0, isExplicitZero: true } },
          { id: 'b-last', date: '2026-10-07', pondCycleId: 'cycle-b', feedData: { totalDailyFeed: 5 } },
        ],
      },
    } },
  };
  const result = await summarizePeriodFeedAndCost({ endDate: '2026-10-07' }, {
    db: buildMockDb(fixture),
    company: fixture.companies['farm-1'],
    companyId: 'farm-1',
    allowed: (permission) => ['viewFarm', 'viewFinance'].includes(permission),
    enterpriseScoped: false,
  });

  assert.equal(result.period.startDate, '2026-09-08');
  assert.equal(result.period.endDate, '2026-10-07');
  assert.equal(result.period.daysInPeriod, 30);
  assert.equal(result.period.timeZone, 'Australia/Melbourne');
  assert.equal(result.period.asOfDate, '2026-10-07');
  assert.equal(result.feed.totalFeedKg, 305);
  assert.equal(result.feed.expectedPondDays, 60);
  assert.equal(result.feed.recordedPondDays, 32);
  assert.equal(result.feed.daysWithExplicitZero, 1);
  assert.equal(result.feed.daysUnrecorded, 28);
  assert.equal(result.ponds.length, 2);
  assert.equal(result.ponds[0].feed.completeness, 'complete');
  assert.equal(result.ponds[0].feed.totalKg, 300);
  assert.equal(result.ponds[1].feed.completeness, 'partial');
  assert.equal(result.ponds[1].feed.explicitZeroDays, 1);
  assert.equal(result.ponds[1].feed.daysUnrecorded, 28);
  assert.equal(result.ponds[0].finance.operatingExpenseEvidence, 'no_entries_found');
  assert.equal(result.ponds[0].finance.recordedOperatingExpenseSubtotal, 0);
  assert.equal(result.ponds[0].finance.actualSpendUnknown, true);
  assert.equal(result.ponds[0].finance.averageExpensePerDay, null);
  assert.match(result.ponds[0].finance.currencyDescription, /company currency is not configured/i);
  assert.equal(result.writesPerformed, 0);
  assert.equal(result.farmTotal.available, false);
});

test('summarize_period_feed_and_cost: preserves recorded zero costs and expenses separately from missing rows', async () => {
  const fixture = {
    companies: { 'farm-1': { timeZone: 'UTC', currency: 'AUD' } },
    ponds: { 'farm-1': { 'pond-a': {
      pondName: 'Pond A', pondCycleId: 'cycle-a', cycleStatus: 'active',
      samplings: [{ id: 'zero-feed', date: '2026-10-07', pondCycleId: 'cycle-a', feedData: { totalDailyFeed: 0, isExplicitZero: true } }],
    } } },
    feeds: { 'farm-1': { 'feed-a': { costPerUnit: 9, usageHistory: [
      { id: 'zero-usage-cost', date: '2026-10-07', quantity: 0, totalCost: 0, pondId: 'pond-a', pondCycleId: 'cycle-a', currency: 'AUD' },
    ] } } },
    expenses: { 'farm-1': { 'zero-expense': {
      date: '2026-10-07', amount: 0, category: 'energy', pondId: 'pond-a', currency: 'AUD',
    } } },
  };
  const result = await summarizePeriodFeedAndCost({ startDate: '2026-10-07', endDate: '2026-10-07' }, {
    db: buildMockDb(fixture),
    company: fixture.companies['farm-1'],
    companyId: 'farm-1',
    allowed: (permission) => ['viewFarm', 'viewFinance'].includes(permission),
    enterpriseScoped: false,
  });

  assert.equal(result.status, 'complete');
  assert.equal(result.feed.totalFeedKg, 0);
  assert.equal(result.feed.daysWithExplicitZero, 1);
  assert.equal(result.ponds[0].finance.consumedFeedCost, 0);
  assert.equal(result.ponds[0].finance.feedUsageRecordCount, 1);
  assert.equal(result.ponds[0].finance.recordedOperatingExpenseSubtotal, 0);
  assert.equal(result.ponds[0].finance.operatingExpenseEntryCount, 1);
  assert.equal(result.ponds[0].finance.actualSpendUnknown, false);
  assert.equal(result.ponds[0].finance.averageExpensePerDay, 0);
  assert.deepEqual(result.farmTotal, {
    available: true,
    currency: 'AUD',
    currencyStatus: 'configured',
    currencyDescription: 'Company currency is configured as AUD.',
    consumedFeedCost: 0,
    recordedOperatingExpenseSubtotal: 0,
    operatingExpenseEntryCount: 1,
    actualSpendUnknown: false,
  });
});

test('summarize_period_feed_and_cost: does not combine mixed recorded currencies', async () => {
  const fixture = {
    companies: { 'farm-1': { timeZone: 'UTC' } },
    ponds: { 'farm-1': { 'pond-a': {
      pondName: 'Pond A', pondCycleId: 'cycle-a', cycleStatus: 'active',
      samplings: [{ id: 'daily-feed', date: '2026-10-07', pondCycleId: 'cycle-a', feedData: { totalDailyFeed: 5 } }],
    } } },
    feeds: { 'farm-1': { 'feed-a': { usageHistory: [
      { id: 'usd-cost', date: '2026-10-07', quantity: 1, totalCost: 5, pondId: 'pond-a', pondCycleId: 'cycle-a', currency: 'USD' },
      { id: 'aud-cost', date: '2026-10-07', quantity: 1, totalCost: 7, pondId: 'pond-a', pondCycleId: 'cycle-a', currency: 'AUD' },
    ] } } },
  };
  const result = await summarizePeriodFeedAndCost({ startDate: '2026-10-07', endDate: '2026-10-07' }, {
    db: buildMockDb(fixture),
    company: fixture.companies['farm-1'],
    companyId: 'farm-1',
    allowed: (permission) => ['viewFarm', 'viewFinance'].includes(permission),
    enterpriseScoped: false,
  });

  assert.equal(result.status, 'partial');
  assert.equal(result.ponds[0].finance.consumedFeedCost, null);
  assert.equal(result.ponds[0].finance.recordedConsumedFeedCost, null);
  assert.equal(result.ponds[0].finance.consumedFeedCostStatus, 'partial');
  assert.deepEqual(result.ponds[0].finance.feedCurrencyCodes, ['AUD', 'USD']);
  assert.equal(result.ponds[0].finance.currencyStatus, 'unspecified');
  assert.match(result.ponds[0].finance.currencyDescription, /not configured.*not combined/i);
});

test('summarize_period_feed_and_cost: paginates ponds and marks the hard read cap partial', async () => {
  const makePonds = (count) => Object.fromEntries(Array.from({ length: count }, (_, index) => [
    `pond-${String(index).padStart(4, '0')}`,
    { pondName: `Pond ${index}`, cycleStatus: 'active', samplings: [] },
  ]).reverse());
  const contextFor = (ponds) => ({
    db: buildMockDb({ companies: { 'farm-1': { timeZone: 'UTC' } }, ponds: { 'farm-1': ponds } }),
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (permission) => permission === 'viewFarm',
    enterpriseScoped: false,
  });
  const period = { startDate: '2026-10-06', endDate: '2026-10-07' };

  const paged = await summarizePeriodFeedAndCost(period, contextFor(makePonds(102)));
  assert.equal(paged.ponds.length, 102);
  assert.equal(paged.ponds[0].pondId, 'pond-0000', 'Document order is stable across shuffled fixture insertion order');
  assert.equal(paged.retrieval.recordsRead.ponds, 102);
  assert.equal(paged.retrieval.pondsTruncated, false);
  assert.equal(paged.retrieval.complete, true);

  const capped = await summarizePeriodFeedAndCost(period, contextFor(makePonds(1001)));
  assert.equal(capped.ponds.length, 1000);
  assert.equal(capped.retrieval.recordsRead.ponds, 1000);
  assert.equal(capped.retrieval.pondsTruncated, true);
  assert.equal(capped.retrieval.complete, false);
  assert.equal(capped.feed.completeness, 'partial');
  assert.equal(capped.status, 'unavailable');

  const expenseRows = Object.fromEntries(Array.from({ length: 102 }, (_, index) => [
    `expense-${String(index).padStart(4, '0')}`,
    { date: '2026-10-07', amount: 1, category: 'energy', pondId: 'pond-a' },
  ]));
  const financeFixture = {
    companies: { 'farm-1': { timeZone: 'UTC', currency: 'AUD' } },
    ponds: { 'farm-1': { 'pond-a': {
      pondName: 'Pond A', cycleStatus: 'active',
      samplings: [{ id: 'feed-day', date: '2026-10-07', feedData: { totalDailyFeed: 5 } }],
    } } },
    expenses: { 'farm-1': expenseRows },
  };
  const expensePaged = await summarizePeriodFeedAndCost(period, {
    db: buildMockDb(financeFixture),
    company: financeFixture.companies['farm-1'],
    companyId: 'farm-1',
    allowed: (permission) => ['viewFarm', 'viewFinance'].includes(permission),
    enterpriseScoped: false,
  });
  assert.equal(expensePaged.retrieval.recordsRead.expenses, 102);
  assert.equal(expensePaged.retrieval.expensesTruncated, false);
  assert.equal(expensePaged.ponds[0].finance.operatingExpenseEntryCount, 102);
  assert.equal(expensePaged.ponds[0].finance.recordedOperatingExpenseSubtotal, 102);
});

test('summarize_period_feed_and_cost: enterprise technician scoping rejects unassigned block pond', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const allowedBlocks = new Set(['blk-1']);

  const context = {
    db,
    company: { timeZone: 'UTC', businessSize: 'enterprise' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: true,
    scopedData: async (dataset, record) => {
      if (dataset === 'ponds') {
        return allowedBlocks.has(record.blockId) ? record : null;
      }
      return record;
    },
    timeZone: 'UTC',
  };

  await assert.rejects(
    summarizePeriodFeedAndCost(
      {
        pondId: 'pond-restricted', // in blk-2
        startDate: '2026-09-01',
        endDate: '2026-09-05',
      },
      context,
    ),
    /Not permitted/,
    'Must reject enterprise technician access to pond in unassigned block',
  );

  const assignedPondsResult = await summarizePeriodFeedAndCost({
    startDate: '2026-09-01', endDate: '2026-09-05',
  }, context);
  assert.equal(assignedPondsResult.scope.boundary, 'assigned_ponds');
  assert.deepEqual(assignedPondsResult.ponds.map((pond) => pond.pondId).sort(), ['pond-a', 'pond-b']);
  assert.equal(Object.hasOwn(assignedPondsResult, 'finance'), false);
});

test('summarize_period_feed_and_cost: cross-company pond lookup returns not_found', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await summarizePeriodFeedAndCost(
    {
      pondId: 'pond-other', // belongs to farm-2
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    },
    context,
  );

  assert.equal(result.status, 'not_found');
  assert.match(result.message, /not found/);
});

test('compare_pond_cycles: compares two ponds with biological metrics and deltas', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await comparePondCycles(
    {
      pondId: 'pond-a',
      comparePondId: 'pond-b',
    },
    context,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.comparisonType, 'pond_to_pond');

  // Primary (Pond A)
  assert.equal(result.primary.pondId, 'pond-a');
  assert.equal(result.primary.metrics.latestMbw, 4.6);
  assert.ok(result.primary.metrics.currentBiomassKg > 0);
  assert.ok(result.primary.metrics.survivalRatePercent > 0);

  // Secondary (Pond B)
  assert.equal(result.secondary.pondId, 'pond-b');
  assert.equal(result.secondary.metrics.latestMbw, 5.5);

  // Deltas
  // MBW diff: 5.5 - 4.6 = 0.9g
  assert.equal(result.deltas.mbwDiffG, 0.9);
  assert.ok(result.deltas.feedConsumedDiffKg !== null);
  assert.equal(result.comparable, false);
  assert.deepEqual(result.insights, []); // Sparse, unaligned cycles must not be ranked.

  // Unauthorized finance: technician receives no feedCost
  assert.equal(result.finance.financeAllowed, false);
  assert.equal(result.finance.primaryFeedCost, undefined);
});

test('compare_pond_cycles: allows finance-authorized user to see feed cost comparison', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await comparePondCycles(
    {
      pondId: 'pond-a',
      comparePondId: 'pond-b',
    },
    context,
  );

  assert.equal(result.finance.financeAllowed, true);
  assert.equal(result.finance.primaryFeedCost, null); // Unpriced shared usage makes the full total unavailable.
  assert.equal(result.finance.primary.recordedConsumedFeedCost, 50); // The known subtotal is distinct from saved cycle feedCost.
  assert.equal(result.finance.secondaryFeedCost, null); // No recorded consumption valuation.
  assert.equal(result.finance.feedCostDiff, null);
});

test('compare_pond_cycles: cycle comparison on same pond aligns at specified asOfDoc', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await comparePondCycles(
    {
      pondId: 'pond-a',
      cycleId: 'cycle-101',
      compareCycleId: 'cycle-old',
      asOfDoc: 30,
    },
    context,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.comparisonType, 'cycle_to_cycle');
  assert.equal(result.scope.alignedAtDoc, 30);
  assert.equal(result.primary.metrics.doc, 30);
  assert.equal(result.secondary.metrics.doc, 30);
  assert.equal(result.secondary.effectivePond, undefined, 'effectivePond must be omitted from public DTO');
  assert.equal(result.primary.effectivePond, undefined, 'effectivePond must be omitted from public DTO');
  assert.ok(result.secondary.metrics.currentPopulation > 80000 && result.secondary.metrics.currentPopulation <= 90000,
    'historical estimate uses the cycle-specific 90000 starting population, not the active cycle population');
  assert.equal(result.finance.secondaryFeedCost, null); // No valued usage within the selected historical DOC period.
  assert.equal(result.finance.feedCostDiff, null);
});

test('compare_pond_cycles: asOfDoc cutoff filters out samplings and mortality after the cutoff DOC', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  // pond-a has cycle-101 samplings on Sep 1 (3.5g, DOC 1), Sep 2 (3.8g, DOC 2), Sep 5 (4.6g, DOC 5).
  // Aligning at DOC 2 should filter out Sep 5 (4.6g) and make latestMbw = 3.8g.
  const result = await comparePondCycles(
    {
      pondId: 'pond-a',
      cycleId: 'cycle-101',
      compareCycleId: 'cycle-old',
      asOfDoc: 2,
    },
    context,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.primary.metrics.doc, 2);
  assert.equal(result.primary.metrics.latestMbw, 3.8); // Sep 5 (4.6g) filtered out!
  assert.equal(result.primary.coverage.samplingsCount, 2); // only Sep 1 and Sep 2 included!
});

test('compare_pond_cycles: enterprise technician scoping rejects comparison with unassigned block pond', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const allowedBlocks = new Set(['blk-1']);

  const context = {
    db,
    company: { timeZone: 'UTC', businessSize: 'enterprise' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: true,
    scopedData: async (dataset, record) => {
      if (dataset === 'ponds') {
        return allowedBlocks.has(record.blockId) ? record : null;
      }
      return record;
    },
    timeZone: 'UTC',
  };

  await assert.rejects(
    comparePondCycles(
      {
        pondId: 'pond-a',
        comparePondId: 'pond-restricted', // in blk-2
      },
      context,
    ),
    /Not permitted/,
    'Must reject enterprise technician comparing pond outside assigned blocks',
  );
});

test('executeDecisionTool routes by name and rejects unknown tools', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const feedRes = await executeDecisionTool(
    'summarize_period_feed_and_cost',
    { pondId: 'pond-a', startDate: '2026-09-01', endDate: '2026-09-05' },
    context,
  );
  assert.equal(feedRes.status, 'partial');

  await assert.rejects(
    executeDecisionTool('unknown_tool', {}, context),
    /Unknown decision tool/,
  );
});

test('createOrsonAppDataReader integrates decision tools and routes execution', async () => {
  const fixture = createTestFarmFixture();
  const db = buildMockDb(fixture);

  // 1. Technician reader (has viewFarm, lacks viewFinance)
  const techReader = createOrsonAppDataReader({
    db,
    company: fixture.companies['farm-1'],
    user: fixture.users['tech-1'],
    uid: 'tech-1',
    companyId: 'farm-1',
  });

  // Tools should include read_app_records, read_pond_timeline, summarize_period_feed_and_cost, compare_pond_cycles
  const toolNames = techReader.tools.map((t) => t.name);
  assert.ok(toolNames.includes('summarize_period_feed_and_cost'));
  assert.ok(toolNames.includes('compare_pond_cycles'));

  // Execution via unified reader
  const feedSummary = await techReader.execute('summarize_period_feed_and_cost', {
    pondId: 'pond-a',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
  });
  assert.equal(feedSummary.status, 'partial');
  assert.equal(feedSummary.feed.totalFeedKg, 85);
  assert.equal(Object.hasOwn(feedSummary, 'finance'), false, 'Finance must be omitted for technician');

  const comparison = await techReader.execute('compare_pond_cycles', {
    pondId: 'pond-a',
    comparePondId: 'pond-b',
  });
  assert.equal(comparison.status, 'ok');
  assert.equal(comparison.deltas.mbwDiffG, 0.9);
  assert.equal(comparison.finance.financeAllowed, false, 'Finance must be denied to technician');

  // Decision tool: evaluate_inventory_replenishment & evaluate_harvest_scenario
  assert.ok(toolNames.includes('evaluate_inventory_replenishment'));
  assert.ok(toolNames.includes('evaluate_harvest_scenario'));
  const replEval = await executeDecisionTool('evaluate_inventory_replenishment', {
    itemId: 'feed-starter',
  }, {
    db,
    company: fixture.companies['farm-1'],
    user: fixture.users['tech-1'],
    uid: 'tech-1',
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  });
  assert.equal(replEval.status, 'ok');
  assert.equal(replEval.items[0].stockStatus.status, 'in_stock');
  assert.equal(replEval.items[0].finance.financeAllowed, false);
  assert.equal(replEval.guardrails.noProcurementExecuted, true);

  // 2. Owner reader (has viewFinance)
  const ownerReader = createOrsonAppDataReader({
    db,
    company: fixture.companies['farm-1'],
    user: fixture.users['owner-1'],
    uid: 'owner-1',
    companyId: 'farm-1',
  });

  const ownerFeedSummary = await ownerReader.execute('summarize_period_feed_and_cost', {
    pondId: 'pond-a',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
  });
  assert.equal(ownerFeedSummary.finance.financeAllowed, true, 'Owner has finance allowed');
  assert.equal(ownerFeedSummary.finance.totalExpenses, null);
  assert.equal(ownerFeedSummary.finance.recordedOperatingExpenseSubtotal, 750);
});

test('evaluate_inventory_replenishment: evaluates single feed replenishment with burn rate and runway', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await evaluateInventoryReplenishment(
    { itemId: 'feed-starter', itemType: 'feed', plannedDays: 7 },
    context,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.items.length, 1);
  const item = result.items[0];
  assert.equal(item.itemId, 'feed-starter');
  assert.equal(item.stockStatus.status, 'in_stock');
  assert.equal(item.stockStatus.availableStock, 100);
  assert.equal(item.burnRate.kgPerDay, 10);
  assert.equal(item.runway.daysOfSupply, 10);
  assert.equal(item.runway.runwayStatus, 'unknown');
  assert.equal(item.burnRate.completeness, 'partial');
  assert.equal(item.guardrails.noProcurementExecuted, true);
  assert.equal(item.guardrails.advisoryOnly, true);
});

test('evaluate_inventory_replenishment: flags zero stock with critical shortfall against required dose and immediate urgency', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await evaluateInventoryReplenishment(
    { itemId: 'feed-depleted', requiredQuantity: 60, unit: 'kg', plannedDays: 3 },
    context,
  );

  assert.equal(result.status, 'ok');
  const item = result.items[0];
  assert.equal(item.stockStatus.status, 'zero_stock');
  assert.equal(item.stockStatus.availableStock, 0);
  assert.equal(item.runway.daysOfSupply, 0);
  assert.equal(item.shortfall.shortfall, 60);
  assert.equal(item.shortfall.severity, 'critical_stockout');
  assert.equal(item.reorderAssessment.isReorderNeeded, true);
  assert.equal(item.reorderAssessment.urgency, 'immediate');
  assert.equal(item.reorderAssessment.recommendedReorderQuantity, 60);
});

test('evaluate_inventory_replenishment: handles zero recorded usage and unknown stock items', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  // Zero-usage feed
  const zeroUsageRes = await evaluateInventoryReplenishment(
    { itemId: 'feed-zero-usage' },
    context,
  );
  assert.equal(zeroUsageRes.status, 'ok');
  const zeroItem = zeroUsageRes.items[0];
  assert.equal(zeroItem.burnRate.kgPerDay, null);
  assert.equal(zeroItem.burnRate.isZeroUsage, false);
  assert.equal(zeroItem.burnRate.isUnknown, true);
  assert.equal(zeroItem.runway.runwayStatus, 'unknown');
  assert.equal(zeroItem.runway.daysOfSupply, null);

  // Unknown stock feed
  const unknownStockRes = await evaluateInventoryReplenishment(
    { itemId: 'feed-unknown-stock' },
    context,
  );
  assert.equal(unknownStockRes.status, 'ok');
  const unknownItem = unknownStockRes.items[0];
  assert.equal(unknownItem.stockStatus.status, 'unknown_stock');
  assert.equal(unknownItem.stockStatus.availableStock, null);
  assert.equal(unknownItem.reorderAssessment.urgency, 'unknown');
});

test('evaluate_inventory_replenishment: flags unit mismatch when comparing required quantity', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await evaluateInventoryReplenishment(
    { itemId: 'add-calcium', requiredQuantity: 5, unit: 'liters' },
    context,
  );

  assert.equal(result.status, 'ok');
  const item = result.items[0];
  assert.equal(item.shortfall.unitMismatch, true);
  assert.equal(item.shortfall.shortfall, null);
  assert.match(item.shortfall.reason, /Incompatible units/);
});

test('evaluate_inventory_replenishment: strictly isolates pricing from technician while providing estimated cost to owner', async () => {
  const db = buildMockDb(createTestFarmFixture());

  // Technician (no viewFinance)
  const techContext = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  };
  const techResult = await evaluateInventoryReplenishment(
    { itemId: 'add-calcium' },
    techContext,
  );
  assert.equal(techResult.items[0].finance.financeAllowed, false);
  assert.equal(techResult.items[0].finance.unitCost, undefined);
  assert.equal(techResult.items[0].finance.estimatedReplenishmentCost, undefined);

  // Owner (has viewFinance)
  const ownerContext = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };
  const ownerResult = await evaluateInventoryReplenishment(
    { itemId: 'add-calcium' },
    ownerContext,
  );
  assert.equal(ownerResult.items[0].finance.financeAllowed, true);
  assert.equal(ownerResult.items[0].finance.unitCost, 1.8);
  assert.ok(ownerResult.items[0].finance.estimatedReplenishmentCost > 0);
});

test('evaluate_inventory_replenishment: cross-company item lookup returns not_found', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await evaluateInventoryReplenishment(
    { itemId: 'feed-foreign' },
    context,
  );
  assert.equal(result.status, 'not_found');
  assert.match(result.message, /not found/);
});

test('evaluate_harvest_scenario: schema is registered in decisionToolSchemas and routable via executeDecisionTool', async () => {
  const schema = decisionToolSchemas.find((s) => s.name === 'evaluate_harvest_scenario');
  assert.ok(schema, 'evaluate_harvest_scenario must be registered in decisionToolSchemas');
  assert.equal(schema.parameters.required[0], 'pondId');

  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const routedResult = await executeDecisionTool(
    'evaluate_harvest_scenario',
    { pondId: 'pond-a', pricePerKg: 7.0 },
    context,
  );
  assert.equal(routedResult.status, 'ok');
  assert.equal(routedResult.scope.pondId, 'pond-a');
});

test('evaluate_harvest_scenario: owner evaluates harvest scenario with price ladder, explicit scope, assumptions, and margins', async () => {
  const fixture = createTestFarmFixture();
  fixture.feeds['farm-1']['feed-depleted'].usageHistory[0].totalCost = 44; // Complete valuation for this profitable case.
  const db = buildMockDb(fixture);
  const ownerContext = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const priceLadder = [
    { sizeCountPerKg: 220, pricePerKg: 3.8 },
    { sizeCountPerKg: 200, pricePerKg: 4.0 },
    { sizeCountPerKg: 100, pricePerKg: 6.5 },
    { sizeCountPerKg: 50, pricePerKg: 9.0 },
    { sizeCountPerKg: 30, pricePerKg: 12.0 },
  ];

  const result = await evaluateHarvestScenario(
    { pondId: 'pond-a', priceLadder },
    ownerContext,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.scope.pondId, 'pond-a');
  assert.equal(result.scope.cycleId, 'cycle-101');
  assert.equal(result.finance.financeAllowed, true);
  assert.ok(result.finance.incurredCostsToDate.feed > 0);
  assert.equal(result.marginBasis, 'operating_profit_after_recorded_incurred_and_supported_projected_costs');
  assert.equal(result.assumptions.growthModel, 'von_bertalanffy_tapered_growth');
  assert.equal(result.assumptions.mortalityBasis, 'recorded_mortality_trend');
  assert.equal(result.guardrails.advisoryOnly, true);
  assert.equal(result.guardrails.noFarmWrites, true);
  assert.equal(result.guardrails.noHarvestDraftCreated, true);

  // Today scenario
  assert.ok(result.today.projectedBiomassKg > 0);
  assert.ok(result.today.revenue > 0);
  assert.ok(result.today.operatingProfit !== null);

  // Target scenarios
  assert.ok(result.targets.length > 0);
  const target = result.targets[0];
  assert.ok(target.daysFromNow > 0);
  assert.ok(target.projectedMbwG > result.today.targetMbwG);
  assert.ok(target.revenue > 0);
  assert.ok(target.operatingProfit !== null);
  assert.ok(target.futureFeedKg > 0);

  // Decision
  assert.ok(['keep_growing', 'harvest_now'].includes(result.decision));
  assert.ok(result.decisionReason.length > 0);
});

test('evaluate_harvest_scenario: technician receives operational growth projection with finance strictly withheld', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const techContext = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm', // strictly lacks viewFinance
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await evaluateHarvestScenario(
    { pondId: 'pond-a', targetMbwG: 10 },
    techContext,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.finance.financeAllowed, false);
  assert.match(result.finance.reason, /User lacks viewFinance permission/);
  assert.equal(result.marginBasis, 'none_finance_withheld');

  // Verify finance leakage is strictly prevented
  assert.equal(result.today.revenue, undefined);
  assert.equal(result.today.operatingProfit, undefined);
  assert.equal(result.today.totalCosts, undefined);
  assert.equal(result.today.pricePerKg, undefined);
  assert.equal(result.assumptions.feedCostUnitPerKg, undefined, 'feedCostUnitPerKg must be stripped from assumptions for non-finance caller');

  assert.ok(result.targets.length > 0);
  const target = result.targets[0];
  assert.equal(target.revenue, undefined);
  assert.equal(target.operatingProfit, undefined);
  assert.equal(target.pricePerKg, undefined);
  assert.equal(target.futureCosts, undefined);
  assert.equal(target.totalCosts, undefined);

  // Verify operational biological projections are preserved
  assert.ok(target.projectedBiomassKg > 0);
  assert.ok(target.projectedPopulation > 0);
  assert.ok(target.futureFeedKg > 0);
  assert.equal(target.targetMbwG, 10);
  assert.equal(result.decision, 'keep_growing');
  assert.match(result.decisionReason, /positive growth/);
});

test('evaluate_harvest_scenario: missing critical biological data or missing price ladder returns review_data', async () => {
  const fixture = createTestFarmFixture();
  // Clear samplings to simulate unobserved biological data
  fixture.ponds['farm-1']['pond-unobserved'] = {
    pondName: 'Pond Unobserved',
    blockId: 'blk-1',
    initialPopulation: 100000,
    initialWeight: 0,
    samplings: [],
  };

  const db = buildMockDb(fixture);
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const missingBioResult = await evaluateHarvestScenario(
    { pondId: 'pond-unobserved', pricePerKg: 8.0 },
    context,
  );
  assert.equal(missingBioResult.decision, 'review_data');
  assert.ok(missingBioResult.missingEvidence.includes('missing_valid_sampling_mbw'));

  // Test missing market price ladder for finance user
  const missingPriceResult = await evaluateHarvestScenario(
    { pondId: 'pond-a' }, // no pricePerKg and no priceLadder
    context,
  );
  assert.equal(missingPriceResult.decision, 'review_data');
  assert.ok(missingPriceResult.missingEvidence.includes('missing_market_price'));
  assert.ok(missingPriceResult.warnings.some((w) => w.includes('Market price tiers are missing')));
});

test('evaluate_harvest_scenario: missing feed unit cost returns review_data and never defaults to 1.5', async () => {
  const fixture = createTestFarmFixture();
  // Clear feed costs and feed inventory
  fixture.feeds['farm-1'] = {};
  delete fixture.ponds['farm-1']['pond-a'].feedCost;
  fixture.expenses['farm-1'] = {};

  const db = buildMockDb(fixture);
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const priceLadder = [
    { sizeCountPerKg: 100, pricePerKg: 6.5 },
    { sizeCountPerKg: 50, pricePerKg: 9.0 },
  ];

  const result = await evaluateHarvestScenario(
    { pondId: 'pond-a', priceLadder },
    context,
  );

  assert.equal(result.decision, 'review_data');
  assert.ok(result.missingEvidence.includes('missing_historical_feed_unit_cost'));
  assert.ok(result.warnings.some((w) => w.includes('Feed unit cost is missing or zero')));
  assert.equal(result.finance.feedUnitCostPerKg, null); // Missing valuation stays unavailable.
});

test('evaluate_harvest_scenario: enterprise technician blocked from unassigned pond in block 2', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const enterpriseTechContext = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm',
    enterpriseScoped: true,
    timeZone: 'UTC',
    scopedData: async (dataset, doc) => {
      // Technician tech-1 only has block blk-1
      if (dataset === 'ponds' && doc.blockId !== 'blk-1') return null;
      return doc;
    },
  };

  await assert.rejects(
    evaluateHarvestScenario({ pondId: 'pond-restricted' }, enterpriseTechContext),
    /Not permitted/,
    'Enterprise technician must be denied access to ponds outside assigned block',
  );
});

test('evaluate_harvest_scenario: cross-company pond lookup returns not_found', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const result = await evaluateHarvestScenario(
    { pondId: 'pond-other' }, // pond-other belongs to farm-2
    context,
  );
  assert.equal(result.status, 'not_found');
  assert.match(result.message, /not found/);
});

test('evaluate_harvest_scenario: strictly read-only and executes zero Firestore mutations', async () => {
  const fixture = createTestFarmFixture();
  const db = buildMockDb(fixture);
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => ['viewFarm', 'viewFinance'].includes(p),
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  const initialPondJSON = JSON.stringify(fixture.ponds['farm-1']['pond-a']);
  const result = await evaluateHarvestScenario(
    { pondId: 'pond-a', pricePerKg: 7.5, daysToHarvest: 14 },
    context,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.guardrails.noFarmWrites, true);
  assert.equal(result.guardrails.noHarvestDraftCreated, true);
  assert.equal(result.guardrails.advisoryOnly, true);

  // Assert pond data is untouched
  const finalPondJSON = JSON.stringify(fixture.ponds['farm-1']['pond-a']);
  assert.equal(finalPondJSON, initialPondJSON, 'Pond document state in fixture must remain unchanged');
});

test('non-finance JSON serialization leakage assertion: zero secret financial fields in serialized output', async () => {
  const db = buildMockDb(createTestFarmFixture());
  const context = {
    db,
    company: { timeZone: 'UTC' },
    companyId: 'farm-1',
    allowed: (p) => p === 'viewFarm', // strictly non-finance caller
    enterpriseScoped: false,
    timeZone: 'UTC',
  };

  // 1. Period feed & cost tool
  const periodRes = await summarizePeriodFeedAndCost({ pondId: 'pond-a', startDate: '2026-09-01' }, context);
  const periodStr = JSON.stringify(periodRes);
  assert.ok(!periodStr.includes('"feedCostPerKg"'), 'Must not serialize feedCostPerKg for non-finance');
  assert.ok(!periodStr.includes('"totalExpenses"'), 'Must not serialize totalExpenses for non-finance');

  // 2. Compare pond cycles tool
  const compareRes = await comparePondCycles({ pondId: 'pond-a', comparePondId: 'pond-b' }, context);
  const compareStr = JSON.stringify(compareRes);
  assert.ok(!compareStr.includes('"effectivePond"'), 'Must not serialize internal effectivePond');
  assert.ok(!compareStr.includes('"primaryFeedCost"'), 'Must not serialize primaryFeedCost');
  assert.ok(!compareStr.includes('"secondaryFeedCost"'), 'Must not serialize secondaryFeedCost');
  assert.ok(!compareStr.includes('"feedCostDiff"'), 'Must not serialize feedCostDiff');

  // 3. Harvest scenario tool
  const harvestRes = await evaluateHarvestScenario({ pondId: 'pond-a', targetMbwG: 10 }, context);
  const harvestStr = JSON.stringify(harvestRes);
  assert.ok(!harvestStr.includes('"revenue"'), 'Must not serialize revenue for non-finance');
  assert.ok(!harvestStr.includes('"operatingProfit"'), 'Must not serialize operatingProfit for non-finance');
  assert.ok(!harvestStr.includes('"feedCostUnitPerKg"'), 'Must not serialize feedCostUnitPerKg for non-finance');
  assert.ok(!harvestStr.includes('"incurredCostsToDate"'), 'Must not serialize incurredCostsToDate for non-finance');
});

test('pure CommonJS runtime smoke test: orsonDecisionTools loads cleanly without TypeScript compiler or repo-root requires', () => {
  const resolvedPath = require.resolve('./orsonDecisionTools');
  delete require.cache[resolvedPath];
  const reloaded = require('./orsonDecisionTools');
  assert.ok(reloaded.summarizePeriodFeedAndCost);
  assert.ok(reloaded.comparePondCycles);
  assert.ok(reloaded.evaluateInventoryReplenishment);
  assert.ok(reloaded.evaluateHarvestScenario);
  assert.equal(reloaded.decisionToolSchemas.length, 4);
});

test('calendar and DOC-range comparisons use only matching-period feed valuations', async () => {
  const fixture = createTestFarmFixture();
  fixture.ponds['farm-1']['pond-b'].docStart = '2026-09-02';
  fixture.feeds['farm-1'] = { valued: { unit: 'kg', usageHistory: [
    { date: '2026-09-02', pondId: 'pond-a', cycleId: 'cycle-101', quantity: 5, totalCost: 10 },
    { date: '2026-09-03', pondId: 'pond-a', cycleId: 'cycle-101', quantity: 10, totalCost: 30 },
    { date: '2026-09-04', pondId: 'pond-a', cycleId: 'cycle-101', quantity: 30, totalCost: 90 },
    { date: '2026-09-03', pondId: 'pond-b', cycleId: 'cycle-201', quantity: 5, totalCost: 20 },
  ] } };
  const context = { db: buildMockDb(fixture), companyId: 'farm-1', company: { currency: 'USD', timeZone: 'UTC' }, allowed: () => true };
  const calendar = await executeDecisionTool('compare_pond_cycles', { pondId: 'pond-a', comparePondId: 'pond-b', startDate: '2026-09-02', endDate: '2026-09-03' }, context);
  assert.equal(calendar.finance.primaryFeedCost, 40);
  assert.equal(calendar.finance.secondaryFeedCost, 20);
  assert.equal(calendar.finance.feedCostDiff, -20);
  assert.equal(calendar.scope.alignment, 'calendar_period');
  const doc = await executeDecisionTool('compare_pond_cycles', { pondId: 'pond-a', comparePondId: 'pond-b', startDoc: 2, endDoc: 3 }, context);
  assert.equal(doc.primary.period.startDate, '2026-09-02');
  assert.equal(doc.secondary.period.startDate, '2026-09-03');
  assert.equal(doc.finance.primaryFeedCost, 40);
  assert.equal(doc.finance.secondaryFeedCost, 20);
  assert.equal(doc.primary.metrics.latestMbw, 3.8);
  assert.equal(doc.primary.metrics.periodFeedAllocatedKg, 0); // Explicit zero, not absent.
  assert.equal(doc.resultStatus, 'partial');
  assert.equal(doc.writesPerformed, 0);
});

test('cycle-selected period totals exclude current-cycle usage and use historical baselines', async () => {
  const fixture = createTestFarmFixture();
  fixture.cycles['farm-1']['cycle-old'].ponds = [{ pondId: 'pond-a', startDate: '2026-06-01', initialPopulation: 90000 }];
  fixture.feeds['farm-1'] = { f: { unit: 'kg', usageHistory: [
    { date: '2026-06-20', pondId: 'pond-a', cycleId: 'cycle-old', quantity: 10, totalCost: 20 },
    { date: '2026-06-20', pondId: 'pond-a', cycleId: 'cycle-101', quantity: 10, totalCost: 500 },
  ] } };
  const result = await executeDecisionTool('summarize_period_feed_and_cost', { pondId: 'pond-a', cycleId: 'cycle-old', startDate: '2026-06-20', endDate: '2026-06-20' }, { db: buildMockDb(fixture), companyId: 'farm-1', company: { timeZone: 'UTC' }, allowed: () => true });
  assert.equal(result.feed.totalFeedKg, 100);
  assert.equal(result.finance.consumedFeedCost, 20);
  assert.equal(result.scope.cycleId, 'cycle-old');
});

test('exact harvest horizon uses seven tapered-growth days and truthful cap assumptions', async () => {
  const fixture = createTestFarmFixture();
  const result = await executeDecisionTool('evaluate_harvest_scenario', { pondId: 'pond-a', exactDaysFromNow: 7, daysToHarvest: 14, pricePerKg: 8 }, { db: buildMockDb(fixture), companyId: 'farm-1', company: { timeZone: 'UTC' }, allowed: () => true });
  const horizon = result.targets.find(target => target.kind === 'horizon');
  assert.equal(horizon.daysFromNow, 7);
  const { projectMbwWithTapering } = require('./orsonDomain/pondCalculations');
  assert.equal(horizon.projectedMbwG, Math.round(projectMbwWithTapering(result.today.targetMbwG, result.assumptions.assumedAdgGPerDay, 7, 50) * 100) / 100);
  assert.equal(result.assumptions.maxProjectionDays, 14);
  assert.equal(result.decision, 'review_data'); // Partially priced feed must withhold superiority.
  assert.equal(result.finance.feedUnitCostPerKg, null);
  assert.equal(horizon.operatingProfit, null);
});

test('assigned technician stock access is retained without a company demand recommendation', async () => {
  const fixture = createTestFarmFixture();
  fixture.companies['farm-1'].businessSize = 'enterprise';
  const reader = createOrsonAppDataReader({ db: buildMockDb(fixture), company: fixture.companies['farm-1'], user: fixture.users['tech-1'], uid: 'tech-1', companyId: 'farm-1' });
  const result = await reader.execute('evaluate_inventory_replenishment', { itemId: 'feed-starter', requiredQuantity: 120, unit: 'kg' });
  assert.equal(result.items[0].stockStatus.availableStock, 100);
  assert.equal(result.items[0].shortfall.shortfall, 20); // Explicit requirement can be compared with shared stock.
  assert.equal(result.items[0].runway.runwayStatus, 'unknown');
  assert.equal(result.items[0].reorderAssessment.recommendedReorderQuantity, null);
  assert.equal(result.scope.boundary, 'assigned_ponds');
  assert.equal(result.resultStatus, 'partial');
  assert.equal(result.performance.documentsRead, undefined);
  assert.equal(result.retrieval.recordsRead, undefined);
});

test('malformed scenario inputs and ambiguous range modes are rejected', async () => {
  const context = { db: buildMockDb(createTestFarmFixture()), companyId: 'farm-1', company: {}, allowed: () => true };
  for (const args of [{ pondId: 'pond-a', exactDaysFromNow: 0 }, { pondId: 'pond-a', pricePerKg: null }, { pondId: 'pond-a', daysToHarvest: '7' }, { pondId: 'pond-a', priceLadder: [{ sizeCountPerKg: 30, pricePerKg: -1 }] }]) {
    await assert.rejects(executeDecisionTool('evaluate_harvest_scenario', args, context), /Invalid/);
  }
  await assert.rejects(executeDecisionTool('compare_pond_cycles', { pondId: 'pond-a', comparePondId: 'pond-b', startDoc: 2, endDoc: 4, asOfDoc: 4 }, context), /Choose/);
  await assert.rejects(executeDecisionTool('evaluate_inventory_replenishment', { incomingQuantity: 10 }, context), /arrival/);
});

test('decision output budget withholds oversized totals instead of truncating a result silently', async () => {
  const { createDecisionBudget } = require('./orsonDecisionReadSession');
  const result = await executeDecisionTool('summarize_period_feed_and_cost', { pondId: 'pond-a', startDate: '2026-09-01', endDate: '2026-09-05' }, { db: buildMockDb(createTestFarmFixture()), companyId: 'farm-1', company: {}, allowed: () => true, decisionBudget: createDecisionBudget({ maxOutputBytes: 1500 }) });
  assert.equal(result.resultStatus, 'insufficient_data');
  assert.deepEqual(result.missingEvidence, ['decision_output_budget_exceeded']);
  assert.equal(result.feed, undefined);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 1500);
});

test('revoked membership and finance permissions cannot reuse an existing reader', async () => {
  for (const revoke of ['membership', 'finance']) {
    const fixture = createTestFarmFixture();
    fixture.companies['farm-1'].teamMembers.push('manager');
    fixture.users.manager = { role: 'manager', companyId: 'farm-1' };
    const reader = createOrsonAppDataReader({ db: buildMockDb(fixture), company: { ...fixture.companies['farm-1'] }, user: { ...fixture.users.manager }, uid: 'manager', companyId: 'farm-1' });
    if (revoke === 'membership') fixture.companies['farm-1'].teamMembers = ['owner-1'];
    else fixture.users.manager.permissionOverrides = { viewFinance: false };
    await assert.rejects(reader.execute('summarize_period_feed_and_cost', { pondId: 'pond-a' }), /Not permitted/);
  }
});

test('source mutation during decision reads discards amounts and recommendations', async () => {
  const fixture = createTestFarmFixture();
  const original = buildMockDb(fixture);
  let reads = 0;
  const intercept = ref => new Proxy(ref, { get(target, key) {
    const value = target[key];
    if (key === 'get') return async () => {
      reads += 1;
      if (reads === 2) fixture.ponds['farm-1']['pond-a'].samplings = [];
      return value.call(target);
    };
    return typeof value === 'function' ? (...args) => intercept(value.apply(target, args)) : value;
  } });
  const result = await executeDecisionTool('summarize_period_feed_and_cost', { pondId: 'pond-a', startDate: '2026-09-01', endDate: '2026-09-05' }, { db: intercept(original), companyId: 'farm-1', company: {}, allowed: permission => permission === 'viewFarm' });
  assert.equal(result.resultStatus, 'insufficient_data');
  assert.deepEqual(result.missingEvidence, ['sources_changed_during_read']);
  assert.equal(result.feed, undefined);
  assert.equal(result.coverage.retrievalComplete, false);
});

test('harvest cost currencies cannot be silently mixed', async () => {
  const fixture = createTestFarmFixture();
  fixture.feeds['farm-1']['feed-starter'].usageHistory[0].currency = 'USD';
  fixture.feeds['farm-1']['feed-starter'].usageHistory[1].currency = 'IDR';
  const result = await executeDecisionTool('evaluate_harvest_scenario', { pondId: 'pond-a', exactDaysFromNow: 7, pricePerKg: 8 }, { db: buildMockDb(fixture), companyId: 'farm-1', company: { currency: 'USD' }, allowed: () => true });
  assert.equal(result.decision, 'review_data');
  assert.equal(result.today.revenue, undefined);
  assert.equal(result.finance.incurredCostsToDate, undefined);
  assert.ok(result.warnings.some(warning => warning.includes('currencies')));
});

test('scale fixtures measure bounded reads and reject oversized output', async () => {
  for (const pondCount of [1, 10, 100]) {
    const fixture = createTestFarmFixture();
    fixture.ponds['farm-1'] = Object.fromEntries(Array.from({ length: pondCount }, (_, index) => [`p-${index}`, {
      pondName: `Pond ${index}`, cycleId: `c-${index}`, cycleStatus: 'active', docStart: '2026-09-01', samplings: [
        { id: `feed-${index}`, date: '2026-09-01', cycleId: `c-${index}`, feedData: { totalDailyFeed: 10 } },
      ],
    }]));
    const args = { startDate: '2026-09-01', endDate: '2026-09-30' };
    const context = { db: buildMockDb(fixture), companyId: 'farm-1', company: { timeZone: 'UTC' }, allowed: permission => permission === 'viewFarm' };
    const result = await executeDecisionTool('summarize_period_feed_and_cost', args, context);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 64 * 1024);
    assert.ok(result.performance.documentsRead <= 12000);
    assert.ok(result.performance.peakConcurrentReads <= 4);
    if (pondCount === 100) assert.deepEqual(result.missingEvidence, ['decision_output_budget_exceeded']);
    if (process.env.ORSON_DECISION_BASELINE_DIR) {
      let calls = 0;
      let documents = 0;
      const observe = ref => new Proxy(ref, { get(target, key) {
        const value = target[key];
        if (key === 'get') return async () => { calls += 1; const snapshot = await value.call(target); documents += snapshot.docs?.length ?? (snapshot.exists ? 1 : 0); return snapshot; };
        return typeof value === 'function' ? (...values) => observe(value.apply(target, values)) : value;
      } });
      const baseline = require(`${process.env.ORSON_DECISION_BASELINE_DIR}/functions/shared/orsonDecisionTools.js`);
      const old = await baseline.executeDecisionTool('summarize_period_feed_and_cost', args, { ...context, db: observe(buildMockDb(fixture)) });
      console.log(JSON.stringify({ pondCount, before: { calls, documents, outputBytes: Buffer.byteLength(JSON.stringify(old)) }, after: result.performance, resultStatus: result.resultStatus }));
    }
  }
});

test('recorded feeding returns reconcile period cost instead of leaving the original consumption value', async () => {
  const fixture = createTestFarmFixture();
  fixture.feeds['farm-1'] = { f: { unit: 'kg', usageHistory: [
    { date: '2026-09-01', pondId: 'pond-a', cycleId: 'cycle-101', quantity: 10, totalCost: 20 },
    { date: '2026-09-01', pondId: 'pond-a', cycleId: 'cycle-101', quantity: -5, totalCost: -10, source: 'daily_feed_record', feedRecordId: 'deleted' },
  ] } };
  const result = await executeDecisionTool('summarize_period_feed_and_cost', { pondId: 'pond-a', startDate: '2026-09-01', endDate: '2026-09-01' }, { db: buildMockDb(fixture), companyId: 'farm-1', company: {}, allowed: () => true });
  assert.equal(result.finance.consumedFeedCost, 10);
  assert.equal(result.finance.feedUsageRecordsMissingCost, 0);
});

test('flat price is applied equally to today and exact-day projections, including a plateau', async () => {
  const fixture = createTestFarmFixture();
  fixture.ponds['farm-1']['pond-a'].samplings.forEach(record => { if (record.pondCycleId === 'cycle-101') record.mbw = 20; });
  const result = await executeDecisionTool('evaluate_harvest_scenario', { pondId: 'pond-a', exactDaysFromNow: 7, pricePerKg: 8 }, { db: buildMockDb(fixture), companyId: 'farm-1', company: {}, allowed: () => true });
  const horizon = result.targets.find(target => target.kind === 'horizon');
  assert.equal(horizon.daysFromNow, 7);
  assert.equal(horizon.projectedMbwG, 20);
  assert.equal(horizon.pricePerKg, 8);
  assert.equal(result.today.pricePerKg, 8);
});

test('changed technician block assignments invalidate a cached authorized pond scope', async () => {
  const fixture = createTestFarmFixture();
  fixture.companies['farm-1'].businessSize = 'enterprise';
  const reader = createOrsonAppDataReader({ db: buildMockDb(fixture), company: fixture.companies['farm-1'], user: fixture.users['tech-1'], uid: 'tech-1', companyId: 'farm-1' });
  await reader.execute('evaluate_inventory_replenishment', { itemId: 'feed-starter' });
  fixture.blocks['farm-1']['blk-1'].assignedTechnicianId = 'replacement-tech';
  const result = await reader.execute('evaluate_inventory_replenishment', { itemId: 'feed-starter' });
  assert.equal(result.resultStatus, 'insufficient_data');
  assert.deepEqual(result.missingEvidence, ['authorization_scope_changed']);
  assert.equal(result.items, undefined);
});
