'use strict';

const { hasUserPermission } = require('./permissions');
const { selectDailyFeedEntries } = require('./orsonDomain/orsonEvidence');
const { normalizeFarmDateKey, getFarmDateKey } = require('./orsonDomain/farmDate');
const {
  calculatePondMetricsWithHarvest,
  calculateAdg,
  getPondCurrentDoc,
  toFiniteNumber,
} = require('./orsonDomain/pondCalculations');

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

const decisionToolSchemas = [periodFeedCostTool, comparePondCyclesTool];

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
 * Router for executing decision tools by name.
 */
const executeDecisionTool = async (name, args, context) => {
  if (name === periodFeedCostTool.name) {
    return summarizePeriodFeedAndCost(args, context);
  }
  if (name === comparePondCyclesTool.name) {
    return comparePondCycles(args, context);
  }
  throw new Error(`Unknown decision tool: ${name}`);
};

module.exports = {
  decisionToolSchemas,
  periodFeedCostTool,
  comparePondCyclesTool,
  executeDecisionTool,
  summarizePeriodFeedAndCost,
  comparePondCycles,
  belongsToCurrentCycle,
  farmToday,
  shiftDate,
  validDateKey,
  validId,
  finite,
  round,
};
