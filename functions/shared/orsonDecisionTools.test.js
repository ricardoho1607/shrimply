'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  summarizePeriodFeedAndCost,
  comparePondCycles,
  evaluateInventoryReplenishment,
  executeDecisionTool,
  decisionToolSchemas,
  periodFeedCostTool,
  comparePondCyclesTool,
  inventoryReplenishmentTool,
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
  };

  const makeQuery = (items, filters = []) => ({
    where: (field, op, val) =>
      makeQuery(items, [...filters, { field, op, val }]),
    orderBy: () => makeQuery(items, filters),
    limit: (n) => ({
      get: async () => {
        let res = [...items];
        for (const f of filters) {
          if (f.op === '==') res = res.filter((it) => it.data[f.field] === f.val);
        }
        return {
          docs: res.slice(0, n).map((it) => ({
            id: it.id,
            exists: true,
            data: () => ({ ...it.data }),
          })),
        };
      },
    }),
    get: async () => {
      let res = [...items];
      for (const f of filters) {
        if (f.op === '==') res = res.filter((it) => it.data[f.field] === f.val);
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
    collection: (collName) => ({
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
          const items = Object.entries(subMap).map(([id, itemData]) => ({
            id,
            data: itemData,
          }));
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
            where: (field, op, val) => makeQuery(items, [{ field, op, val }]),
            get: async () => makeQuery(items).get(),
          };
        },
      }),
      where: (field, op, val) => {
        const topMap = store[collName] || {};
        const items = Object.entries(topMap).map(([id, itemData]) => ({
          id,
          data: itemData,
        }));
        return makeQuery(items, [{ field, op, val }]);
      },
      get: async () => {
        const topMap = store[collName] || {};
        const items = Object.entries(topMap).map(([id, itemData]) => ({
          id,
          data: itemData,
        }));
        return makeQuery(items).get();
      },
    }),
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
              date: '2026-08-01',
              pondCycleId: 'cycle-old',
              mbw: 12.0,
              feedData: { totalDailyFeed: 100 },
            },
          ],
          mortalityRecords: [
            { date: '2026-09-02', pondCycleId: 'cycle-101', count: 20 },
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
            { date: '2026-09-01', quantity: 10 },
            { date: '2026-09-02', quantity: 10 },
          ],
        },
        'feed-depleted': {
          feedName: 'Finisher Pellet',
          totalStock: 0,
          reorderLevel: 40,
          unit: 'kg',
          costPerUnit: 2.2,
          usageHistory: [
            { date: '2026-09-01', quantity: 20 },
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
            { date: '2026-09-01', quantity: 5 },
          ],
        },
      },
    },
  };
};

test('decisionToolSchemas exposes valid tool definitions with parameters', () => {
  assert.equal(decisionToolSchemas.length, 3);
  assert.equal(periodFeedCostTool.name, 'summarize_period_feed_and_cost');
  assert.equal(comparePondCyclesTool.name, 'compare_pond_cycles');
  assert.equal(inventoryReplenishmentTool.name, 'evaluate_inventory_replenishment');
  assert.ok(periodFeedCostTool.parameters.required.includes('startDate'));
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

  assert.equal(result.status, 'ok');
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
  assert.equal(result.finance.financeAllowed, false);
  assert.equal(result.finance.totalExpenses, null);
  assert.equal(result.finance.expensesByCategory, null);
  assert.match(result.finance.reason, /viewFinance/);
});

test('summarize_period_feed_and_cost: includes full expense breakdown and cost per kg for finance-authorized user', async () => {
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
      pondId: 'pond-a',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    },
    context,
  );

  assert.equal(result.status, 'ok');
  assert.equal(result.finance.financeAllowed, true);

  // exp-1 (feed: 500) and exp-2 (chemicals: 250) match pond-a. exp-voided (9999) excluded.
  assert.equal(result.finance.totalExpenses, 750);
  assert.equal(result.finance.expenseCount, 2);
  assert.equal(result.finance.expensesByCategory.feed, 500);
  assert.equal(result.finance.expensesByCategory.chemicals, 250);
  assert.equal(result.finance.averageExpensePerDay, 150); // 750 / 5 days

  // feedCostPerKg: 500 feed expense / 85 kg feed = 5.88
  assert.equal(result.finance.feedCostPerKg, 5.88);
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

  assert.equal(result.status, 'ok');
  assert.equal(result.scope.pondId, null);
  assert.ok(result.scope.pondsCount >= 2);

  // Pond A feed (85) + Pond B feed (55 on Sep 1 + 60 on Sep 5 = 115) = 200kg total
  assert.equal(result.feed.totalFeedKg, 200);
  assert.ok(Array.isArray(result.feed.ponds));
  assert.equal(result.feed.ponds.length, 3); // pond-a, pond-b, pond-restricted

  // Farm-wide expenses: exp-1 (500) + exp-2 (250) + exp-3 (800) = 1550
  assert.equal(result.finance.totalExpenses, 1550);
  assert.equal(result.finance.expensesByCategory.energy, 800);
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
  assert.ok(result.insights.length > 0);

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
  assert.equal(result.finance.primaryFeedCost, 4500);
  assert.equal(result.finance.secondaryFeedCost, 6000);
  assert.equal(result.finance.feedCostDiff, 1500); // 6000 - 4500
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
  assert.equal(feedRes.status, 'ok');

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
  assert.equal(feedSummary.status, 'ok');
  assert.equal(feedSummary.feed.totalFeedKg, 85);
  assert.equal(feedSummary.finance.financeAllowed, false, 'Finance must be denied to technician');

  const comparison = await techReader.execute('compare_pond_cycles', {
    pondId: 'pond-a',
    comparePondId: 'pond-b',
  });
  assert.equal(comparison.status, 'ok');
  assert.equal(comparison.deltas.mbwDiffG, 0.9);
  assert.equal(comparison.finance.financeAllowed, false, 'Finance must be denied to technician');

  // Decision tool: evaluate_inventory_replenishment
  assert.ok(toolNames.includes('evaluate_inventory_replenishment'));
  const replEval = await techReader.execute('evaluate_inventory_replenishment', {
    itemId: 'feed-starter',
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
  assert.equal(ownerFeedSummary.finance.totalExpenses, 750);
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
  assert.equal(item.runway.runwayStatus, 'adequate');
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
    { itemId: 'feed-depleted', requiredQuantity: 60, unit: 'kg' },
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
  assert.equal(zeroItem.burnRate.kgPerDay, 0);
  assert.equal(zeroItem.burnRate.isZeroUsage, true);
  assert.equal(zeroItem.runway.runwayStatus, 'stable_zero_consumption');
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
