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
    const snap = await pondsRef.get();
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

  const daysWithFeedRecorded = allRecordedDates.size;
  const daysWithExplicitZero = allExplicitZeroDates.size;
  const daysUnrecorded = Math.max(0, daysInPeriod - daysWithFeedRecorded);
  const feedCoveragePercent = round((daysWithFeedRecorded / daysInPeriod) * 100, 1) || 0;
  const averageDailyFeedKg =
    daysWithFeedRecorded > 0 ? round(totalFeedKg / daysWithFeedRecorded, 2) : null;

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

  if (canViewFinance) {
    let totalExpenses = 0;
    const expensesByCategory = {};
    let expenseCount = 0;

    const expensesRef = db.collection('companies').doc(companyId).collection('expenses');
    const expenseSnap = await expensesRef.get();

    for (const doc of expenseSnap.docs) {
      const exp = doc.data() || {};
      if (exp.voided === true) continue;

      const expDate = normalizeFarmDateKey(exp.date, tz);
      if (!expDate || expDate < startDate || expDate > endDate) continue;

      if (requestedPondId) {
        const matchesPond =
          exp.pondId === requestedPondId ||
          (Array.isArray(exp.pondIds) && exp.pondIds.includes(requestedPondId));
        if (!matchesPond) continue;
      }

      const amount = finite(exp.amount);
      if (amount === null || amount < 0) continue;

      totalExpenses += amount;
      expenseCount += 1;
      const rawCategory = String(exp.category || 'other').toLowerCase().trim();
      expensesByCategory[rawCategory] = round((expensesByCategory[rawCategory] || 0) + amount, 2);
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
      completeness: 'complete',
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
      daysWithFeedRecorded,
      daysWithExplicitZero,
      daysUnrecorded,
      averageDailyFeedKg,
      coveragePercent: feedCoveragePercent,
      completeness: feedCompleteness,
      ponds: requestedPondId ? undefined : pondFeedSummaries,
    },
    finance: financeData,
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
  const primaryData = primarySnap.data() || {};
  if (scopedData) {
    const scoped = await scopedData('ponds', primaryData);
    if (!scoped) throw new Error('Not permitted');
  }

  let secondaryData = primaryData;
  if (isCrossPond) {
    const secondarySnap = await pondsRef.doc(secondaryPondId).get();
    if (!secondarySnap.exists) {
      return { status: 'not_found', message: `Compare pond ${secondaryPondId} not found.` };
    }
    secondaryData = secondarySnap.data() || {};
    if (scopedData) {
      const scoped = await scopedData('ponds', secondaryData);
      if (!scoped) throw new Error('Not permitted');
    }
  }

  const primaryPondCycle = cycleId || primaryData.pondCycleId || primaryData.cycleId || 'current';
  const secondaryPondCycle = compareCycleId || secondaryData.pondCycleId || secondaryData.cycleId || 'current';

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

  const calculateTargetMetrics = (pondData, samplings, mortalityRecords, alignDoc) => {
    const effectivePond = {
      ...pondData,
      samplings,
      mortalityRecords,
    };

    const calcOptions = {};
    if (alignDoc !== null) {
      calcOptions.currentDoc = alignDoc;
    }

    const metrics = calculatePondMetricsWithHarvest(effectivePond, tz, calcOptions);

    const validMbwCount = samplings.filter((s) => Number(s.mbw ?? s.abw) > 0).length;
    const completeness =
      validMbwCount >= 3 ? 'complete' : validMbwCount >= 1 ? 'partial' : 'sparse';

    return {
      metrics: {
        doc: metrics.doc,
        latestMbw: round(metrics.latestMbw, 2),
        size: metrics.size,
        adg: round(metrics.adg, 3),
        currentBiomassKg: round(metrics.currentBiomass, 2),
        currentPopulation: Math.round(metrics.currentPopulation),
        survivalRatePercent: round(metrics.adjustedSR, 1),
        totalFeedConsumedKg: round(metrics.totalFeedConsumed, 2),
        fcr: metrics.adjustedFCR > 0 ? round(metrics.adjustedFCR, 2) : null,
        totalMortality: Math.round(metrics.totalMortality),
      },
      coverage: {
        samplingsCount: samplings.length,
        validMbwObservations: validMbwCount,
        mortalityRecordsCount: mortalityRecords.length,
        completeness,
      },
    };
  };

  const primaryResult = calculateTargetMetrics(primaryData, primarySamplings, primaryMortality, asOfDoc);
  const secondaryResult = calculateTargetMetrics(secondaryData, secondarySamplings, secondaryMortality, asOfDoc);

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
    const primaryFeedCost = finite(primaryData.feedCost);
    const secondaryFeedCost = finite(secondaryData.feedCost);
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
      ...primaryResult,
    },
    secondary: {
      pondId: secondaryPondId,
      pondName: String(secondaryData.pondName || secondaryData.name || secondaryPondId).slice(0, 160),
      cycleId: secondaryPondCycle,
      ...secondaryResult,
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

/**
 * Evaluate read-only harvest scenarios comparing harvesting today versus continuing to grow to target sizes or dates.
 * Reuses canonical calculatePondMetricsWithHarvest, daysToTargetMbwWithTapering, projectMbwWithTapering,
 * and calculateExpectedSurvivalRetention.
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
    ? Math.min(120, args.daysToHarvest)
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
  const todayKey = farmToday(timeZone);
  const now = new Date();

  const metrics = calculatePondMetricsWithHarvest(scopedPond, timeZone, {
    currentDateKey: todayKey,
    now,
  });

  // Calculate recorded mortality rate
  const mortalityRecords = scopedPond.mortalityRecords || [];
  const validMortalityDates = new Set();
  let estimatedDeaths = 0;
  for (const m of mortalityRecords) {
    const d = typeof m.date === 'string' ? m.date.slice(0, 10) : null;
    if (!d || !validDateKey(d)) continue;
    validMortalityDates.add(d);
    if (m.observationType === 'estimated_total' || !m.observationType) {
      estimatedDeaths += nonNegative(m.count);
    }
  }
  const recordedMortalityDays = validMortalityDates.size;
  const fallbackDailyMortalityRatePercent =
    metrics.biomassEstimate?.expectedDailyMortalityRatePercent || 0.05;

  let dailyMortalityRatePercent = fallbackDailyMortalityRatePercent;
  let mortalityBasis = 'biological_fallback';
  if (recordedMortalityDays > 0 && metrics.currentPopulation > 0) {
    dailyMortalityRatePercent = (estimatedDeaths / (metrics.currentPopulation * recordedMortalityDays)) * 100;
    mortalityBasis = 'recorded_mortality_trend';
  }

  // Fetch feeds and usage for recent daily feed totals
  const feedsSnap = await baseRef.collection('feeds').get();
  const feeds = [];
  for (const doc of feedsSnap.docs || []) {
    let f = { id: doc.id, ...doc.data() };
    if (scopedData) {
      f = await scopedData('feeds', f);
      if (!f) continue;
    }
    feeds.push(f);
  }

  const dailyFeedMap = new Map();
  let totalFeedConsumedPondKg = 0;
  let totalFeedCostPond = 0;
  for (const feed of feeds) {
    const usages = feed.usageHistory || [];
    const unitPrice = finite(feed.costPerUnit || feed.price || feed.averageCost);
    for (const usage of usages) {
      if (usage.pondId && usage.pondId !== pondId) continue;
      if (!belongsToCurrentCycle(usage, { pondCycleId: activeCycleId, cycleId: activeCycleId })) continue;
      const d = typeof usage.date === 'string' ? usage.date.slice(0, 10) : null;
      const qty = finite(usage.quantity);
      if (!d || !validDateKey(d) || qty === null || qty <= 0) continue;
      dailyFeedMap.set(d, (dailyFeedMap.get(d) || 0) + qty);
      totalFeedConsumedPondKg += qty;
      const savedCost = finite(usage.totalCost);
      if (savedCost !== null) {
        totalFeedCostPond += savedCost;
      } else if (unitPrice !== null) {
        totalFeedCostPond += qty * unitPrice;
      }
    }
  }

  // Build sorted daily feed entries
  const recentFeedDates = Array.from(dailyFeedMap.keys()).sort();
  let startingDailyFeedKg = 0;
  if (recentFeedDates.length > 0) {
    const latestFeedDate = recentFeedDates[recentFeedDates.length - 1];
    startingDailyFeedKg = dailyFeedMap.get(latestFeedDate) || 0;
  }

  // Daily feed increase rate
  let dailyFeedRate = 0.03;
  if (recentFeedDates.length >= 2) {
    const sortedQuantities = recentFeedDates.map((d) => dailyFeedMap.get(d));
    let totalRate = 0;
    let rateCount = 0;
    for (let i = 1; i < sortedQuantities.length; i++) {
      const prev = sortedQuantities[i - 1];
      const curr = sortedQuantities[i];
      if (prev > 0) {
        totalRate += (curr - prev) / prev;
        rateCount++;
      }
    }
    if (rateCount > 0) {
      dailyFeedRate = Math.max(0, Math.min(0.15, totalRate / rateCount));
    }
  }

  // Finance gating
  const canViewFinance = Boolean(allowed('viewFinance'));
  let feedUnitCostPerKg = null;
  let costsToDate = { feed: 0, additives: 0, generalExpenses: 0, other: 0 };
  let projectedDailyAdditive = 0;
  let projectedDailyGeneral = 0;
  let resolvedPriceLadder = customPriceLadder || [];

  if (canViewFinance) {
    if (totalFeedConsumedPondKg > 0 && totalFeedCostPond > 0) {
      feedUnitCostPerKg = round(totalFeedCostPond / totalFeedConsumedPondKg, 2);
    } else if (feeds.length > 0) {
      const prices = feeds.map((f) => finite(f.costPerUnit || f.price)).filter((p) => p !== null && p > 0);
      if (prices.length > 0) {
        feedUnitCostPerKg = round(prices.reduce((a, b) => a + b, 0) / prices.length, 2);
      }
    }

    costsToDate.feed = round(totalFeedCostPond, 2);
    try {
      const expSnap = await baseRef.collection('expenses').get();
      for (const doc of expSnap.docs || []) {
        const exp = doc.data();
        if (exp.voided) continue;
        const amount = finite(exp.amount);
        if (amount === null || amount <= 0) continue;
        if (exp.pondId === pondId) {
          const cat = String(exp.category || '').toLowerCase();
          if (cat.includes('feed')) costsToDate.feed = round(costsToDate.feed + amount, 2);
          else if (cat.includes('additive') || cat.includes('probiotic') || cat.includes('mineral')) {
            costsToDate.additives = round(costsToDate.additives + amount, 2);
          } else {
            costsToDate.generalExpenses = round(costsToDate.generalExpenses + amount, 2);
          }
        }
      }
    } catch (_) {
      // safe fallback if expenses collection inaccessible
    }

    if (!resolvedPriceLadder.length && company?.harvestMarketPrices && typeof company.harvestMarketPrices === 'object') {
      resolvedPriceLadder = Object.entries(company.harvestMarketPrices)
        .map(([size, price]) => ({ sizeCountPerKg: finite(size), pricePerKg: finite(price) }))
        .filter((t) => t.sizeCountPerKg !== null && t.sizeCountPerKg > 0 && t.pricePerKg !== null && t.pricePerKg > 0)
        .sort((a, b) => b.sizeCountPerKg - a.sizeCountPerKg);
    }
  }

  const resolvePriceForSize = (sizeCount) => {
    if (!canViewFinance) return null;
    if (expectedPricePerKg !== null) return expectedPricePerKg;
    if (!resolvedPriceLadder.length) return null;
    if (sizeCount === null || sizeCount <= 0) return resolvedPriceLadder[0].pricePerKg;
    let closest = resolvedPriceLadder[0];
    let minDiff = Math.abs(closest.sizeCountPerKg - sizeCount);
    for (const tier of resolvedPriceLadder) {
      const diff = Math.abs(tier.sizeCountPerKg - sizeCount);
      if (diff < minDiff) {
        minDiff = diff;
        closest = tier;
      }
    }
    return closest.pricePerKg;
  };

  const currentSizeCount = metrics.latestMbw > 0 ? round(1000 / metrics.latestMbw, 1) : null;
  const currentPricePerKg = currentSizeCount !== null ? resolvePriceForSize(currentSizeCount) : null;

  const sumCosts = (c) => (c ? c.feed + c.additives + c.generalExpenses + c.other : 0);

  // Today scenario
  const todayRevenue = canViewFinance && currentPricePerKg !== null && metrics.currentBiomassKg !== null
    ? round(metrics.currentBiomassKg * currentPricePerKg, 2)
    : null;
  const todayOperatingProfit = todayRevenue !== null
    ? round(todayRevenue - sumCosts(costsToDate), 2)
    : null;

  const todayScenario = {
    kind: 'today',
    targetSizeCountPerKg: currentSizeCount,
    targetMbwG: metrics.latestMbw,
    daysFromNow: 0,
    projectedPopulation: metrics.currentPopulation,
    projectedSurvivalRatePercent: metrics.adjustedSR,
    projectedBiomassKg: metrics.currentBiomassKg,
    ...(canViewFinance
      ? {
          pricePerKg: currentPricePerKg,
          revenue: todayRevenue,
          futureFeedKg: 0,
          futureCosts: { feed: 0, additives: 0, generalExpenses: 0, other: 0 },
          totalCosts: { ...costsToDate },
          operatingProfit: todayOperatingProfit,
          incrementalProfitVsToday: 0,
        }
      : {}),
  };

  // Determine candidate targets
  const candidateTargets = [];
  const maxMbw = Math.max(50, (metrics.latestMbw || 0) * 1.5);

  if (targetMbwG && targetMbwG > (metrics.latestMbw || 0)) {
    candidateTargets.push({ targetMbw: targetMbwG, targetSize: round(1000 / targetMbwG, 1) });
  }
  if (targetSizeCountPerKg && currentSizeCount && targetSizeCountPerKg < currentSizeCount) {
    const mbw = 1000 / targetSizeCountPerKg;
    if (!candidateTargets.some((t) => Math.abs(t.targetMbw - mbw) < 0.5)) {
      candidateTargets.push({ targetMbw: mbw, targetSize: targetSizeCountPerKg });
    }
  }
  if (requestedDays && requestedDays > 0) {
    const projectedMbw = projectMbwWithTapering(metrics.latestMbw || 0.5, metrics.adg || 0.2, requestedDays, maxMbw);
    const targetSize = round(1000 / projectedMbw, 1);
    if (!candidateTargets.some((t) => Math.abs(t.targetMbw - projectedMbw) < 0.5)) {
      candidateTargets.push({ targetMbw: projectedMbw, targetSize, forcedDays: requestedDays });
    }
  }

  // Add reachable price ladder tiers
  if (resolvedPriceLadder.length > 0 && currentSizeCount) {
    for (const tier of resolvedPriceLadder) {
      if (tier.sizeCountPerKg < currentSizeCount) {
        const mbw = 1000 / tier.sizeCountPerKg;
        if (!candidateTargets.some((t) => Math.abs(t.targetMbw - mbw) < 0.5)) {
          candidateTargets.push({ targetMbw: mbw, targetSize: tier.sizeCountPerKg });
        }
      }
    }
  }

  // Build target scenarios
  const targets = [];
  const warnings = [];

  for (const candidate of candidateTargets) {
    const targetMbw = candidate.targetMbw;
    const days = candidate.forcedDays !== undefined
      ? candidate.forcedDays
      : Math.max(1, Math.ceil(daysToTargetMbwWithTapering(metrics.latestMbw || 0.5, targetMbw, metrics.adg || 0.2, maxMbw)));

    if (days > 120) continue;

    const projectedMbw = candidate.forcedDays !== undefined
      ? targetMbw
      : projectMbwWithTapering(metrics.latestMbw || 0.5, metrics.adg || 0.2, days, maxMbw);
    const sizeCount = round(1000 / projectedMbw, 1);

    // Biological survival projection
    const mortalityRetention = Math.max(0.1, Math.min(1.0, Math.pow(1 - dailyMortalityRatePercent / 100, days)));
    const projectedPopulation = Math.max(0, Math.round((metrics.currentPopulation || 0) * mortalityRetention));
    const projectedSurvivalRatePercent = metrics.initialPopulation > 0
      ? round((projectedPopulation / metrics.initialPopulation) * 100, 1)
      : null;
    const projectedBiomassKg = round((projectedPopulation * projectedMbw) / 1000, 2);

    const biomassGain = Math.max(0, (projectedBiomassKg || 0) - (metrics.currentBiomassKg || 0));
    const fcrBenchmark = metrics.adjustedFCR > 0 ? metrics.adjustedFCR : 1.4;
    const futureFeedKg = round(Math.max(biomassGain * fcrBenchmark, startingDailyFeedKg * days), 2);

    let priceTier = null;
    let rev = null;
    let futureCosts = null;
    let totCosts = null;
    let opProfit = null;
    let incProfit = null;

    if (canViewFinance) {
      priceTier = resolvePriceForSize(sizeCount);
      rev = priceTier !== null && projectedBiomassKg !== null ? round(projectedBiomassKg * priceTier, 2) : null;
      const unitCost = feedUnitCostPerKg !== null ? feedUnitCostPerKg : 1.5;
      const futureFeedCost = round(futureFeedKg * unitCost, 2);
      futureCosts = {
        feed: futureFeedCost,
        additives: round(projectedDailyAdditive * days, 2),
        generalExpenses: round(projectedDailyGeneral * days, 2),
        other: 0,
      };
      totCosts = {
        feed: round(costsToDate.feed + futureCosts.feed, 2),
        additives: round(costsToDate.additives + futureCosts.additives, 2),
        generalExpenses: round(costsToDate.generalExpenses + futureCosts.generalExpenses, 2),
        other: round(costsToDate.other + futureCosts.other, 2),
      };
      opProfit = rev !== null ? round(rev - sumCosts(totCosts), 2) : null;
      incProfit = opProfit !== null && todayOperatingProfit !== null ? round(opProfit - todayOperatingProfit, 2) : null;
    }

    targets.push({
      kind: 'target',
      targetSizeCountPerKg: sizeCount,
      targetMbwG: round(projectedMbw, 2),
      daysFromNow: days,
      projectedPopulation,
      projectedSurvivalRatePercent,
      projectedBiomassKg,
      futureFeedKg,
      ...(canViewFinance
        ? {
            pricePerKg: priceTier,
            revenue: rev,
            futureCosts,
            totalCosts: totCosts,
            operatingProfit: opProfit,
            incrementalProfitVsToday: incProfit,
          }
        : {}),
    });
  }

  // Sort targets by daysFromNow ascending
  targets.sort((a, b) => a.daysFromNow - b.daysFromNow);

  // Missing evidence
  const missingEvidence = [];
  if (!metrics.latestMbw || metrics.latestMbw <= 0) missingEvidence.push('missing_valid_sampling_mbw');
  if (!metrics.currentPopulation || metrics.currentPopulation <= 0) missingEvidence.push('missing_current_population');
  if (startingDailyFeedKg <= 0 && (!metrics.adjustedFCR || metrics.adjustedFCR <= 0)) {
    missingEvidence.push('missing_recent_daily_feed');
    warnings.push('Future feed cost cannot be accurately projected without recent feed records or historical FCR.');
  }
  if (recordedMortalityDays === 0) {
    missingEvidence.push('missing_recorded_mortality_logs');
  }
  if (canViewFinance && !resolvedPriceLadder.length && expectedPricePerKg === null) {
    missingEvidence.push('missing_market_price');
    warnings.push('Market price tiers are missing. Financial revenue and operating profit require market prices.');
  }
  if (canViewFinance && feedUnitCostPerKg === null) {
    missingEvidence.push('missing_historical_feed_unit_cost');
  }

  // Decision formulation
  let decision = 'review_data';
  let decisionReason = '';
  let bestScenario = todayScenario;

  const hasCriticalData =
    metrics.currentPopulation > 0 &&
    metrics.latestMbw > 0 &&
    (!canViewFinance || (resolvedPriceLadder.length > 0 || expectedPricePerKg !== null));

  if (!hasCriticalData) {
    decision = 'review_data';
    decisionReason = 'Critical biological or market-price data is missing.';
  } else if (canViewFinance) {
    const validTargets = targets.filter((t) => t.operatingProfit !== null && t.operatingProfit !== undefined);
    if (validTargets.length > 0) {
      bestScenario = [todayScenario, ...validTargets].reduce((best, s) =>
        s.operatingProfit > best.operatingProfit ? s : best,
      );
    }
    if (bestScenario.kind === 'target' && bestScenario.operatingProfit > (todayScenario.operatingProfit || 0) && bestScenario.operatingProfit > 0) {
      decision = 'keep_growing';
      decisionReason = `Target size ${bestScenario.targetSizeCountPerKg} is projected to improve operating profit by ${round(bestScenario.incrementalProfitVsToday)}.`;
    } else if (targets.length === 0) {
      decision = 'harvest_now';
      decisionReason = 'No reachable larger market size has a valid, more profitable projection.';
    } else {
      decision = 'harvest_now';
      decisionReason = 'Harvesting now has equal or higher projected operating profit than reachable larger sizes.';
    }
  } else {
    // Non-finance operational decision
    if (metrics.adg > 0 && targets.length > 0) {
      decision = 'keep_growing';
      decisionReason = `Pond exhibits positive growth (ADG ${metrics.adg}g/day). Target size reachable within projection window.`;
      bestScenario = targets[0];
    } else if (metrics.adg <= 0) {
      decision = 'harvest_now';
      decisionReason = 'Growth has plateaued or historical ADG is zero/negative.';
    } else {
      decision = 'harvest_now';
      decisionReason = 'Current harvest size meets active cycle operational targets.';
    }
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
    assumptions: {
      growthModel: 'von_bertalanffy_tapered_growth',
      assumedAdgGPerDay: metrics.adg,
      mortalityBasis,
      mortalityDailyRatePercent: round(dailyMortalityRatePercent, 4),
      feedDailyIncreaseRatePercent: round(dailyFeedRate * 100, 2),
    },
    missingEvidence,
    marginBasis: canViewFinance
      ? 'operating_profit_after_all_incurred_and_projected_costs'
      : 'none_finance_withheld',
    today: todayScenario,
    targets,
    bestScenario,
    finance: canViewFinance
      ? {
          financeAllowed: true,
          incurredCostsToDate: costsToDate,
          feedUnitCostPerKg,
          marginBasis: 'operating_profit_after_all_incurred_and_projected_costs',
        }
      : {
          financeAllowed: false,
          reason: 'User lacks viewFinance permission. Pricing, revenues, and operating profit withheld.',
          marginBasis: 'none_finance_withheld',
        },
    warnings,
    guardrails: {
      advisoryOnly: true,
      noFarmWrites: true,
      noHarvestDraftCreated: true,
      notes: 'Pure read-only decision scenario. No harvest records created and no Firestore writes occurred.',
    },
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
