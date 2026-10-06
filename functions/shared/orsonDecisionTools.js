'use strict';

const { hasUserPermission } = require('./permissions');
const { selectDailyFeedEntries } = require('./orsonDomain/orsonEvidence');
const { normalizeFarmDateKey, getFarmDateKey } = require('./orsonDomain/farmDate');
const {
  calculatePondMetricsWithHarvest,
  calculateAdg,
  getPondCurrentDoc,
  toFiniteNumber,
  daysToTargetMbwWithTapering,
  projectMbwWithTapering,
  calculateExpectedSurvivalRetention,
} = require('./orsonDomain/pondCalculations');
const { evaluateReplenishmentScenario } = require('./orsonInventoryPolicy');

/**
 * Canonically identifies inventory stock-in purchases to avoid double-counting.
 */
const isInventoryPurchaseExpense = (expense) =>
  Boolean(
    expense?.reference?.startsWith('INVENTORY-') ||
    expense?.linkedInventory?.trim() ||
    String(expense?.category || '').toLowerCase().includes('feed purchase')
  );

/**
 * Canonically allocates cycle-level shared expenses evenly across all ponds in the cycle.
 */
const allocateExpenseAcrossCyclePonds = (amount, cycleId, ponds) => {
  if (!cycleId || !Number.isFinite(amount) || amount <= 0) return [];

  const cyclePonds = (ponds || [])
    .filter((pond) => (pond.cycleId === cycleId || pond.pondCycleId === cycleId))
    .sort((first, second) =>
      String(first.pondName || first.name || first.id).localeCompare(
        String(second.pondName || second.name || second.id),
        undefined,
        { numeric: true }
      )
    );
  if (cyclePonds.length === 0) return [];

  const totalMinorUnits = Math.round(amount * 100);
  const baseMinorUnits = Math.floor(totalMinorUnits / cyclePonds.length);
  const remainder = totalMinorUnits - (baseMinorUnits * cyclePonds.length);
  const share = 1 / cyclePonds.length;

  return cyclePonds.map((pond, index) => ({
    pondId: pond.id,
    pondName: pond.pondName || pond.name || pond.id,
    pondCycleId: pond.pondCycleId || pond.id,
    amount: (baseMinorUnits + (index < remainder ? 1 : 0)) / 100,
    share,
  }));
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const validId = (value) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 160 &&
  !value.includes('/') &&
  !['.', '..'].includes(value);

const validDateKey = (value) => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const finite = (value) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const nonNegative = (value) => Math.max(0, finite(value) || 0);

const round = (value, decimals = 2) => {
  const number = finite(value);
  if (number === null) return null;
  const factor = 10 ** decimals;
  return Math.round((number + Number.EPSILON) * factor) / factor;
};

const shiftDate = (value, days) =>
  new Date(Date.parse(`${value}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);

const farmToday = (timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = (type) => parts.find((item) => item.type === type)?.value;
    const result = `${part('year')}-${part('month')}-${part('day')}`;
    return ISO_DATE.test(result) ? result : new Date().toISOString().slice(0, 10);
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
};

const belongsToCurrentCycle = (record, pond) => {
  const current = [pond.pondCycleId, pond.cycleId].filter((value) => typeof value === 'string' && value);
  if (!current.length) return true;
  const recorded = [record?.pondCycleId, record?.cycleId].filter((value) => typeof value === 'string' && value);
  return !recorded.length || recorded.some((value) => current.includes(value));
};

const periodFeedCostTool = {
  type: 'function',
  name: 'summarize_period_feed_and_cost',
  description:
    'Summarize feeding totals, feeding regularity/coverage, and expense breakdowns for one pond or all accessible ponds over a specified date period. Non-finance users receive feed totals and coverage metrics while financial costs are strictly excluded. No writes.',
  parameters: {
    type: 'object',
    properties: {
      pondId: {
        type: 'string',
        description:
          'Optional exact pond ID. If omitted or "all", aggregates across all accessible ponds in the company.',
      },
      startDate: {
        type: 'string',
        description: 'Inclusive start date in YYYY-MM-DD format.',
      },
      endDate: {
        type: 'string',
        description: 'Inclusive end date in YYYY-MM-DD format. Defaults to farm today.',
      },
    },
    required: ['startDate'],
    additionalProperties: false,
  },
};

const comparePondCyclesTool = {
  type: 'function',
  name: 'compare_pond_cycles',
  description:
    'Compare biological growth, FCR, survival rate, biomass, and feed performance between two ponds or between two production cycles of the same pond. Supports age alignment at a specific Day of Culture (asOfDoc). Non-finance users receive operational metrics while financial costs are strictly excluded. No writes.',
  parameters: {
    type: 'object',
    properties: {
      pondId: {
        type: 'string',
        description: 'Primary pond ID.',
      },
      cycleId: {
        type: 'string',
        description: 'Optional cycle ID for primary pond (defaults to active/current cycle).',
      },
      comparePondId: {
        type: 'string',
        description:
          'Secondary pond ID to compare against. If omitted, compares primary pond across cycles (requires compareCycleId).',
      },
      compareCycleId: {
        type: 'string',
        description: 'Secondary cycle ID (for the second pond or historical cycle of primary pond).',
      },
      asOfDoc: {
        type: 'integer',
        minimum: 1,
        maximum: 200,
        description: 'Optional Day of Culture (DOC) cutoff to align both cycles at the exact same biological age.',
      },
    },
    required: ['pondId'],
    additionalProperties: false,
  },
};

const inventoryReplenishmentTool = {
  type: 'function',
  name: 'evaluate_inventory_replenishment',
  description:
    'Evaluate inventory stock levels, burn rate, days of supply (runway), and replenishment needs for feeds or additives. Supports shortfall calculation against a planned dose or consumption target. Purely analytical: executes no procurement actions and makes no Firestore writes.',
  parameters: {
    type: 'object',
    properties: {
      itemId: {
        type: 'string',
        description:
          'Optional exact inventory item ID (from feeds or additives). If omitted, evaluates all items in catalog.',
      },
      itemType: {
        type: 'string',
        enum: ['feed', 'additive', 'all'],
        description: 'Type of inventory items to evaluate (default: all).',
      },
      requiredQuantity: {
        type: 'number',
        description: 'Optional planned quantity required for treatment or upcoming feeding period.',
      },
      unit: {
        type: 'string',
        description: 'Unit of required quantity (e.g. kg, L, bags).',
      },
      plannedDays: {
        type: 'integer',
        minimum: 1,
        maximum: 90,
        description: 'Optional planning horizon in days to evaluate safety stock and runway (default: 7).',
      },
    },
    additionalProperties: false,
  },
};

const harvestScenarioTool = {
  type: 'function',
  name: 'evaluate_harvest_scenario',
  description:
    'Evaluate read-only harvest scenarios comparing harvesting today versus continuing to grow to target market sizes or dates. Projects population retention, tapered growth, feed requirements, and operating profit against market prices. Non-finance users receive biological and biomass projections with financial margins withheld. Purely advisory: performs no harvest operations and no Firestore writes.',
  parameters: {
    type: 'object',
    properties: {
      pondId: {
        type: 'string',
        description: 'Exact pond ID to evaluate.',
      },
      cycleId: {
        type: 'string',
        description: 'Optional cycle ID (defaults to active cycle).',
      },
      targetMbwG: {
        type: 'number',
        description: 'Optional specific target Mean Body Weight in grams (e.g. 25, 30).',
      },
      targetSizeCountPerKg: {
        type: 'number',
        description: 'Optional target shrimp size count per kg (e.g. 30, 40, 50).',
      },
      daysToHarvest: {
        type: 'integer',
        minimum: 1,
        maximum: 120,
        description: 'Optional projection horizon in days from now (1-120).',
      },
      pricePerKg: {
        type: 'number',
        description: 'Optional expected flat market price per kg in farm currency.',
      },
      priceLadder: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sizeCountPerKg: { type: 'number' },
            pricePerKg: { type: 'number' },
          },
          required: ['sizeCountPerKg', 'pricePerKg'],
          additionalProperties: false,
        },
        description: 'Optional market price tiers by shrimp count per kg.',
      },
    },
    required: ['pondId'],
    additionalProperties: false,
  },
};

const decisionToolSchemas = [
  periodFeedCostTool,
  comparePondCyclesTool,
  inventoryReplenishmentTool,
  harvestScenarioTool,
];

/**
 * Summarize period feed and costs across one or all accessible ponds.
 */
const summarizePeriodFeedAndCost = async (args = {}, context = {}) => {
  const { db, company, companyId, allowed, enterpriseScoped, scopedData, timeZone } = context;
  if (!allowed || !allowed('viewFarm')) throw new Error('Not permitted');

  const tz = timeZone || company?.timeZone || 'UTC';
  const startDate = args.startDate;
  const endDate = args.endDate || farmToday(tz);

  if (!validDateKey(startDate)) throw new Error('Invalid start date');
  if (!validDateKey(endDate)) throw new Error('Invalid end date');

  const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T00:00:00.000Z`);
  if (startMs > endMs) {
    throw new Error('Invalid date range: startDate must be on or before endDate');
  }
  const daysInPeriod = Math.round((endMs - startMs) / DAY_MS) + 1;
  if (daysInPeriod > 366) {
    throw new Error('Date range exceeds maximum allowed window of 366 days');
  }

  const requestedPondId = args.pondId && args.pondId !== 'all' ? args.pondId.trim() : null;
  if (requestedPondId && !validId(requestedPondId)) {
    throw new Error('Invalid pond ID');
  }

  const pondsRef = db.collection('companies').doc(companyId).collection('ponds');
  const targetPonds = [];
  let pondsTruncated = false;

  if (requestedPondId) {
    const pondSnap = await pondsRef.doc(requestedPondId).get();
    if (!pondSnap.exists) {
      return { status: 'not_found', message: `Pond ${requestedPondId} not found.` };
    }
    const rawData = pondSnap.data() || {};
    if (scopedData) {
      const scoped = await scopedData('ponds', rawData);
      if (!scoped) throw new Error('Not permitted');
    }
    targetPonds.push({ id: pondSnap.id, ...rawData });
  } else {
    const snap = await pondsRef.limit(100).get();
    pondsTruncated = snap.docs.length >= 100;
    for (const doc of snap.docs) {
      const rawData = doc.data() || {};
      if (scopedData) {
        const scoped = await scopedData('ponds', rawData);
        if (!scoped) continue;
      }
      targetPonds.push({ id: doc.id, ...rawData });
    }
  }

  if (targetPonds.length === 0) {
    return {
      status: 'ok',
      scope: {
        companyId,
        pondId: requestedPondId,
        pondsCount: 0,
        enterpriseScoped: Boolean(enterpriseScoped),
      },
      period: { startDate, endDate, daysInPeriod },
      feed: {
        totalFeedKg: 0,
        daysWithFeedRecorded: 0,
        daysWithExplicitZero: 0,
        daysUnrecorded: daysInPeriod,
        averageDailyFeedKg: null,
        coveragePercent: 0,
        completeness: 'sparse',
      },
      finance: {
        financeAllowed: allowed('viewFinance'),
        totalExpenses: null,
        expensesByCategory: null,
      },
      retrieval: {
        pondsTruncated,
        expensesTruncated: false,
        complete: !pondsTruncated,
      },
    };
  }

  // Aggregate daily feed entries per pond using canonical selectDailyFeedEntries
  let totalFeedKg = 0;
  const pondFeedSummaries = [];
  const allRecordedDates = new Set();
  const allExplicitZeroDates = new Set();

  for (const pond of targetPonds) {
    const samplings = (Array.isArray(pond.samplings) ? pond.samplings : []).filter((s) =>
      belongsToCurrentCycle(s, pond),
    );

    const canonicalFeedEntries = selectDailyFeedEntries(samplings, {
      allowSamplingEstimate: false,
      asOfDate: endDate,
      timeZone: tz,
    });

    const filtered = canonicalFeedEntries.filter(
      (entry) => entry.farmDate >= startDate && entry.farmDate <= endDate,
    );

    let pondFeedSum = 0;
    let pondZeroCount = 0;
    const pondRecordedDates = new Set();

    for (const entry of filtered) {
      pondRecordedDates.add(entry.farmDate);
      allRecordedDates.add(entry.farmDate);
      if (entry.feedKg === 0) {
        pondZeroCount += 1;
        allExplicitZeroDates.add(entry.farmDate);
      } else {
        pondFeedSum += entry.feedKg;
      }
    }

    totalFeedKg += pondFeedSum;
    pondFeedSummaries.push({
      pondId: pond.id,
      pondName: String(pond.pondName || pond.name || pond.id).slice(0, 160),
      totalFeedKg: round(pondFeedSum, 2),
      recordedDays: pondRecordedDates.size,
      explicitZeroDays: pondZeroCount,
      averageDailyFeedKg:
        pondRecordedDates.size > 0 ? round(pondFeedSum / pondRecordedDates.size, 2) : null,
    });
  }

  // Coverage over expected pond-days across target ponds
  const totalExpectedPondDays = targetPonds.length * daysInPeriod;
  const totalRecordedPondDays = pondFeedSummaries.reduce((sum, p) => sum + p.recordedDays, 0);
  const totalExplicitZeroDays = pondFeedSummaries.reduce((sum, p) => sum + p.explicitZeroDays, 0);
  const daysUnrecorded = Math.max(0, totalExpectedPondDays - totalRecordedPondDays);
  const feedCoveragePercent = totalExpectedPondDays > 0
    ? round((totalRecordedPondDays / totalExpectedPondDays) * 100, 1) || 0
    : 0;
  const averageDailyFeedKg =
    totalRecordedPondDays > 0 ? round(totalFeedKg / totalRecordedPondDays, 2) : null;

  const feedCompleteness =
    feedCoveragePercent >= 90 ? 'complete' : feedCoveragePercent >= 50 ? 'partial' : 'sparse';

  // Strict Finance Gating: only query and expose expenses if user has viewFinance
  const canViewFinance = Boolean(allowed('viewFinance'));
  let financeData = {
    financeAllowed: false,
    reason: 'User lacks viewFinance permission. Financial costs excluded.',
    totalExpenses: null,
    expensesByCategory: null,
  };
  let expensesTruncated = false;

  if (canViewFinance) {
    let totalExpenses = 0;
    const expensesByCategory = {};
    let expenseCount = 0;

    const expensesRef = db.collection('companies').doc(companyId).collection('expenses');
    const expenseSnap = await expensesRef.limit(500).get();
    expensesTruncated = expenseSnap.docs.length >= 500;

    const accessiblePondIds = new Set(targetPonds.map((p) => p.id));

    for (const doc of expenseSnap.docs) {
      const exp = { id: doc.id, ...(doc.data() || {}) };
      if (exp.voided === true || exp.isVoid === true) continue;
      if (isInventoryPurchaseExpense(exp)) continue; // exclude purchases to prevent double-counting with feed usage

      const expDate = normalizeFarmDateKey(exp.date, tz);
      if (!expDate || expDate < startDate || expDate > endDate) continue;

      const amount = finite(exp.amount);
      if (amount === null || amount <= 0) continue;

      let allocatedAmountForScope = 0;

      if (requestedPondId) {
        if (exp.pondId === requestedPondId) {
          allocatedAmountForScope = amount;
        } else if (Array.isArray(exp.pondIds) && exp.pondIds.includes(requestedPondId)) {
          allocatedAmountForScope = exp.pondIds.length > 0 ? amount / exp.pondIds.length : 0;
        } else if (exp.cycleId) {
          // Shared cycle expense: canonically allocate across accessible cycle ponds (excluding unassigned blocks)
          const allocations = allocateExpenseAcrossCyclePonds(amount, exp.cycleId, targetPonds);
          const myAlloc = allocations.find((a) => a.pondId === requestedPondId);
          if (myAlloc) {
            allocatedAmountForScope = myAlloc.amount;
          }
        }
      } else {
        // All accessible ponds scope
        if (exp.pondId) {
          if (accessiblePondIds.has(exp.pondId)) {
            allocatedAmountForScope = amount;
          }
        } else if (exp.cycleId) {
          const allocations = allocateExpenseAcrossCyclePonds(amount, exp.cycleId, targetPonds);
          allocatedAmountForScope = allocations.reduce((sum, a) => sum + a.amount, 0);
        } else if (Array.isArray(exp.pondIds)) {
          const matching = exp.pondIds.filter((pid) => accessiblePondIds.has(pid));
          if (matching.length > 0 && exp.pondIds.length > 0) {
            allocatedAmountForScope = (amount * matching.length) / exp.pondIds.length;
          }
        } else {
          // Company-wide expense
          if (!enterpriseScoped) {
            allocatedAmountForScope = amount;
          }
        }
      }

      if (allocatedAmountForScope > 0) {
        totalExpenses += allocatedAmountForScope;
        expenseCount += 1;
        const rawCategory = String(exp.category || 'other').toLowerCase().trim();
        expensesByCategory[rawCategory] = round((expensesByCategory[rawCategory] || 0) + allocatedAmountForScope, 2);
      }
    }

    const feedExpense = expensesByCategory.feed || expensesByCategory.feeding || 0;
    financeData = {
      financeAllowed: true,
      totalExpenses: round(totalExpenses, 2),
      expenseCount,
      expensesByCategory,
      averageExpensePerDay: round(totalExpenses / daysInPeriod, 2),
      feedCostPerKg:
        totalFeedKg > 0 && feedExpense > 0 ? round(feedExpense / totalFeedKg, 2) : null,
      completeness: expensesTruncated ? 'partial' : 'complete',
    };
  }

  return {
    status: 'ok',
    scope: {
      companyId,
      pondId: requestedPondId,
      pondsCount: targetPonds.length,
      enterpriseScoped: Boolean(enterpriseScoped),
    },
    period: {
      startDate,
      endDate,
      daysInPeriod,
    },
    feed: {
      totalFeedKg: round(totalFeedKg, 2),
      daysWithFeedRecorded: totalRecordedPondDays,
      daysWithExplicitZero: totalExplicitZeroDays,
      daysUnrecorded,
      expectedPondDays: totalExpectedPondDays,
      recordedPondDays: totalRecordedPondDays,
      averageDailyFeedKg,
      coveragePercent: feedCoveragePercent,
      completeness: feedCompleteness,
      ponds: requestedPondId ? undefined : pondFeedSummaries,
    },
    finance: financeData,
    retrieval: {
      pondsTruncated,
      expensesTruncated,
      complete: !pondsTruncated && !expensesTruncated,
    },
  };
};

/**
 * Compare biological growth, FCR, survival rate, biomass, and feed performance
 * between two ponds or between two production cycles of the same pond.
 */
const comparePondCycles = async (args = {}, context = {}) => {
  const { db, company, companyId, allowed, enterpriseScoped, scopedData, timeZone } = context;
  if (!allowed || !allowed('viewFarm')) throw new Error('Not permitted');

  const tz = timeZone || company?.timeZone || 'UTC';
  const pondId = args.pondId ? args.pondId.trim() : null;
  const cycleId = args.cycleId ? args.cycleId.trim() : null;
  const comparePondId = args.comparePondId ? args.comparePondId.trim() : null;
  const compareCycleId = args.compareCycleId ? args.compareCycleId.trim() : null;
  const asOfDoc = args.asOfDoc !== undefined ? Number(args.asOfDoc) : null;

  if (!pondId || !validId(pondId)) throw new Error('Invalid primary pond ID');
  if (comparePondId && !validId(comparePondId)) throw new Error('Invalid compare pond ID');
  if (cycleId && !validId(cycleId)) throw new Error('Invalid cycle ID');
  if (compareCycleId && !validId(compareCycleId)) throw new Error('Invalid compare cycle ID');
  if (asOfDoc !== null && (!Number.isInteger(asOfDoc) || asOfDoc < 1 || asOfDoc > 200)) {
    throw new Error('Invalid asOfDoc: must be an integer between 1 and 200');
  }

  if (!comparePondId && !compareCycleId) {
    throw new Error(
      'Provide either comparePondId (to compare two ponds) or compareCycleId (to compare cycles for the same pond).',
    );
  }

  const isCrossPond = Boolean(comparePondId && comparePondId !== pondId);
  const secondaryPondId = isCrossPond ? comparePondId : pondId;

  const pondsRef = db.collection('companies').doc(companyId).collection('ponds');
  const primarySnap = await pondsRef.doc(pondId).get();
  if (!primarySnap.exists) {
    return { status: 'not_found', message: `Primary pond ${pondId} not found.` };
  }
  let primaryData = { id: primarySnap.id, ...(primarySnap.data() || {}) };
  if (scopedData) {
    const scoped = await scopedData('ponds', primaryData);
    if (!scoped) throw new Error('Not permitted');
    primaryData = scoped;
  }

  let secondaryData = primaryData;
  if (isCrossPond) {
    const secondarySnap = await pondsRef.doc(secondaryPondId).get();
    if (!secondarySnap.exists) {
      return { status: 'not_found', message: `Compare pond ${secondaryPondId} not found.` };
    }
    secondaryData = { id: secondarySnap.id, ...(secondarySnap.data() || {}) };
    if (scopedData) {
      const scoped = await scopedData('ponds', secondaryData);
      if (!scoped) throw new Error('Not permitted');
      secondaryData = scoped;
    }
  }

  const primaryPondCycle = cycleId || primaryData.pondCycleId || primaryData.cycleId || 'current';
  const secondaryPondCycle = compareCycleId || secondaryData.pondCycleId || secondaryData.cycleId || 'current';

  let primaryCycleDoc = null;
  if (cycleId && cycleId !== 'current' && cycleId !== primaryData.pondCycleId && cycleId !== primaryData.cycleId) {
    const cSnap = await db.collection('companies').doc(companyId).collection('cycles').doc(cycleId).get();
    if (!cSnap.exists) {
      return { status: 'not_found', message: `Requested cycle ${cycleId} not found.` };
    }
    let cData = { id: cSnap.id, ...(cSnap.data() || {}) };
    if (scopedData) {
      const scoped = await scopedData('cycles', cData);
      if (!scoped) throw new Error('Not permitted');
      cData = scoped;
    }
    const isPondInCycle = cData.pondId === pondId || (Array.isArray(cData.ponds) && cData.ponds.some((p) => (p.pondId || p.id) === pondId));
    if (!isPondInCycle && cData.pondId && cData.pondId !== pondId) {
      return { status: 'not_found', message: `Cycle ${cycleId} does not belong to pond ${pondId}.` };
    }
    primaryCycleDoc = cData;
  }

  let secondaryCycleDoc = null;
  if (compareCycleId && compareCycleId !== 'current' && compareCycleId !== secondaryData.pondCycleId && compareCycleId !== secondaryData.cycleId) {
    const cSnap = await db.collection('companies').doc(companyId).collection('cycles').doc(compareCycleId).get();
    if (!cSnap.exists) {
      return { status: 'not_found', message: `Requested compare cycle ${compareCycleId} not found.` };
    }
    let cData = { id: cSnap.id, ...(cSnap.data() || {}) };
    if (scopedData) {
      const scoped = await scopedData('cycles', cData);
      if (!scoped) throw new Error('Not permitted');
      cData = scoped;
    }
    const isPondInCycle = cData.pondId === secondaryPondId || (Array.isArray(cData.ponds) && cData.ponds.some((p) => (p.pondId || p.id) === secondaryPondId));
    if (!isPondInCycle && cData.pondId && cData.pondId !== secondaryPondId) {
      return { status: 'not_found', message: `Compare cycle ${compareCycleId} does not belong to pond ${secondaryPondId}.` };
    }
    secondaryCycleDoc = cData;
  }

  const filterCycleRecords = (records, targetCycleId, pond) => {
    return (Array.isArray(records) ? records : []).filter((r) => {
      if (targetCycleId && targetCycleId !== 'current') {
        const idMatches = r.pondCycleId === targetCycleId || r.cycleId === targetCycleId;
        if (!idMatches) return false;
      } else {
        if (!belongsToCurrentCycle(r, pond)) return false;
      }
      return true;
    });
  };

  const primarySamplings = filterCycleRecords(primaryData.samplings, cycleId, primaryData);
  const primaryMortality = filterCycleRecords(primaryData.mortalityRecords, cycleId, primaryData);

  const secondarySamplings = filterCycleRecords(secondaryData.samplings, compareCycleId, secondaryData);
  const secondaryMortality = filterCycleRecords(secondaryData.mortalityRecords, compareCycleId, secondaryData);

  const calculateTargetMetrics = (pondData, cycleDoc, samplings, mortalityRecords, alignDoc) => {
    const isHistorical = Boolean(cycleDoc);
    const cyclePondEntry = isHistorical && Array.isArray(cycleDoc.ponds)
      ? cycleDoc.ponds.find((p) => (p.pondId || p.id) === pondData.id)
      : null;
    const cycleStart = isHistorical
      ? cycleDoc.cycleStartedAt || cycleDoc.startDate || cycleDoc.plannedStartDate || cycleDoc.docStart || pondData.cycleStartedAt || pondData.docStart
      : pondData.cycleStartedAt || pondData.docStart;
    const initialPop = isHistorical
      ? cyclePondEntry?.initialPopulation || cyclePondEntry?.initialStock || cycleDoc.initialPopulation || cycleDoc.initialStock || pondData.initialPopulation || pondData.initialStock
      : pondData.initialPopulation || pondData.initialStock;
    const initialWt = isHistorical
      ? cyclePondEntry?.initialWeight || cycleDoc.initialWeight || pondData.initialWeight
      : pondData.initialWeight;
    const feedCost = isHistorical && cycleDoc.feedCost !== undefined ? cycleDoc.feedCost : pondData.feedCost;
    const harvestRecords = isHistorical && cycleDoc.harvestRecords ? cycleDoc.harvestRecords : pondData.harvestRecords;

    let filteredSamplings = samplings;
    let filteredMortality = mortalityRecords;
    let filteredHarvests = Array.isArray(harvestRecords) ? harvestRecords : [];
    let cutoffDate = null;

    if (alignDoc !== null && cycleStart) {
      cutoffDate = shiftDate(cycleStart, alignDoc - 1);
      filteredSamplings = samplings.filter((s) => {
        const d = normalizeFarmDateKey(s.date, tz);
        return !d || d <= cutoffDate;
      });
      filteredMortality = mortalityRecords.filter((m) => {
        const d = normalizeFarmDateKey(m.date, tz);
        return !d || d <= cutoffDate;
      });
      filteredHarvests = filteredHarvests.filter((h) => {
        const d = normalizeFarmDateKey(h.date, tz);
        return !d || d <= cutoffDate;
      });
    }

    let totalHarvestedPop = 0;
    let totalHarvestedBio = 0;
    for (const h of filteredHarvests) {
      const pEntry = Array.isArray(h.ponds) ? h.ponds.find((p) => (p.pondId || p.id) === pondData.id) : null;
      const bio = Number(pEntry?.biomass ?? h.biomass ?? h.harvestWeightKg ?? 0) || 0;
      const sz = Number(pEntry?.size ?? h.size ?? (pEntry?.mbw || h.mbw ? 1000 / Number(pEntry?.mbw || h.mbw) : 0)) || 0;
      totalHarvestedBio += bio;
      if (sz > 0 && bio > 0) {
        totalHarvestedPop += bio * sz;
      }
    }

    const effectivePond = {
      ...pondData,
      cycleStartedAt: cycleStart,
      docStart: cycleStart,
      initialPopulation: initialPop,
      initialStock: initialPop,
      initialWeight: initialWt,
      feedCost,
      harvestRecords: filteredHarvests,
      totalHarvestedPopulation: totalHarvestedPop,
      totalHarvestedBiomass: totalHarvestedBio,
      samplings: filteredSamplings,
      mortalityRecords: filteredMortality,
    };

    const calcOptions = {};
    if (alignDoc !== null) {
      calcOptions.currentDoc = alignDoc;
      if (cutoffDate) {
        calcOptions.currentDateKey = cutoffDate;
      }
    }

    const metrics = calculatePondMetricsWithHarvest(effectivePond, tz, calcOptions);

    const validMbwCount = filteredSamplings.filter((s) => Number(s.mbw ?? s.abw) > 0).length;
    const completeness =
      validMbwCount >= 3 ? 'complete' : validMbwCount >= 1 ? 'partial' : 'sparse';

    return {
      metrics: {
        doc: metrics.doc,
        latestMbw: round(metrics.latestMbw, 2),
        size: metrics.size,
        adg: round(metrics.adg, 3),
        currentBiomass: round(metrics.currentBiomass, 2),
        currentBiomassKg: round(metrics.currentBiomass, 2),
        currentPopulation: Math.round(metrics.currentPopulation),
        survivalRatePercent: round(metrics.adjustedSR, 1),
        totalFeedConsumedKg: round(metrics.totalFeedConsumed, 2),
        fcr: metrics.adjustedFCR > 0 ? round(metrics.adjustedFCR, 2) : null,
        totalMortality: Math.round(metrics.totalMortality),
      },
      coverage: {
        samplingsCount: filteredSamplings.length,
        validMbwObservations: validMbwCount,
        mortalityRecordsCount: filteredMortality.length,
        completeness,
      },
      feedCost: effectivePond.feedCost,
    };
  };

  const primaryResult = calculateTargetMetrics(primaryData, primaryCycleDoc, primarySamplings, primaryMortality, asOfDoc);
  const secondaryResult = calculateTargetMetrics(secondaryData, secondaryCycleDoc, secondarySamplings, secondaryMortality, asOfDoc);

  const pM = primaryResult.metrics;
  const sM = secondaryResult.metrics;

  const deltas = {
    mbwDiffG: sM.latestMbw !== null && pM.latestMbw !== null ? round(sM.latestMbw - pM.latestMbw, 2) : null,
    adgDiffGPerDay: sM.adg !== null && pM.adg !== null ? round(sM.adg - pM.adg, 3) : null,
    survivalRateDiffPercent:
      sM.survivalRatePercent !== null && pM.survivalRatePercent !== null
        ? round(sM.survivalRatePercent - pM.survivalRatePercent, 1)
        : null,
    fcrDiff: sM.fcr !== null && pM.fcr !== null ? round(sM.fcr - pM.fcr, 2) : null,
    biomassDiff:
      sM.currentBiomass !== null && pM.currentBiomass !== null
        ? round(sM.currentBiomass - pM.currentBiomass, 2)
        : null,
    biomassDiffKg:
      sM.currentBiomassKg !== null && pM.currentBiomassKg !== null
        ? round(sM.currentBiomassKg - pM.currentBiomassKg, 2)
        : null,
    feedConsumedDiffKg:
      sM.totalFeedConsumedKg !== null && pM.totalFeedConsumedKg !== null
        ? round(sM.totalFeedConsumedKg - pM.totalFeedConsumedKg, 2)
        : null,
  };

  const labelA = `${primaryData.pondName || pondId} (${primaryPondCycle})`;
  const labelB = `${secondaryData.pondName || secondaryPondId} (${secondaryPondCycle})`;

  const insights = [];
  if (deltas.mbwDiffG !== null && Math.abs(deltas.mbwDiffG) > 0.05) {
    insights.push(
      deltas.mbwDiffG > 0
        ? `${labelB} has higher MBW (+${deltas.mbwDiffG}g) than ${labelA} (${sM.latestMbw}g vs ${pM.latestMbw}g).`
        : `${labelA} has higher MBW (+${Math.abs(deltas.mbwDiffG)}g) than ${labelB} (${pM.latestMbw}g vs ${sM.latestMbw}g).`,
    );
  }
  if (deltas.fcrDiff !== null && Math.abs(deltas.fcrDiff) > 0.05) {
    insights.push(
      deltas.fcrDiff < 0
        ? `${labelB} has better feed conversion efficiency with lower FCR (${sM.fcr} vs ${pM.fcr}).`
        : `${labelA} has better feed conversion efficiency with lower FCR (${pM.fcr} vs ${sM.fcr}).`,
    );
  }
  if (deltas.survivalRateDiffPercent !== null && Math.abs(deltas.survivalRateDiffPercent) >= 1.0) {
    insights.push(
      deltas.survivalRateDiffPercent > 0
        ? `${labelB} has higher survival rate (+${deltas.survivalRateDiffPercent}%) than ${labelA} (${sM.survivalRatePercent}% vs ${pM.survivalRatePercent}%).`
        : `${labelA} has higher survival rate (+${Math.abs(deltas.survivalRateDiffPercent)}%) than ${labelB} (${pM.survivalRatePercent}% vs ${sM.survivalRatePercent}%).`,
    );
  }

  // Strict Finance Gating
  const canViewFinance = Boolean(allowed('viewFinance'));
  let financeComparison = {
    financeAllowed: false,
    reason: 'User lacks viewFinance permission. Financial costs excluded.',
  };

  if (canViewFinance) {
    const primaryFeedCost = finite(primaryResult.feedCost ?? primaryData.feedCost);
    const secondaryFeedCost = finite(secondaryResult.feedCost ?? secondaryData.feedCost);
    financeComparison = {
      financeAllowed: true,
      primaryFeedCost: primaryFeedCost !== null ? round(primaryFeedCost, 2) : null,
      secondaryFeedCost: secondaryFeedCost !== null ? round(secondaryFeedCost, 2) : null,
      feedCostDiff:
        primaryFeedCost !== null && secondaryFeedCost !== null
          ? round(secondaryFeedCost - primaryFeedCost, 2)
          : null,
    };
  }

  return {
    status: 'ok',
    comparisonType: isCrossPond ? 'pond_to_pond' : 'cycle_to_cycle',
    scope: {
      companyId,
      alignedAtDoc: asOfDoc,
      enterpriseScoped: Boolean(enterpriseScoped),
    },
    primary: {
      pondId,
      pondName: String(primaryData.pondName || primaryData.name || pondId).slice(0, 160),
      cycleId: primaryPondCycle,
      metrics: primaryResult.metrics,
      coverage: primaryResult.coverage,
    },
    secondary: {
      pondId: secondaryPondId,
      pondName: String(secondaryData.pondName || secondaryData.name || secondaryPondId).slice(0, 160),
      cycleId: secondaryPondCycle,
      metrics: secondaryResult.metrics,
      coverage: secondaryResult.coverage,
    },
    deltas,
    insights,
    finance: financeComparison,
  };
};

/**
 * Evaluate inventory stock levels, burn rate, days of supply, and replenishment requirements.
 * Analytical only: executes no procurement action and performs no Firestore writes.
 */
const evaluateInventoryReplenishment = async (args = {}, context = {}) => {
  const { db, companyId, allowed, enterpriseScoped, scopedData } = context;
  if (!allowed || (!allowed('viewFarm') && !allowed('manageFeedInventory'))) {
    throw new Error('Not permitted');
  }

  const itemId = args.itemId ? args.itemId.trim() : null;
  const itemType = args.itemType || 'all';
  const requiredQuantity = args.requiredQuantity !== undefined ? finite(args.requiredQuantity) : null;
  const requiredUnit = args.unit ? String(args.unit).trim() : null;
  const plannedDays = Number.isInteger(args.plannedDays) && args.plannedDays > 0 ? args.plannedDays : 7;

  if (itemId && !validId(itemId)) throw new Error('Invalid item ID');

  const baseRef = db.collection('companies').doc(companyId);
  const itemsToEvaluate = [];

  const readCollection = async (collName, defaultType) => {
    const snap = await baseRef.collection(collName).get();
    return (snap.docs || []).map((doc) => ({
      id: doc.id,
      itemType: defaultType,
      ...doc.data(),
    }));
  };

  if (itemId) {
    let docSnap = null;
    let type = 'feed';
    if (itemType !== 'additive') {
      const snap = await baseRef.collection('feeds').doc(itemId).get();
      if (snap.exists) {
        docSnap = snap;
        type = 'feed';
      }
    }
    if (!docSnap && itemType !== 'feed') {
      const snap = await baseRef.collection('additives').doc(itemId).get();
      if (snap.exists) {
        docSnap = snap;
        type = 'additive';
      }
    }
    if (!docSnap) {
      return { status: 'not_found', message: `Inventory item ${itemId} not found.` };
    }
    let itemData = { id: docSnap.id, itemType: type, ...docSnap.data() };
    if (scopedData) {
      const scoped = await scopedData(type === 'feed' ? 'feeds' : 'additives', itemData);
      if (!scoped) throw new Error('Not permitted');
      itemData = scoped;
    }
    itemsToEvaluate.push(itemData);
  } else {
    if (itemType === 'feed' || itemType === 'all') {
      const feeds = await readCollection('feeds', 'feed');
      for (let f of feeds) {
        if (scopedData) {
          f = await scopedData('feeds', f);
          if (!f) continue;
        }
        itemsToEvaluate.push(f);
      }
    }
    if (itemType === 'additive' || itemType === 'all') {
      const additives = await readCollection('additives', 'additive');
      for (let a of additives) {
        if (scopedData) {
          a = await scopedData('additives', a);
          if (!a) continue;
        }
        itemsToEvaluate.push(a);
      }
    }
  }

  const evaluations = itemsToEvaluate.map((item) => {
    const evaluation = evaluateReplenishmentScenario({
      item,
      requiredQuantity,
      requiredUnit,
      plannedDays,
    });

    const canViewFinance = Boolean(allowed('viewFinance'));
    let financeAssessment = {
      financeAllowed: false,
      reason: 'User lacks viewFinance permission. Pricing withheld.',
    };

    if (canViewFinance) {
      const unitCost = finite(item.costPerUnit || item.price || item.averageCost);
      const reorderQty = evaluation.reorderAssessment.recommendedReorderQuantity;
      financeAssessment = {
        financeAllowed: true,
        unitCost: unitCost !== null ? round(unitCost, 2) : null,
        estimatedReplenishmentCost:
          unitCost !== null && reorderQty !== null ? round(unitCost * reorderQty, 2) : null,
      };
    }

    return {
      ...evaluation,
      finance: financeAssessment,
    };
  });

  return {
    status: 'ok',
    scope: {
      companyId,
      itemId,
      itemType,
      itemCount: evaluations.length,
      enterpriseScoped: Boolean(enterpriseScoped),
      planningHorizonDays: plannedDays,
    },
    items: evaluations,
    summary: {
      totalItemsEvaluated: evaluations.length,
      itemsNeedingReorder: evaluations.filter((e) => e.reorderAssessment.isReorderNeeded).length,
      itemsWithZeroStock: evaluations.filter((e) => e.stockStatus.status === 'zero_stock').length,
      itemsWithUnknownStock: evaluations.filter((e) => e.stockStatus.status === 'unknown_stock').length,
      itemsWithCriticalRunway: evaluations.filter((e) => e.runway.runwayStatus === 'critical').length,
    },
    guardrails: {
      advisoryOnly: true,
      noProcurementExecuted: true,
      requiresUserConfirmation: true,
      notes: 'Pure advisory evaluation. No procurement action, purchase order, or Firestore mutation occurred.',
    },
  };
};

const isPondActiveOnDate = (pond, date, tz) => {
  if (!date) return false;
  const start = normalizeFarmDateKey(pond.cycleStartedAt || pond.docStart, tz);
  const end = normalizeFarmDateKey(pond.cycleEndedAt, tz);
  if (start && date < start) return false;
  if (end && date > end) return false;
  if (!end && pond.cycleStatus === 'ended') return false;
  return true;
};

const recordDirectlyMatchesPond = (record, pond) => {
  if (record.pondCycleId) return Boolean(pond.pondCycleId) && record.pondCycleId === pond.pondCycleId;
  if (!record.pondId || record.pondId !== pond.id) return false;
  return !record.cycleId || !pond.cycleId || record.cycleId === pond.cycleId;
};

const allocateCostsToPond = ({ pond, ponds, records, startDate, endDate, excludedInventoryPurchaseIds = [], tz }) => {
  const normalizedStart = normalizeFarmDateKey(startDate, tz);
  const normalizedEnd = normalizeFarmDateKey(endDate, tz);
  let directAmount = 0;
  let sharedAmount = 0;
  let unallocatedAmount = 0;
  const includedRecordIds = [];

  records.forEach((record) => {
    if (normalizedStart && record.date < normalizedStart) return;
    if (normalizedEnd && record.date > normalizedEnd) return;

    if (record.pondId || record.pondCycleId) {
      if (recordDirectlyMatchesPond(record, pond)) {
        directAmount += record.amount;
        includedRecordIds.push(record.id);
      }
      return;
    }

    const eligiblePonds = (ponds || []).filter((p) =>
      isPondActiveOnDate(p, record.date, tz) && (!record.cycleId || p.cycleId === record.cycleId)
    );

    if (eligiblePonds.length === 0) {
      unallocatedAmount += record.amount;
      continue;
    }

    if (eligiblePonds.some((candidate) => candidate.id === pond.id && (
      !pond.pondCycleId || !candidate.pondCycleId || candidate.pondCycleId === pond.pondCycleId
    ))) {
      sharedAmount += record.amount / eligiblePonds.length;
      includedRecordIds.push(record.id);
    }
  });

  return {
    allocatedAmount: round(directAmount + sharedAmount, 2),
    directAmount: round(directAmount, 2),
    sharedAmount: round(sharedAmount, 2),
    unallocatedAmount: round(unallocatedAmount, 2),
    includedRecordIds,
    excludedInventoryPurchaseIds,
  };
};

const buildDailyFeedTotalsForPond = (feeds, pondId, tz) => {
  const dailyTotals = new Map();
  (feeds || []).forEach((feed) => {
    (feed.usageHistory || []).forEach((usage) => {
      if (usage.transfer === true || usage.source === 'treatmentMixProduction' || usage.voided === true) return;
      if (usage.pondId !== pondId) return;
      const dateKey = normalizeFarmDateKey(usage.date, tz);
      const qty = finite(usage.quantity);
      if (!dateKey || qty === null || qty <= 0) return;
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + qty);
    });
  });
  return Array.from(dailyTotals.entries())
    .map(([date, quantityKg]) => ({ date, quantityKg: round(quantityKg, 3) }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const calculateRecordedDailyMortalityRate = ({ records = [], currentPopulation, now, tz }) => {
  const validRecords = (records || []).filter((r) => {
    if (!r || typeof r !== 'object') return false;
    const date = normalizeFarmDateKey(r.date, tz);
    return Boolean(date);
  });
  if (validRecords.length === 0) {
    return { dailyRatePercent: 0, recordedDays: 0, estimatedDeaths: 0 };
  }
  const dates = new Set();
  let estimatedDeaths = 0;
  validRecords.forEach((r) => {
    const d = normalizeFarmDateKey(r.date, tz);
    if (d) dates.add(d);
    const count = Number(r.count || r.mortality || 0);
    if (r.observationType === 'estimated_total' && count > 0) {
      estimatedDeaths += count;
    }
  });
  const recordedDays = dates.size;
  if (recordedDays === 0 || currentPopulation <= 0) {
    return { dailyRatePercent: 0, recordedDays, estimatedDeaths };
  }
  const dailyRatePercent = (estimatedDeaths / (currentPopulation + estimatedDeaths)) / recordedDays * 100;
  return { dailyRatePercent: round(dailyRatePercent, 4), recordedDays, estimatedDeaths };
};

const buildPondProfitabilityCostSnapshot = ({ pond, ponds, feeds, additives, expenses, startDate, endDate, tz }) => {
  const excludedInventoryPurchaseIds = (expenses || []).filter(isInventoryPurchaseExpense).map((e) => e.id);
  const expenseRecords = (expenses || [])
    .filter((e) => !e.voided && !isInventoryPurchaseExpense(e))
    .map((e) => ({
      id: e.id,
      date: normalizeFarmDateKey(e.date, tz),
      amount: finite(e.amount),
      pondId: e.pondId,
      pondCycleId: e.pondCycleId,
      cycleId: e.cycleId,
      source: 'expense',
    }))
    .filter((r) => r.date && r.amount !== null && r.amount > 0);

  const flattenUsage = (items, source) => (items || []).flatMap((item) =>
    (item.usageHistory || []).map((usage, idx) => {
      if (usage.transfer === true || usage.source === 'treatmentMixProduction' || usage.voided === true) return null;
      const date = normalizeFarmDateKey(usage.date, tz);
      const qty = finite(usage.quantity);
      const savedCost = finite(usage.totalCost);
      const unitPrice = finite(usage.unitPrice);
      const amount = savedCost !== null ? savedCost : (qty !== null && unitPrice !== null ? qty * unitPrice : null);
      if (!date || amount === null || amount <= 0) return null;
      return {
        id: usage.id || `${item.id}:${source}:${idx}`,
        date,
        amount,
        pondId: usage.pondId,
        pondCycleId: usage.pondCycleId,
        cycleId: usage.cycleId,
        source,
      };
    }).filter(Boolean)
  );

  const feedRecords = flattenUsage(feeds, 'feed_usage');
  const additiveRecords = flattenUsage(additives, 'additive_usage');

  const allocationInput = { pond, ponds, startDate, endDate, tz };
  const expenseAllocation = allocateCostsToPond({ ...allocationInput, records: expenseRecords, excludedInventoryPurchaseIds });
  const feedAllocation = allocateCostsToPond({ ...allocationInput, records: feedRecords });
  const additiveAllocation = allocateCostsToPond({ ...allocationInput, records: additiveRecords });

  const feedQuantityRecords = (feeds || []).flatMap((item) =>
    (item.usageHistory || []).map((usage, idx) => {
      if (usage.transfer === true || usage.source === 'treatmentMixProduction' || usage.voided === true) return null;
      const date = normalizeFarmDateKey(usage.date, tz);
      const qty = finite(usage.quantity);
      if (!date || qty === null || qty <= 0) return null;
      return {
        id: usage.id || `${item.id}:qty:${idx}`,
        date,
        amount: qty,
        pondId: usage.pondId,
        pondCycleId: usage.pondCycleId,
        cycleId: usage.cycleId,
        source: 'feed_usage',
      };
    }).filter(Boolean)
  );

  const feedQuantityAllocation = allocateCostsToPond({ ...allocationInput, records: feedQuantityRecords });

  const warnings = [];
  if (feedAllocation.allocatedAmount > 0 && feedQuantityAllocation.allocatedAmount <= 0) {
    warnings.push('Consumed feed cost exists, but its allocated quantity is missing.');
  }
  if (feedQuantityAllocation.allocatedAmount > 0 && feedAllocation.allocatedAmount <= 0) {
    warnings.push('Consumed feed quantity exists, but its allocated cost is missing or zero.');
  }
  if (expenseAllocation.unallocatedAmount > 0 || additiveAllocation.unallocatedAmount > 0) {
    warnings.push('Some shared costs could not be allocated because no pond was active on the record date.');
  }
  if (excludedInventoryPurchaseIds.length > 0) {
    warnings.push('Inventory stock-in purchases were excluded; only consumed feed and additive usage is counted.');
  }

  const allocatedFeedCost = feedAllocation.allocatedAmount;
  const calculatedFeedUnitCost = feedQuantityAllocation.allocatedAmount > 0
    ? round(feedAllocation.allocatedAmount / feedQuantityAllocation.allocatedAmount, 4)
    : 0;

  return {
    costsToDate: {
      feed: allocatedFeedCost,
      additives: additiveAllocation.allocatedAmount,
      generalExpenses: expenseAllocation.allocatedAmount,
      other: 0,
    },
    feedUnitCostPerKg: calculatedFeedUnitCost,
    projectedDailyAdditiveCost: 0,
    projectedDailyGeneralExpense: 0,
    excludedInventoryPurchaseIds,
    warnings,
  };
};

const resolvePriceForSize = (sizeCountPerKg, priceLadder = []) => {
  if (!priceLadder.length) return 0;
  return [...priceLadder].sort(
    (a, b) => Math.abs(a.sizeCountPerKg - sizeCountPerKg) - Math.abs(b.sizeCountPerKg - sizeCountPerKg)
  )[0].pricePerKg;
};

const evaluateHarvestDecisionForPond = ({ pond, options = {} }) => {
  const tz = options.timeZone;
  const now = options.now || new Date();
  const todayKey = normalizeFarmDateKey(now, tz) || '';
  const earliestSampling = (pond.samplings || []).map((s) => s.date).filter(Boolean).sort()[0];
  const cycleStart = pond.cycleStartedAt || pond.docStart || earliestSampling || todayKey;
  const effectivePond = {
    ...pond,
    cycleStartedAt: pond.cycleStartedAt || pond.docStart || cycleStart,
  };

  const metrics = calculatePondMetricsWithHarvest(effectivePond, tz, { currentDateKey: todayKey, now });

  const feeds = options.feeds || [];
  const additives = options.additives || [];
  const expenses = options.expenses || [];
  const ponds = options.ponds || [effectivePond];

  const costSnapshot = buildPondProfitabilityCostSnapshot({
    pond: effectivePond,
    ponds,
    feeds,
    additives,
    expenses,
    startDate: options.startDate || cycleStart,
    endDate: options.endDate || todayKey,
    tz,
  });

  const recordedMortality = calculateRecordedDailyMortalityRate({
    records: pond.mortalityRecords || [],
    currentPopulation: metrics.currentPopulation,
    now,
    tz,
  });

  const recentDailyFeedTotals = buildDailyFeedTotalsForPond(feeds, pond.id, tz);
  const priceLadder = options.priceLadder || [];
  const initialPopulation = Number(pond.initialPopulation || pond.initialStock || 0);
  const historicalFcr = metrics.biomassGainFCR > 0 ? metrics.biomassGainFCR : metrics.adjustedFCR;
  const maxProjectionDays = options.daysToHarvest ? Math.min(120, Math.max(1, options.daysToHarvest)) : (options.maxProjectionDays || 120);

  const currentPopulation = Math.max(0, metrics.currentPopulation);
  const currentMbwG = Math.max(0, metrics.latestMbw);
  const currentSizeCountPerKg = currentMbwG > 0 ? round(1000 / currentMbwG, 1) : 0;
  const currentPricePerKg = resolvePriceForSize(currentSizeCountPerKg, priceLadder);
  const mortalityRate = (recordedMortality.recordedDays > 0 ? recordedMortality.dailyRatePercent : (metrics.biomassEstimate?.expectedDailyMortalityRatePercent || 0.1)) / 100;

  // Build today scenario
  const currentBiomassKg = round((currentPopulation * currentMbwG) / 1000, 2);
  const todayRevenue = round(currentBiomassKg * currentPricePerKg, 2);
  const totalCostsToDate = round(costSnapshot.costsToDate.feed + costSnapshot.costsToDate.additives + costSnapshot.costsToDate.generalExpenses + costSnapshot.costsToDate.other, 2);
  const todayProfit = round(todayRevenue - totalCostsToDate, 2);

  const today = {
    kind: 'today',
    targetSizeCountPerKg: currentSizeCountPerKg,
    targetMbwG: round(currentMbwG, 2),
    daysFromNow: 0,
    projectedPopulation: currentPopulation,
    projectedSurvivalRatePercent: round(metrics.adjustedSR, 2),
    projectedBiomassKg: currentBiomassKg,
    pricePerKg: currentPricePerKg,
    revenue: todayRevenue,
    futureFeedKg: 0,
    impliedIncrementalFcr: null,
    futureCosts: { feed: 0, additives: 0, generalExpenses: 0, other: 0 },
    totalCosts: costSnapshot.costsToDate,
    operatingProfit: todayProfit,
    incrementalProfitVsToday: 0,
  };

  // Build target scenarios
  const targets = [];
  const candidateTiers = priceLadder.filter((t) => t.sizeCountPerKg < currentSizeCountPerKg);

  for (const tier of candidateTiers) {
    const targetMbw = 1000 / tier.sizeCountPerKg;
    const daysFromNow = Math.max(1, Math.ceil(daysToTargetMbwWithTapering(
      currentMbwG,
      targetMbw,
      metrics.adg,
      Math.max(50, targetMbw * 1.15),
    )));
    if (daysFromNow > maxProjectionDays) continue;

    const projPop = Math.max(0, Math.round(currentPopulation * ((1 - mortalityRate) ** daysFromNow)));
    const projSurvival = initialPopulation > 0 ? round((projPop / initialPopulation) * 100, 2) : round(metrics.adjustedSR * ((1 - mortalityRate) ** daysFromNow), 2);
    const projBiomass = round((projPop * targetMbw) / 1000, 2);
    const gainKg = Math.max(0, projBiomass - currentBiomassKg);
    const fcrVal = historicalFcr > 0 ? historicalFcr : 1.4;
    const futureFeedKg = round(gainKg * fcrVal, 3);
    const futureFeedCost = round(futureFeedKg * costSnapshot.feedUnitCostPerKg, 2);
    const futureCosts = {
      feed: futureFeedCost,
      additives: 0,
      generalExpenses: 0,
      other: 0,
    };
    const totalCosts = {
      feed: round(costSnapshot.costsToDate.feed + futureCosts.feed, 2),
      additives: round(costSnapshot.costsToDate.additives + futureCosts.additives, 2),
      generalExpenses: round(costSnapshot.costsToDate.generalExpenses + futureCosts.generalExpenses, 2),
      other: round(costSnapshot.costsToDate.other + futureCosts.other, 2),
    };
    const tierRev = round(projBiomass * tier.pricePerKg, 2);
    const opProfit = round(tierRev - (totalCosts.feed + totalCosts.additives + totalCosts.generalExpenses + totalCosts.other), 2);

    targets.push({
      kind: 'target',
      targetSizeCountPerKg: tier.sizeCountPerKg,
      targetMbwG: round(targetMbw, 2),
      daysFromNow,
      projectedPopulation: projPop,
      projectedSurvivalRatePercent: projSurvival,
      projectedBiomassKg: projBiomass,
      pricePerKg: tier.pricePerKg,
      revenue: tierRev,
      futureFeedKg,
      impliedIncrementalFcr: gainKg > 0 ? round(futureFeedKg / gainKg, 3) : null,
      futureCosts,
      totalCosts,
      operatingProfit: opProfit,
      incrementalProfitVsToday: round(opProfit - todayProfit, 2),
    });
  }

  // Handle explicit targetMbwG or targetSizeCountPerKg
  const explicitTargetCount = options.targetSizeCountPerKg
    ? options.targetSizeCountPerKg
    : options.targetMbwG && options.targetMbwG > 0
      ? 1000 / options.targetMbwG
      : null;

  if (explicitTargetCount !== null && explicitTargetCount < currentSizeCountPerKg && metrics.adg > 0) {
    const targetMbw = 1000 / explicitTargetCount;
    const daysFromNow = Math.max(1, Math.ceil(daysToTargetMbwWithTapering(
      currentMbwG,
      targetMbw,
      metrics.adg,
      Math.max(50, targetMbw * 1.15),
    )));
    if (daysFromNow <= maxProjectionDays && !targets.some((t) => Math.abs(t.targetSizeCountPerKg - explicitTargetCount) < 1)) {
      const explicitPrice = resolvePriceForSize(explicitTargetCount, priceLadder);
      const projPop = Math.max(0, Math.round(currentPopulation * ((1 - mortalityRate) ** daysFromNow)));
      const projSurvival = initialPopulation > 0 ? round((projPop / initialPopulation) * 100, 2) : round(metrics.adjustedSR * ((1 - mortalityRate) ** daysFromNow), 2);
      const projBiomass = round((projPop * targetMbw) / 1000, 2);
      const gainKg = Math.max(0, projBiomass - currentBiomassKg);
      const fcrVal = historicalFcr > 0 ? historicalFcr : 1.4;
      const futureFeedKg = round(gainKg * fcrVal, 3);
      const futureFeedCost = round(futureFeedKg * costSnapshot.feedUnitCostPerKg, 2);
      const futureCosts = { feed: futureFeedCost, additives: 0, generalExpenses: 0, other: 0 };
      const totalCosts = {
        feed: round(costSnapshot.costsToDate.feed + futureCosts.feed, 2),
        additives: round(costSnapshot.costsToDate.additives + futureCosts.additives, 2),
        generalExpenses: round(costSnapshot.costsToDate.generalExpenses + futureCosts.generalExpenses, 2),
        other: round(costSnapshot.costsToDate.other + futureCosts.other, 2),
      };
      const tierRev = round(projBiomass * explicitPrice, 2);
      const opProfit = round(tierRev - (totalCosts.feed + totalCosts.additives + totalCosts.generalExpenses + totalCosts.other), 2);

      targets.push({
        kind: 'target',
        targetSizeCountPerKg: round(explicitTargetCount, 1),
        targetMbwG: round(targetMbw, 2),
        daysFromNow,
        projectedPopulation: projPop,
        projectedSurvivalRatePercent: projSurvival,
        projectedBiomassKg: projBiomass,
        pricePerKg: explicitPrice,
        revenue: tierRev,
        futureFeedKg,
        impliedIncrementalFcr: gainKg > 0 ? round(futureFeedKg / gainKg, 3) : null,
        futureCosts,
        totalCosts,
        operatingProfit: opProfit,
        incrementalProfitVsToday: round(opProfit - todayProfit, 2),
      });
      targets.sort((a, b) => a.daysFromNow - b.daysFromNow);
    }
  }

  const warnings = [...costSnapshot.warnings];
  const missingEvidence = [];
  if (metrics.latestMbw <= 0) missingEvidence.push('missing_valid_sampling_mbw');
  if (metrics.currentPopulation <= 0) missingEvidence.push('missing_current_population');
  if (recentDailyFeedTotals.length === 0) missingEvidence.push('missing_recent_daily_feed_records');
  if (recordedMortality.recordedDays === 0) missingEvidence.push('missing_recorded_mortality_observations');
  if (priceLadder.length === 0) {
    missingEvidence.push('missing_market_price');
    missingEvidence.push('missing_market_price_ladder');
    warnings.push('Market price tiers are missing. Financial revenue and operating profit require market prices.');
  }
  if (costSnapshot.feedUnitCostPerKg <= 0) {
    missingEvidence.push('missing_historical_feed_unit_cost');
    warnings.push('Feed unit cost is missing or zero; operating profit cannot be calculated without feed cost evidence.');
  }

  const bestScenario = [today, ...targets].reduce((best, s) =>
    s.operatingProfit > best.operatingProfit ? s : best
  );

  const hasCriticalData = currentPopulation > 0 && currentMbwG > 0;
  const hasCriticalFinanceData = costSnapshot.feedUnitCostPerKg > 0 && priceLadder.length > 0;

  let decision = 'harvest_now';
  let decisionReason = '';

  if (!hasCriticalData || !hasCriticalFinanceData) {
    decision = 'review_data';
    decisionReason = !hasCriticalData
      ? 'Critical population, MBW, or market-price data is missing.'
      : 'Required feed unit cost or market price evidence is missing; profit recommendation withheld.';
  } else if (bestScenario.kind === 'target' && bestScenario.operatingProfit > today.operatingProfit && bestScenario.operatingProfit > 0) {
    decision = 'keep_growing';
    decisionReason = `Target size ${bestScenario.targetSizeCountPerKg} is projected to improve operating profit by ${round(bestScenario.incrementalProfitVsToday)}.`;
  } else if (targets.length === 0) {
    decision = 'harvest_now';
    decisionReason = 'No reachable larger market size has a valid, more profitable projection.';
  } else {
    decision = 'harvest_now';
    decisionReason = 'Harvesting now has equal or higher projected operating profit than the reachable larger sizes.';
  }

  const mortalityBasis = recordedMortality.recordedDays > 0 ? 'recorded_mortality_trend' : 'biological_fallback';

  return {
    result: {
      decision,
      decisionReason,
      today,
      targets,
      bestScenario,
      warnings,
    },
    metrics,
    costSnapshot,
    recordedMortality,
    recentDailyFeedTotals,
    scope: {
      pondId: pond.id,
      pondName: pond.name || pond.pondName || pond.id,
      cycleId: pond.cycleId || pond.pondCycleId || null,
    },
    assumptions: {
      growthModel: 'von_bertalanffy_tapered_growth',
      assumedAdgGPerDay: metrics.adg,
      mortalityBasis,
      mortalityDailyRatePercent: round(mortalityRate * 100, 4),
      feedCostUnitPerKg: costSnapshot.feedUnitCostPerKg,
      maxProjectionDays,
    },
    missingEvidence,
    marginBasis: 'operating_profit_after_all_incurred_and_projected_costs',
    guardrails: {
      advisoryOnly: true,
      noFarmWrites: true,
      noHarvestDraftCreated: true,
      notes: 'Pure read-only analytical evaluation. No harvest records or procurement transactions were created or modified in Firestore.',
    },
  };
};

/**
 * Evaluate read-only harvest scenarios comparing harvesting today versus continuing to grow to target sizes or dates.
 * Strictly read-only: creates no harvest records and performs no Firestore writes.
 * Enforces strict finance isolation: non-finance callers receive operational metrics with finance margins withheld.
 */
const evaluateHarvestScenario = async (args = {}, context = {}) => {
  const { db, companyId, company, allowed, enterpriseScoped, scopedData, timeZone: ctxTimeZone } = context;
  if (!allowed || !allowed('viewFarm')) {
    throw new Error('Not permitted');
  }

  const pondId = args.pondId ? String(args.pondId).trim() : null;
  if (!pondId || !validId(pondId)) {
    throw new Error('Invalid pond ID');
  }

  const cycleId = args.cycleId ? String(args.cycleId).trim() : null;
  const targetMbwG = args.targetMbwG !== undefined ? finite(args.targetMbwG) : null;
  const targetSizeCountPerKg = args.targetSizeCountPerKg !== undefined ? finite(args.targetSizeCountPerKg) : null;
  const requestedDays = Number.isInteger(args.daysToHarvest) && args.daysToHarvest > 0
    ? Math.min(120, Math.max(1, args.daysToHarvest))
    : null;
  const expectedPricePerKg = args.pricePerKg !== undefined ? finite(args.pricePerKg) : null;
  const customPriceLadder = Array.isArray(args.priceLadder)
    ? args.priceLadder
        .map((tier) => ({
          sizeCountPerKg: finite(tier?.sizeCountPerKg),
          pricePerKg: finite(tier?.pricePerKg),
        }))
        .filter((tier) => tier.sizeCountPerKg !== null && tier.sizeCountPerKg > 0 && tier.pricePerKg !== null && tier.pricePerKg > 0)
        .sort((a, b) => b.sizeCountPerKg - a.sizeCountPerKg)
    : null;

  const baseRef = db.collection('companies').doc(companyId);
  const pondSnap = await baseRef.collection('ponds').doc(pondId).get();
  if (!pondSnap.exists) {
    return { status: 'not_found', message: `Pond ${pondId} not found.` };
  }

  let pondData = { id: pondSnap.id, ...pondSnap.data() };
  if (scopedData) {
    const scoped = await scopedData('ponds', pondData);
    if (!scoped) throw new Error('Not permitted');
    pondData = scoped;
  }

  const activeCycleId = cycleId || pondData.pondCycleId || pondData.cycleId || 'active';
  const scopedPond = {
    ...pondData,
    samplings: (pondData.samplings || []).filter((s) =>
      belongsToCurrentCycle(s, { pondCycleId: activeCycleId, cycleId: activeCycleId }),
    ),
    mortalityRecords: (pondData.mortalityRecords || []).filter((m) =>
      belongsToCurrentCycle(m, { pondCycleId: activeCycleId, cycleId: activeCycleId }),
    ),
  };

  const timeZone = ctxTimeZone || company?.timeZone || 'UTC';
  const now = new Date();
  const canViewFinance = Boolean(allowed('viewFinance'));

  // Load full pond cohort across company for equitable shared cycle expense allocation
  const pondsSnap = await baseRef.collection('ponds').limit(100).get();
  const cohortPonds = [];
  for (const doc of pondsSnap.docs || []) {
    let p = { id: doc.id, ...doc.data() };
    if (scopedData) {
      p = await scopedData('ponds', p);
      if (!p) continue;
    }
    cohortPonds.push(p);
  }
  const allCycleCohortPonds = cohortPonds.filter((p) => p.id !== scopedPond.id).concat([scopedPond]);

  // Fetch feeds and additives for biological and nutritional projections
  const feedsSnap = await baseRef.collection('feeds').limit(200).get();
  const feeds = [];
  for (const doc of feedsSnap.docs || []) {
    let f = { id: doc.id, ...doc.data() };
    if (scopedData) {
      f = await scopedData('feeds', f);
      if (!f) continue;
    }
    feeds.push(f);
  }

  const additivesSnap = await baseRef.collection('additives').limit(200).get();
  const additives = [];
  for (const doc of additivesSnap.docs || []) {
    let a = { id: doc.id, ...doc.data() };
    if (scopedData) {
      a = await scopedData('additives', a);
      if (!a) continue;
    }
    additives.push(a);
  }

  // Strict finance gating: expenses only queried if user has viewFinance
  const expenses = [];
  if (canViewFinance) {
    try {
      const expSnap = await baseRef.collection('expenses').limit(500).get();
      for (const doc of expSnap.docs || []) {
        const exp = { id: doc.id, ...doc.data() };
        if (exp.voided === true || exp.isVoid === true) continue;
        expenses.push(exp);
      }
    } catch (_) {}
  }

  // Resolve price ladder
  let resolvedPriceLadder = customPriceLadder || [];
  if (!resolvedPriceLadder.length && expectedPricePerKg !== null && expectedPricePerKg > 0) {
    resolvedPriceLadder = [{ sizeCountPerKg: 1, pricePerKg: expectedPricePerKg }];
  } else if (!resolvedPriceLadder.length && canViewFinance && company?.harvestMarketPrices && typeof company.harvestMarketPrices === 'object') {
    resolvedPriceLadder = Object.entries(company.harvestMarketPrices)
      .map(([size, price]) => ({ sizeCountPerKg: finite(size), pricePerKg: finite(price) }))
      .filter((t) => t.sizeCountPerKg !== null && t.sizeCountPerKg > 0 && t.pricePerKg !== null && t.pricePerKg > 0)
      .sort((a, b) => b.sizeCountPerKg - a.sizeCountPerKg);
  }

  // Canonical evaluation
  const harvestEval = evaluateHarvestDecisionForPond({
    pond: scopedPond,
    options: {
      timeZone,
      priceLadder: resolvedPriceLadder,
      feeds,
      additives,
      expenses: canViewFinance ? expenses : [],
      ponds: allCycleCohortPonds,
      targetMbwG,
      targetSizeCountPerKg,
      daysToHarvest: requestedDays,
      pricePerKg: expectedPricePerKg,
      now,
    },
  });

  // Decision formulation
  let decision = harvestEval.result.decision;
  let decisionReason = harvestEval.result.decisionReason;
  let bestScenario = harvestEval.result.bestScenario;

  if (!canViewFinance) {
    // Non-finance callers receive operational recommendations based on biological growth
    if (harvestEval.metrics.adg > 0 && harvestEval.result.targets.length > 0) {
      decision = 'keep_growing';
      decisionReason = `Pond exhibits positive growth (ADG ${harvestEval.metrics.adg}g/day). Target size reachable within projection window.`;
      bestScenario = harvestEval.result.targets[0];
    } else if (harvestEval.metrics.adg <= 0) {
      decision = 'harvest_now';
      decisionReason = 'Growth has plateaued or historical ADG is zero/negative.';
      bestScenario = harvestEval.result.today;
    } else {
      decision = 'harvest_now';
      decisionReason = 'Current harvest size meets active cycle operational targets.';
      bestScenario = harvestEval.result.today;
    }
  }

  // Map today scenario
  const todayScenario = {
    ...harvestEval.result.today,
    currentBiomass: harvestEval.result.today.projectedBiomassKg,
    currentBiomassKg: harvestEval.result.today.projectedBiomassKg,
  };
  if (!canViewFinance) {
    delete todayScenario.pricePerKg;
    delete todayScenario.revenue;
    delete todayScenario.futureCosts;
    delete todayScenario.totalCosts;
    delete todayScenario.operatingProfit;
    delete todayScenario.incrementalProfitVsToday;
  } else if (harvestEval.costSnapshot.feedUnitCostPerKg <= 0) {
    todayScenario.operatingProfit = null;
    todayScenario.incrementalProfitVsToday = null;
  }

  // Map targets
  const targets = harvestEval.result.targets.map((t) => {
    const mapped = {
      ...t,
      projectedBiomass: t.projectedBiomassKg,
      projectedBiomassKg: t.projectedBiomassKg,
    };
    if (!canViewFinance) {
      delete mapped.pricePerKg;
      delete mapped.revenue;
      delete mapped.futureCosts;
      delete mapped.totalCosts;
      delete mapped.operatingProfit;
      delete mapped.incrementalProfitVsToday;
    } else if (harvestEval.costSnapshot.feedUnitCostPerKg <= 0) {
      mapped.operatingProfit = null;
      mapped.incrementalProfitVsToday = null;
    }
    return mapped;
  });

  // Map best scenario
  const finalBestScenario = {
    ...bestScenario,
    projectedBiomass: bestScenario.projectedBiomassKg,
    projectedBiomassKg: bestScenario.projectedBiomassKg,
  };
  if (!canViewFinance) {
    delete finalBestScenario.pricePerKg;
    delete finalBestScenario.revenue;
    delete finalBestScenario.futureCosts;
    delete finalBestScenario.totalCosts;
    delete finalBestScenario.operatingProfit;
    delete finalBestScenario.incrementalProfitVsToday;
  } else if (harvestEval.costSnapshot.feedUnitCostPerKg <= 0) {
    finalBestScenario.operatingProfit = null;
    finalBestScenario.incrementalProfitVsToday = null;
  }

  const sanitizedAssumptions = { ...harvestEval.assumptions };
  if (!canViewFinance) {
    delete sanitizedAssumptions.feedCostUnitPerKg;
  }

  return {
    status: 'ok',
    decision,
    decisionReason,
    scope: {
      companyId,
      pondId,
      pondName: String(pondData.pondName || pondData.name || pondId).slice(0, 160),
      cycleId: activeCycleId,
      enterpriseScoped: Boolean(enterpriseScoped),
    },
    assumptions: sanitizedAssumptions,
    missingEvidence: harvestEval.missingEvidence,
    marginBasis: canViewFinance
      ? harvestEval.marginBasis
      : 'none_finance_withheld',
    today: todayScenario,
    targets,
    bestScenario: finalBestScenario,
    finance: canViewFinance
      ? {
          financeAllowed: true,
          incurredCostsToDate: harvestEval.costSnapshot.costsToDate,
          feedUnitCostPerKg: harvestEval.costSnapshot.feedUnitCostPerKg > 0 ? harvestEval.costSnapshot.feedUnitCostPerKg : null,
          marginBasis: 'operating_profit_after_all_incurred_and_projected_costs',
        }
      : {
          financeAllowed: false,
          reason: 'User lacks viewFinance permission. Pricing, revenues, and operating profit withheld.',
          marginBasis: 'none_finance_withheld',
        },
    warnings: Array.from(new Set(harvestEval.costSnapshot.warnings.concat(harvestEval.result.warnings))),
    guardrails: harvestEval.guardrails,
  };
};

/**
 * Router for executing decision tools by name.
 */
const executeDecisionTool = async (name, args, context) => {
  if (name === periodFeedCostTool.name) {
    return summarizePeriodFeedAndCost(args, context);
  }
  if (name === comparePondCyclesTool.name) {
    return comparePondCycles(args, context);
  }
  if (name === inventoryReplenishmentTool.name) {
    return evaluateInventoryReplenishment(args, context);
  }
  if (name === harvestScenarioTool.name) {
    return evaluateHarvestScenario(args, context);
  }
  throw new Error(`Unknown decision tool: ${name}`);
};

module.exports = {
  decisionToolSchemas,
  periodFeedCostTool,
  comparePondCyclesTool,
  inventoryReplenishmentTool,
  harvestScenarioTool,
  executeDecisionTool,
  summarizePeriodFeedAndCost,
  comparePondCycles,
  evaluateInventoryReplenishment,
  evaluateHarvestScenario,
  belongsToCurrentCycle,
  farmToday,
  shiftDate,
  validDateKey,
  validId,
  finite,
  round,
};
