'use strict';

const { selectDailyFeedEntries } = require('./orsonDomain/orsonEvidence');
const { normalizeFarmDateKey } = require('./orsonDomain/farmDate');
const {
  calculatePondMetricsWithHarvest,
} = require('./orsonDomain/pondCalculations');
const { evaluateReplenishmentScenario } = require('./orsonInventoryPolicy');
const {
  buildPondProfitabilityCostSnapshot,
  evaluateHarvestDecisionForPond,
  isPondActiveOnDate,
} = require('./orsonDomain/harvestProfitability');
const { allocateExpenseAcrossCyclePonds } = require('./orsonDomain/financeCycleAllocation');
const { hasValidExpenseAllocations, requiresProductionAllocation } = require('./orsonDomain/financeExpenseAllocation');
const { isCycleOperatingExpense } = require('./orsonDomain/reportingIntegrity');
const { isInventoryTransfer } = require('./orsonDomain/financeIntegrity');

/**
 * Canonically identifies inventory stock-in purchases to avoid double-counting.
 */
const isInventoryPurchaseExpense = (expense) =>
  Boolean(
    expense?.reference?.startsWith('INVENTORY-') ||
    expense?.linkedInventory?.trim() ||
    String(expense?.category || '').toLowerCase().includes('feed purchase')
  );

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PERIOD_PAGE_SIZE = 100;
const MAX_PERIOD_PAGES = 10;
const MAX_PERIOD_USAGE_ROWS_PER_ITEM = 1000;

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

const splitAmountAcrossPondIds = (amount, pondIds) => {
  const uniqueIds = Array.from(new Set((pondIds || []).filter((id) => typeof id === 'string' && id))).sort();
  if (uniqueIds.length === 0 || !Number.isFinite(amount) || amount < 0) return [];
  const totalMinorUnits = Math.round(amount * 100);
  const baseMinorUnits = Math.floor(totalMinorUnits / uniqueIds.length);
  const remainder = totalMinorUnits - baseMinorUnits * uniqueIds.length;
  return uniqueIds.map((pondId, index) => ({
    pondId,
    amount: (baseMinorUnits + (index < remainder ? 1 : 0)) / 100,
  }));
};

const readBoundedCollection = async (ref, pageSize = MAX_PERIOD_PAGE_SIZE, maxPages = MAX_PERIOD_PAGES) => {
  const docsById = new Map();
  let cursor = null;
  let pagesRead = 0;
  let truncated = false;
  let failed = false;

  try {
    while (pagesRead < maxPages) {
      pagesRead += 1;
      let query = typeof ref.orderBy === 'function' ? ref.orderBy('__name__') : ref;
      if (cursor) {
        if (typeof query.startAfter !== 'function') {
          truncated = true;
          break;
        }
        query = query.startAfter(cursor);
      }
      if (typeof query.limit !== 'function') {
        truncated = true;
        break;
      }

      const snap = await query.limit(pageSize).get();
      const docs = Array.isArray(snap?.docs) ? snap.docs : [];
      for (const doc of docs) {
        if (doc?.id && !docsById.has(doc.id)) docsById.set(doc.id, doc);
      }
      if (docs.length < pageSize) break;
      cursor = docs[docs.length - 1];
      if (pagesRead === maxPages) truncated = true;
    }
  } catch (_) {
    failed = true;
    truncated = true;
  }

  return {
    docs: Array.from(docsById.values()).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    pagesRead,
    recordsRead: docsById.size,
    truncated,
    failed,
  };
};

const usageMatchesPondsInPeriod = (usage, ponds, startDate, endDate, timeZone) => {
  if (usage?.voided === true || usage?.isVoid === true || isInventoryTransfer(usage)) return false;
  const date = normalizeFarmDateKey(usage?.date, timeZone);
  if (!date || date < startDate || date > endDate) return false;

  if (usage?.pondId) {
    return ponds.some((pond) => {
      if (pond.id !== usage.pondId) return false;
      if (usage.pondCycleId && usage.pondCycleId !== pond.pondCycleId) return false;
      return !usage.cycleId || [pond.cycleId, pond.pondCycleId].includes(usage.cycleId);
    });
  }
  if (usage?.pondCycleId) return ponds.some((pond) => pond.pondCycleId === usage.pondCycleId);
  if (usage?.cycleId) return ponds.some((pond) => [pond.cycleId, pond.pondCycleId].includes(usage.cycleId));
  return ponds.some((pond) => isPondActiveOnDate(pond, date, timeZone));
};

const hasRecordedUsageCost = (usage) => {
  const totalCost = finite(usage?.totalCost);
  if (totalCost !== null) return totalCost >= 0;
  const quantity = finite(usage?.quantity);
  const unitPrice = finite(usage?.unitPrice);
  const calculatedCost = quantity !== null && unitPrice !== null ? quantity * unitPrice : null;
  return quantity !== null && quantity >= 0 && unitPrice !== null && unitPrice >= 0 && Number.isFinite(calculatedCost);
};

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
    'Summarize recorded feeding totals and coverage, authorized operating-expense entries, and recorded consumed feed cost separately for one pond or all accessible ponds. If dates are omitted, use an inclusive 30 farm-local calendar-day window ending on the captured as-of date. Inventory stock-in purchases are excluded from consumed cost. Missing cost evidence and incomplete retrieval are disclosed. Non-finance users receive only feed totals and coverage. No writes.',
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
        description:
          'Optional inclusive start date in YYYY-MM-DD format. If omitted, resolves to 30 farm-local calendar days ending on endDate or farm today.',
      },
      endDate: {
        type: 'string',
        description: 'Optional inclusive end date in YYYY-MM-DD format. Defaults to farm-local today.',
      },
    },
    required: [],
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
      lookbackDays: {
        type: 'integer',
        minimum: 3,
        maximum: 60,
        description: 'Recent calendar days used to estimate usage (default: 14).',
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
        description: 'Optional maximum horizon for reachable size-tier projections; this does not request a harvest on an exact date.',
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
  const capturedAsOfDate = args.endDate ? normalizeFarmDateKey(args.endDate, tz) : farmToday(tz);
  if (args.endDate && !validDateKey(capturedAsOfDate)) throw new Error('Invalid end date');

  let startDate = args.startDate ? normalizeFarmDateKey(args.startDate, tz) : null;
  let endDate = args.endDate ? normalizeFarmDateKey(args.endDate, tz) : null;
  if (args.startDate && !validDateKey(startDate)) throw new Error('Invalid start date');
  if (args.endDate && !validDateKey(endDate)) throw new Error('Invalid end date');
  if (startDate) {
    endDate = endDate || capturedAsOfDate;
  } else {
    endDate = endDate || capturedAsOfDate;
    startDate = shiftDate(endDate, -29);
  }

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
  const allocationPonds = [];
  const pondRead = await readBoundedCollection(pondsRef, MAX_PERIOD_PAGE_SIZE, MAX_PERIOD_PAGES);
  let pondsTruncated = pondRead.truncated;
  const pondEnumerationFailed = pondRead.failed;
  const allCompanyPonds = pondRead.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
  for (const rawData of allCompanyPonds) {
    const scoped = scopedData ? await scopedData('ponds', rawData) : rawData;
    if (!scoped) continue;
    allocationPonds.push({ id: rawData.id, ...scoped });
  }

  if (requestedPondId) {
    let requestedPond = allocationPonds.find((pond) => pond.id === requestedPondId);
    if (!requestedPond) {
      // Verify an explicit ID directly so a missing pond remains not_found while an
      // existing pond outside the caller's scope remains an authorization failure.
      const requestedSnap = await pondsRef.doc(requestedPondId).get();
      if (!requestedSnap.exists) {
        return { status: 'not_found', message: `Pond ${requestedPondId} not found.`, writesPerformed: 0 };
      }
      const rawData = requestedSnap.data() || {};
      const scoped = scopedData ? await scopedData('ponds', rawData) : rawData;
      if (!scoped) throw new Error('Not permitted');
      requestedPond = { id: requestedSnap.id, ...scoped };
      allocationPonds.push(requestedPond);
      if (!allCompanyPonds.some((pond) => pond.id === requestedSnap.id)) {
        allCompanyPonds.push({ id: requestedSnap.id, ...rawData });
      }
      // The bounded pond page may not include this pond, so shared-cost allocation
      // is necessarily incomplete even though the direct pond read succeeded.
      pondsTruncated = true;
    }
    if (!requestedPond) {
      return { status: 'not_found', message: `Pond ${requestedPondId} not found.`, writesPerformed: 0 };
    }
    targetPonds.push(requestedPond);
  } else {
    targetPonds.push(...allocationPonds);
  }

  const canViewFinance = Boolean(allowed('viewFinance'));
  const configuredCurrency =
    (typeof company?.currency === 'string' && company.currency.trim().toUpperCase()) ||
    (typeof company?.currencyCode === 'string' && company.currencyCode.trim().toUpperCase()) ||
    (typeof company?.settings?.currency === 'string' && company.settings.currency.trim().toUpperCase()) ||
    null;
  const baseCurrencyDescription = configuredCurrency
    ? `Company currency is configured as ${configuredCurrency}.`
    : 'Company currency is not configured; amounts use stored company monetary units.';

  if (targetPonds.length === 0) {
    return {
      status: 'unavailable',
      scope: {
        companyId,
        pondId: requestedPondId,
        boundary: enterpriseScoped ? 'assigned_ponds' : 'company',
        pondsCount: 0,
        pondCount: 0,
        enterpriseScoped: Boolean(enterpriseScoped),
      },
      period: { startDate, endDate, daysInPeriod, timeZone: tz, asOf: capturedAsOfDate, asOfDate: capturedAsOfDate },
      feed: {
        totalFeedKg: null,
        daysWithFeedRecorded: 0,
        daysWithExplicitZero: 0,
        daysUnrecorded: daysInPeriod,
        averageDailyFeedKg: null,
        coveragePercent: 0,
        completeness: 'unavailable',
        basis: 'recorded_daily_allocation',
        totalsPartial: pondsTruncated || pondEnumerationFailed,
      },
      ponds: [],
      ...(canViewFinance ? {
        finance: {
          financeAllowed: true,
          currency: configuredCurrency,
          currencyStatus: configuredCurrency ? 'configured' : 'unspecified',
          currencyDescription: baseCurrencyDescription,
          recordedOperatingExpenseSubtotal: null,
          operatingExpenseEntryCount: null,
          operatingExpenseEvidence: 'unavailable',
          operatingExpenseReadStatus: 'unavailable',
          consumedFeedCost: null,
          consumedFeedCostCompleteness: 'unavailable',
        },
        farmTotal: { available: false, reason: 'No authorized ponds were available for this query.' },
      } : {}),
      retrieval: {
        pondsTruncated,
        complete: !pondsTruncated && !pondEnumerationFailed,
        recordsRead: { ponds: pondRead.recordsRead },
      },
      writesPerformed: 0,
    };
  }

  // Aggregate daily feed entries per pond using canonical selectDailyFeedEntries
  let totalFeedKg = 0;
  const pondFeedSummaries = [];
  const allRecordedDates = new Set();
  const allExplicitZeroDates = new Set();
  const allFeedSourceIds = new Set();
  let totalAmbiguousFeedRecords = 0;

  for (const pond of targetPonds) {
    const samplings = Array.isArray(pond.samplings) ? pond.samplings : [];
    const currentCycleIds = [pond.pondCycleId, pond.cycleId].filter((value) => typeof value === 'string' && value);
    const periodRecords = samplings.filter((record) => {
      const date = normalizeFarmDateKey(
        record?.feedData?.measuredAt ?? record?.feedData?.observedAt ?? record?.feedData?.date ??
        record?.measuredAt ?? record?.observedAt ?? record?.farmDate ?? record?.date,
        tz,
      );
      return date && date >= startDate && date <= endDate;
    });
    const historicalCycleRecords = periodRecords.filter((record) => {
      const ids = [record?.pondCycleId, record?.cycleId].filter((value) => typeof value === 'string' && value);
      return ids.length > 0 && currentCycleIds.length > 0 && !ids.some((id) => currentCycleIds.includes(id));
    });
    const hasHistoricalCycleEvidence = historicalCycleRecords.length > 0;
    const cycleStart = normalizeFarmDateKey(pond.cycleStartedAt || pond.docStart, tz);
    const ambiguousRecords = periodRecords.filter((record) => {
      const ids = [record?.pondCycleId, record?.cycleId].filter((value) => typeof value === 'string' && value);
      if (ids.length || !currentCycleIds.length) return false;
      const date = normalizeFarmDateKey(
        record?.feedData?.measuredAt ?? record?.feedData?.observedAt ?? record?.feedData?.date ??
        record?.measuredAt ?? record?.observedAt ?? record?.farmDate ?? record?.date,
        tz,
      );
      return hasHistoricalCycleEvidence || (cycleStart && date < cycleStart);
    });
    totalAmbiguousFeedRecords += ambiguousRecords.length;

    const canonicalFeedEntries = selectDailyFeedEntries(periodRecords, {
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
    const pondSourceIds = new Set();
    let hasAuthoritativeFeed = false;

    for (const entry of filtered) {
      pondRecordedDates.add(entry.farmDate);
      allRecordedDates.add(entry.farmDate);
      if (entry.hasAuthoritativeDailyFeed) hasAuthoritativeFeed = true;
      for (const sourceId of entry.sourceIds || []) {
        if (!sourceId) continue;
        pondSourceIds.add(sourceId);
        allFeedSourceIds.add(sourceId);
      }
      if (entry.feedKg === 0) {
        pondZeroCount += 1;
        allExplicitZeroDates.add(entry.farmDate);
      } else {
        pondFeedSum += entry.feedKg;
      }
    }

    totalFeedKg += pondFeedSum;
    const coveragePercent = daysInPeriod > 0
      ? round((pondRecordedDates.size / daysInPeriod) * 100, 1) || 0
      : 0;
    const feedCompleteness = ambiguousRecords.length > 0
      ? 'partial'
      : pondRecordedDates.size === daysInPeriod ? 'complete'
        : pondRecordedDates.size > 0 ? 'partial' : 'unavailable';
    const missingDates = [];
    for (let offset = 0; offset < daysInPeriod; offset += 1) {
      const date = shiftDate(startDate, offset);
      if (!pondRecordedDates.has(date)) missingDates.push(date);
    }
    const periodCycleIds = Array.from(new Set(periodRecords.flatMap((record) =>
      [record?.pondCycleId, record?.cycleId].filter((value) => typeof value === 'string' && value)
    ))).sort();

    pondFeedSummaries.push({
      pondId: pond.id,
      pondName: String(pond.pondName || pond.name || pond.id).slice(0, 160),
      cycleId: periodCycleIds.length === 1 ? periodCycleIds[0] : null,
      totalFeedKg: pondRecordedDates.size > 0 ? round(pondFeedSum, 2) : null,
      recordedDays: pondRecordedDates.size,
      explicitZeroDays: pondZeroCount,
      averageDailyFeedKg:
        pondRecordedDates.size > 0 ? round(pondFeedSum / pondRecordedDates.size, 2) : null,
      feed: {
        totalKg: pondRecordedDates.size > 0 ? round(pondFeedSum, 2) : null,
        totalFeedKg: pondRecordedDates.size > 0 ? round(pondFeedSum, 2) : null,
        daysWithFeedRecorded: pondRecordedDates.size,
        recordedPondDays: pondRecordedDates.size,
        daysWithExplicitZero: pondZeroCount,
        explicitZeroDays: pondZeroCount,
        daysUnrecorded: Math.max(0, daysInPeriod - pondRecordedDates.size),
        expectedPondDays: daysInPeriod,
        averageDailyFeedKg: pondRecordedDates.size > 0 ? round(pondFeedSum / pondRecordedDates.size, 2) : null,
        completeness: feedCompleteness,
        basis: 'recorded_daily_allocation',
      },
      coverage: {
        startDate,
        endDate,
        asOfDate: capturedAsOfDate,
        timeZone: tz,
        daysInPeriod,
        recordedDays: pondRecordedDates.size,
        expectedDays: daysInPeriod,
        daysUnrecorded: Math.max(0, daysInPeriod - pondRecordedDates.size),
        coveragePercent,
        completeness: feedCompleteness,
      },
      evidence: {
        sourceIds: Array.from(pondSourceIds).sort(),
        recordedDates: Array.from(pondRecordedDates).sort(),
        missingDates,
        hasAuthoritativeFeed,
        hasExplicitZeroFeed: pondZeroCount > 0,
        historicalCyclesCount: historicalCycleRecords.length,
        ambiguousAttribution: ambiguousRecords.length > 0,
        ambiguousAttributionCount: ambiguousRecords.length,
      },
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

  const feedCompleteness = pondsTruncated || totalAmbiguousFeedRecords > 0
    ? 'partial'
    : totalRecordedPondDays === totalExpectedPondDays ? 'complete'
      : totalRecordedPondDays > 0 ? 'partial' : 'unavailable';

  // Strict Finance Gating: only query and expose expenses if user has viewFinance
  let financeData = null;
  let expensesTruncated = false;
  let feedsTruncated = false;
  let additivesTruncated = false;
  let usageHistoryTruncated = false;
  let expensesReadFailed = false;
  let feedsReadFailed = false;
  let additivesReadFailed = false;
  let expenseRecordsRead = 0;
  let feedItemsRead = 0;
  let additiveItemsRead = 0;
  let unallocatedCompanyWideExpenseCount = 0;
  let unallocatedCompanyWideExpenseSubtotal = 0;
  let unallocatedCompanyWideSubtotalUnavailable = false;
  const unallocatedCompanyWideCurrencyCodes = new Set();
  let unallocatedCompanyWideHasUncodedCurrency = false;
  let staleCycleExpenseCount = 0;
  const withheldSharedExpenses = [];
  const pondExpenseAllocations = new Map(targetPonds.map((pond) => [pond.id, {
    amount: 0,
    entryCount: 0,
    explicitZeroCount: 0,
    entryIds: new Set(),
    explicitZeroEntryIds: new Set(),
    byCategory: {},
    currencyCodes: new Set(),
    uncodedEntryIds: new Set(),
    withheldSharedExpenses: [],
    staleCycleExpenseCount: 0,
    currencyMismatchCount: 0,
  }]));
  let farmTotal = null;
  let costSnapshots = [];
  let feedUsage = [];
  let additiveUsage = [];
  let feedMissingCostCount = 0;
  let additiveMissingCostCount = 0;
  let feedCostSubtotal = null;
  let additiveCostSubtotal = null;
  let financeRetrievalPartial = false;

  if (canViewFinance) {
    const expensesRef = db.collection('companies').doc(companyId).collection('expenses');
    const feedsRef = db.collection('companies').doc(companyId).collection('feeds');
    const additivesRef = db.collection('companies').doc(companyId).collection('additives');
    const [expenseRead, feedRead, additiveRead] = await Promise.all([
      readBoundedCollection(expensesRef),
      readBoundedCollection(feedsRef),
      readBoundedCollection(additivesRef),
    ]);
    expensesTruncated = expenseRead.truncated;
    feedsTruncated = feedRead.truncated;
    additivesTruncated = additiveRead.truncated;
    expensesReadFailed = expenseRead.failed;
    feedsReadFailed = feedRead.failed;
    additivesReadFailed = additiveRead.failed;
    expenseRecordsRead = expenseRead.recordsRead;
    feedItemsRead = feedRead.recordsRead;
    additiveItemsRead = additiveRead.recordsRead;

    const loadInventory = async (dataset, read) => {
      const items = [];
      for (const doc of read.docs) {
        const rawData = doc.data() || {};
        const scoped = scopedData ? await scopedData(dataset, rawData) : rawData;
        if (!scoped) continue;
        const history = Array.isArray(scoped.usageHistory) ? scoped.usageHistory : [];
        if (history.length > MAX_PERIOD_USAGE_ROWS_PER_ITEM) usageHistoryTruncated = true;
        const sortedHistory = history.slice().sort((a, b) => {
          const dateA = normalizeFarmDateKey(a?.date, tz) || '';
          const dateB = normalizeFarmDateKey(b?.date, tz) || '';
          return dateA.localeCompare(dateB) || String(a?.id || '').localeCompare(String(b?.id || ''));
        });
        items.push({
          id: doc.id,
          ...scoped,
          usageHistory: sortedHistory.slice(-MAX_PERIOD_USAGE_ROWS_PER_ITEM),
        });
      }
      return items;
    };
    const [feeds, additives] = await Promise.all([
      loadInventory('feeds', feedRead),
      loadInventory('additives', additiveRead),
    ]);

    const targetPondsById = new Map(targetPonds.map((pond) => [pond.id, pond]));
    const addExpense = (pondId, amount, category, rowCurrency = '', expenseId = null) => {
      const allocation = pondExpenseAllocations.get(pondId);
      if (!allocation) return;
      allocation.amount += amount;
      if (expenseId && !allocation.entryIds.has(expenseId)) {
        allocation.entryIds.add(expenseId);
        allocation.entryCount = allocation.entryIds.size;
      }
      if (amount === 0 && expenseId && !allocation.explicitZeroEntryIds.has(expenseId)) {
        allocation.explicitZeroEntryIds.add(expenseId);
        allocation.explicitZeroCount = allocation.explicitZeroEntryIds.size;
      }
      if (rowCurrency) allocation.currencyCodes.add(rowCurrency);
      else if (expenseId) allocation.uncodedEntryIds.add(expenseId);
      allocation.byCategory[category] = (allocation.byCategory[category] || 0) + amount;
    };
    const withholdExpense = (exp, reason, affectedPonds = targetPonds) => {
      const issue = { reason, cycleId: exp.cycleId || exp.pondCycleId || null, amount: finite(exp.amount) };
      withheldSharedExpenses.push(issue);
      for (const pond of affectedPonds) {
        const allocation = pondExpenseAllocations.get(pond.id);
        if (allocation) allocation.withheldSharedExpenses.push(issue);
      }
    };
    const isStaleForPond = (expense, pond) => {
      const pondCycles = [pond.pondCycleId, pond.cycleId].filter(Boolean);
      return Boolean(
        (expense.pondCycleId && pond.pondCycleId && expense.pondCycleId !== pond.pondCycleId) ||
        (expense.cycleId && pondCycles.length > 0 && !pondCycles.includes(expense.cycleId))
      );
    };

    for (const doc of expenseRead.docs) {
      const rawExpense = doc.data() || {};
      const scopedExpense = scopedData ? await scopedData('expenses', rawExpense) : rawExpense;
      if (!scopedExpense) continue;
      const exp = { id: doc.id, ...scopedExpense };
      if (exp.voided === true || exp.isVoid === true) continue;
      if (isInventoryPurchaseExpense(exp) || !isCycleOperatingExpense(exp)) continue;

      const expDate = normalizeFarmDateKey(exp.date, tz);
      if (!expDate || expDate < startDate || expDate > endDate) continue;

      const amount = finite(exp.amount);
      if (amount === null || amount < 0) continue;
      const category = String(exp.category || 'other').toLowerCase().trim();
      const rowCurrency = String(exp.currency || exp.currencyCode || exp.allocationCurrencyCode || '').trim().toUpperCase();
      const currencyMismatch = Boolean(configuredCurrency && rowCurrency && rowCurrency !== configuredCurrency);
      if (currencyMismatch) {
        const affectedPondIds = exp.pondId ? [exp.pondId]
          : Array.isArray(exp.pondIds) ? exp.pondIds
            : exp.pondCycleId ? allCompanyPonds.filter((pond) => pond.pondCycleId === exp.pondCycleId).map((pond) => pond.id)
              : exp.cycleId ? allCompanyPonds.filter((pond) => pond.cycleId === exp.cycleId || pond.pondCycleId === exp.cycleId).map((pond) => pond.id)
                : targetPonds.map((pond) => pond.id);
        for (const pondId of affectedPondIds.filter(Boolean)) {
          const allocation = pondExpenseAllocations.get(pondId);
          if (allocation) allocation.currencyMismatchCount += 1;
        }
        if (!exp.pondId && !Array.isArray(exp.pondIds) && !exp.cycleId && !exp.pondCycleId) {
          unallocatedCompanyWideExpenseCount += 1;
          unallocatedCompanyWideSubtotalUnavailable = true;
        }
        continue;
      }

      if ((Array.isArray(exp.pondAllocations) && exp.pondAllocations.length) || requiresProductionAllocation(exp)) {
        if (!hasValidExpenseAllocations(exp)) {
          withholdExpense(exp, 'invalid_saved_pond_allocations');
          continue;
        }
        for (const share of exp.pondAllocations) {
          const pond = targetPondsById.get(share.pondId);
          if (!pond) continue;
          if (isStaleForPond(share, pond)) {
            staleCycleExpenseCount += 1;
            pondExpenseAllocations.get(pond.id).staleCycleExpenseCount += 1;
            continue;
          }
          addExpense(pond.id, Number(share.amount), category, rowCurrency, exp.id);
        }
        continue;
      }

      if (exp.pondId) {
        const pond = targetPondsById.get(exp.pondId);
        if (!pond) continue;
        if (isStaleForPond(exp, pond)) {
          staleCycleExpenseCount += 1;
          pondExpenseAllocations.get(pond.id).staleCycleExpenseCount += 1;
          continue;
        }
        addExpense(pond.id, amount, category, rowCurrency, exp.id);
        continue;
      }

      if (Array.isArray(exp.pondIds)) {
        const cohortIds = Array.from(new Set(exp.pondIds.filter((id) => typeof id === 'string' && id)));
        if (cohortIds.length === 0) {
          withholdExpense(exp, 'empty_authoritative_pond_list');
          continue;
        }
        for (const allocation of splitAmountAcrossPondIds(amount, cohortIds)) {
          if (targetPondsById.has(allocation.pondId)) {
            addExpense(allocation.pondId, allocation.amount, category, rowCurrency, exp.id);
          }
        }
        continue;
      }

      if (exp.pondCycleId) {
        const cohort = allCompanyPonds.filter((pond) => pond.pondCycleId === exp.pondCycleId);
        if (pondsTruncated || pondEnumerationFailed || cohort.length === 0) {
          withholdExpense(exp, 'authoritative_pond_cycle_not_established');
          continue;
        }
        const allocations = allocateExpenseAcrossCyclePonds(amount, exp.pondCycleId, cohort);
        if (amount === 0 && allocations.length === 0) {
          for (const pond of cohort) {
            if (targetPondsById.has(pond.id)) addExpense(pond.id, 0, category, rowCurrency, exp.id);
          }
        } else {
          for (const allocation of allocations) {
            if (targetPondsById.has(allocation.pondId)) {
              addExpense(allocation.pondId, allocation.amount, category, rowCurrency, exp.id);
            }
          }
        }
        continue;
      }

      if (exp.cycleId) {
        const cohort = allCompanyPonds.filter((pond) =>
          pond.cycleId === exp.cycleId || pond.pondCycleId === exp.cycleId
        );
        if (pondsTruncated || pondEnumerationFailed || cohort.length === 0) {
          const affected = targetPonds.filter((pond) =>
            pond.cycleId === exp.cycleId || pond.pondCycleId === exp.cycleId
          );
          withholdExpense(exp, 'authoritative_cycle_cohort_not_established', affected.length ? affected : targetPonds);
          continue;
        }
        const allocations = allocateExpenseAcrossCyclePonds(amount, exp.cycleId, cohort);
        if (amount === 0 && allocations.length === 0) {
          for (const pond of cohort) {
            if (targetPondsById.has(pond.id)) addExpense(pond.id, 0, category, rowCurrency, exp.id);
          }
        } else {
          for (const allocation of allocations) {
            if (targetPondsById.has(allocation.pondId)) {
              addExpense(allocation.pondId, allocation.amount, category, rowCurrency, exp.id);
            }
          }
        }
        continue;
      }

      // A company-wide ledger row has no approved per-pond attribution rule.
      unallocatedCompanyWideExpenseCount += 1;
      unallocatedCompanyWideExpenseSubtotal += amount;
      if (rowCurrency) unallocatedCompanyWideCurrencyCodes.add(rowCurrency);
      else unallocatedCompanyWideHasUncodedCurrency = true;
    }

    const normalizedAllocationPonds = allCompanyPonds.map((pond) => ({
      ...pond,
      cycleId: pond.cycleId || pond.pondCycleId || null,
    }));
    const getRelevantUsage = (items, ponds = targetPonds) => items.flatMap((item) =>
      (item.usageHistory || []).filter((usage) => usageMatchesPondsInPeriod(usage, ponds, startDate, endDate, tz))
    );
    feedUsage = getRelevantUsage(feeds);
    additiveUsage = getRelevantUsage(additives);
    feedMissingCostCount = feedUsage.filter((usage) => !hasRecordedUsageCost(usage)).length;
    additiveMissingCostCount = additiveUsage.filter((usage) => !hasRecordedUsageCost(usage)).length;
    financeRetrievalPartial = pondsTruncated || pondEnumerationFailed || expensesTruncated || feedsTruncated || additivesTruncated || usageHistoryTruncated || expensesReadFailed || feedsReadFailed || additivesReadFailed;

    const getRowCurrency = (record) => String(record?.currency || record?.currencyCode || '').trim().toUpperCase();
    const getCurrencyIssueCount = (records) => {
      const explicitCurrencies = new Set(records.map(getRowCurrency).filter(Boolean));
      if (configuredCurrency) {
        return records.filter((record) => {
          const currency = getRowCurrency(record);
          return currency && currency !== configuredCurrency;
        }).length;
      }
      return explicitCurrencies.size > 1 || (explicitCurrencies.size > 0 && records.some((record) => !getRowCurrency(record)))
        ? records.length : 0;
    };
    const currencySafeFeeds = feeds.map((item) => ({
      ...item,
      usageHistory: (item.usageHistory || []).filter((usage) => {
        const currency = getRowCurrency(usage);
        return (!configuredCurrency || !currency || currency === configuredCurrency) && hasRecordedUsageCost(usage);
      }),
    }));
    const currencySafeAdditives = additives.map((item) => ({
      ...item,
      usageHistory: (item.usageHistory || []).filter((usage) => {
        const currency = getRowCurrency(usage);
        return (!configuredCurrency || !currency || currency === configuredCurrency) && hasRecordedUsageCost(usage);
      }),
    }));

    costSnapshots = [];
    let recordedFeedCostSum = 0;
    let recordedAdditiveCostSum = 0;
    let hasAnyFeedCostSubtotal = false;
    let hasAnyAdditiveCostSubtotal = false;
    let allPondFeedCostsComplete = true;
    let allPondAdditiveCostsComplete = true;
    let allPondExpenseRowsComplete = true;
    let totalExpenseCount = 0;
    let totalExplicitZeroExpenseCount = 0;
    let totalRecordedOperatingExpense = 0;
    const totalExpensesByCategory = {};
    const allFeedCurrencyCodes = new Set();
    let allFeedHasUncodedCurrency = false;
    const allExpenseCurrencyCodes = new Set();
    let allExpenseHasUncodedCurrency = false;
    const aggregateExpenseEntryIds = new Set();
    const aggregateExplicitZeroExpenseIds = new Set();

    for (const pond of targetPonds) {
      const pondFeedUsage = getRelevantUsage(feeds, [pond]);
      const pondAdditiveUsage = getRelevantUsage(additives, [pond]);
      const feedCurrencyIssues = getCurrencyIssueCount(pondFeedUsage);
      const additiveCurrencyIssues = getCurrencyIssueCount(pondAdditiveUsage);
      for (const usage of pondFeedUsage) {
        const code = getRowCurrency(usage);
        if (code) allFeedCurrencyCodes.add(code);
        else allFeedHasUncodedCurrency = true;
      }

      const feedsForPond = currencySafeFeeds.map((item) => ({
        ...item,
        usageHistory: (item.usageHistory || []).filter((usage) =>
          usageMatchesPondsInPeriod(usage, [pond], startDate, endDate, tz)
        ),
      }));
      const additivesForPond = currencySafeAdditives.map((item) => ({
        ...item,
        usageHistory: (item.usageHistory || []).filter((usage) =>
          usageMatchesPondsInPeriod(usage, [pond], startDate, endDate, tz)
        ),
      }));

      const normalizedPond = { ...pond, cycleId: pond.cycleId || pond.pondCycleId || null };
      const snapshot = buildPondProfitabilityCostSnapshot({
        pond: normalizedPond,
        ponds: normalizedAllocationPonds,
        feeds: feedsForPond,
        additives: additivesForPond,
        expenses: [],
        startDate,
        endDate,
        timeZone: tz,
      });
      costSnapshots.push(snapshot);

      const feedCostStatus = pondFeedUsage.length === 0 ? 'unavailable'
        : (feedCurrencyIssues > 0 || pondFeedUsage.some((usage) => !hasRecordedUsageCost(usage)) || financeRetrievalPartial)
          ? 'partial' : 'complete';
      const feedSubtotal = !configuredCurrency && feedCurrencyIssues > 0 ? null : snapshot.costsToDate.feed;
      if (feedSubtotal !== null) {
        recordedFeedCostSum += feedSubtotal;
        hasAnyFeedCostSubtotal = true;
      }
      if (feedCostStatus !== 'complete') allPondFeedCostsComplete = false;

      const additiveCostStatus = pondAdditiveUsage.length === 0 ? 'unavailable'
        : (additiveCurrencyIssues > 0 || pondAdditiveUsage.some((usage) => !hasRecordedUsageCost(usage)) || financeRetrievalPartial)
          ? 'partial' : 'complete';
      const additiveSubtotal = !configuredCurrency && additiveCurrencyIssues > 0 ? null : snapshot.costsToDate.additives;
      if (additiveSubtotal !== null) {
        recordedAdditiveCostSum += additiveSubtotal;
        hasAnyAdditiveCostSubtotal = true;
      }
      if (additiveCostStatus !== 'complete') allPondAdditiveCostsComplete = false;

      const allocation = pondExpenseAllocations.get(pond.id);
      for (const code of allocation.currencyCodes) allExpenseCurrencyCodes.add(code);
      if (allocation.uncodedEntryIds.size > 0) allExpenseHasUncodedCurrency = true;
      for (const expenseId of allocation.entryIds) aggregateExpenseEntryIds.add(expenseId);
      for (const expenseId of allocation.explicitZeroEntryIds) aggregateExplicitZeroExpenseIds.add(expenseId);
      const unconfiguredExpenseCurrencyConflict = !configuredCurrency && (
        allocation.currencyCodes.size > 1 ||
        (allocation.currencyCodes.size > 0 && allocation.uncodedEntryIds.size > 0)
      );
      const expenseCurrencyIssueCount = allocation.currencyMismatchCount + Number(unconfiguredExpenseCurrencyConflict);
      const hasUnallocatedCompanyExpense = unallocatedCompanyWideExpenseCount > 0;
      const expenseStatus = (expensesTruncated || expensesReadFailed || expenseCurrencyIssueCount > 0 || allocation.staleCycleExpenseCount > 0)
        ? 'partial'
        : (allocation.withheldSharedExpenses.length > 0 || hasUnallocatedCompanyExpense) ? 'partial' : 'complete';
      const expenseEvidence = (expensesTruncated || expensesReadFailed || hasUnallocatedCompanyExpense || allocation.withheldSharedExpenses.length > 0 || allocation.staleCycleExpenseCount > 0)
        ? 'unavailable'
        : allocation.entryCount > 0 ? 'entries_found' : 'no_entries_found';
      const expenseSubtotal = round(allocation.amount, 2);
      totalRecordedOperatingExpense += allocation.amount;
      if (expenseStatus !== 'complete') allPondExpenseRowsComplete = false;
      for (const [category, amount] of Object.entries(allocation.byCategory)) {
        totalExpensesByCategory[category] = (totalExpensesByCategory[category] || 0) + amount;
      }

      const missingEvidence = [];
      if (pondFeedUsage.length === 0) missingEvidence.push('no_feed_usage_records');
      if (pondFeedUsage.some((usage) => !hasRecordedUsageCost(usage))) {
        missingEvidence.push(`unpriced_feed_usage_records:${pondFeedUsage.filter((usage) => !hasRecordedUsageCost(usage)).length}`);
      }
      if (feedCurrencyIssues > 0 || expenseCurrencyIssueCount > 0) missingEvidence.push('mixed_or_mismatched_currency');
      if (financeRetrievalPartial) missingEvidence.push('one_or_more_finance_sources_incomplete');
      if (allocation.entryCount === 0 && expenseEvidence === 'no_entries_found') missingEvidence.push('no_expense_entries_recorded_actual_spend_unknown');
      if (allocation.withheldSharedExpenses.length > 0 || hasUnallocatedCompanyExpense) missingEvidence.push('shared_or_company_expense_not_attributed');
      if (allocation.staleCycleExpenseCount > 0) missingEvidence.push(`stale_cycle_expenses_excluded:${allocation.staleCycleExpenseCount}`);

      pondFeedSummaries.find((row) => row.pondId === pond.id).finance = {
        financeAllowed: true,
        currency: configuredCurrency,
        currencyStatus: configuredCurrency ? 'configured' : 'unspecified',
        currencyDescription: !configuredCurrency && (unconfiguredExpenseCurrencyConflict || feedCurrencyIssues > 0)
          ? 'Company currency is not configured; conflicting or mixed cost currencies are not combined.'
          : configuredCurrency && (allocation.currencyMismatchCount > 0 || feedCurrencyIssues > 0)
            ? `Some recorded costs do not match the configured ${configuredCurrency} currency and were excluded.`
            : baseCurrencyDescription,
        feedCurrencyCodes: Array.from(new Set(pondFeedUsage.map(getRowCurrency).filter(Boolean))).sort(),
        operatingExpenseCurrencyCodes: Array.from(allocation.currencyCodes).sort(),
        consumedFeedCost: feedCostStatus === 'complete' ? feedSubtotal : null,
        recordedConsumedFeedCost: feedSubtotal,
        partialConsumedFeedCostSubtotal: feedCostStatus === 'partial' ? feedSubtotal : null,
        feedUsageRecordCount: pondFeedUsage.length,
        feedUsageRecordsMissingCost: pondFeedUsage.filter((usage) => !hasRecordedUsageCost(usage)).length,
        consumedFeedCostStatus: feedCostStatus,
        feedCostValuationBasis: 'Recorded feed usage valuation; current catalog price is not substituted.',
        operatingExpenseEntryCount: allocation.entryCount,
        operatingExpenseEvidence: expenseEvidence,
        operatingExpenseReadStatus: expenseStatus,
        recordedOperatingExpenseSubtotal: unconfiguredExpenseCurrencyConflict ? null : expenseSubtotal,
        actualSpendUnknown: allocation.entryCount === 0,
        averageExpensePerDay: allocation.entryCount > 0 && expenseStatus === 'complete'
          ? round(allocation.amount / daysInPeriod, 2) : null,
        expensesByCategory: expenseStatus === 'complete'
          ? Object.fromEntries(Object.entries(allocation.byCategory).map(([key, amount]) => [key, round(amount, 2)]))
          : null,
        partialRecordedExpensesByCategory: expenseStatus === 'partial'
          ? Object.fromEntries(Object.entries(allocation.byCategory).map(([key, amount]) => [key, round(amount, 2)]))
          : null,
        operatingExpenseEntryCountIsPartial: expenseStatus === 'partial',
        sharedExpensesWithheld: allocation.withheldSharedExpenses.length > 0,
        withheldSharedExpenses: allocation.withheldSharedExpenses,
        staleCycleExpenseCount: allocation.staleCycleExpenseCount,
        missingEvidence,
      };
    }

    feedCostSubtotal = hasAnyFeedCostSubtotal ? round(recordedFeedCostSum, 2) : null;
    additiveCostSubtotal = hasAnyAdditiveCostSubtotal ? round(recordedAdditiveCostSum, 2) : null;
    const feedCurrencyConflictAcrossPonds = !configuredCurrency && (
      allFeedCurrencyCodes.size > 1 ||
      (allFeedCurrencyCodes.size > 0 && allFeedHasUncodedCurrency)
    );
    if (feedCurrencyConflictAcrossPonds) {
      feedCostSubtotal = null;
      allPondFeedCostsComplete = false;
    }
    const expenseCurrencyConflictAcrossPonds = !configuredCurrency && (
      allExpenseCurrencyCodes.size > 1 ||
      (allExpenseCurrencyCodes.size > 0 && allExpenseHasUncodedCurrency)
    );
    if (expenseCurrencyConflictAcrossPonds) allPondExpenseRowsComplete = false;
    totalExpenseCount = aggregateExpenseEntryIds.size;
    totalExplicitZeroExpenseCount = aggregateExplicitZeroExpenseIds.size;
    const totalExpenseStatus = financeRetrievalPartial || !allPondExpenseRowsComplete || unallocatedCompanyWideExpenseCount > 0
      ? 'partial' : 'complete';
    const totalFeedCostStatus = allPondFeedCostsComplete ? 'complete'
      : feedUsage.length === 0 ? 'unavailable' : 'partial';
    const totalAdditiveCostStatus = allPondAdditiveCostsComplete ? 'complete'
      : additiveUsage.length === 0 ? 'unavailable' : 'partial';
    const rowExpenseTotal = expenseCurrencyConflictAcrossPonds ? null : round(totalRecordedOperatingExpense, 2);
    const unallocatedExpenseCurrencyConflict = !configuredCurrency && (
      unallocatedCompanyWideCurrencyCodes.size > 1 ||
      (unallocatedCompanyWideCurrencyCodes.size > 0 && unallocatedCompanyWideHasUncodedCurrency)
    );
    const unallocatedExpenseSubtotal = unallocatedExpenseCurrencyConflict || unallocatedCompanyWideSubtotalUnavailable
      ? null : round(unallocatedCompanyWideExpenseSubtotal, 2);
    const canReportFarmTotal = !requestedPondId && !enterpriseScoped && !pondsTruncated && !pondEnumerationFailed &&
      !financeRetrievalPartial && allPondFeedCostsComplete && allPondExpenseRowsComplete &&
      unallocatedCompanyWideExpenseCount === 0 && withheldSharedExpenses.length === 0;
    farmTotal = canReportFarmTotal
      ? {
          available: true,
          currency: configuredCurrency,
          currencyStatus: configuredCurrency ? 'configured' : 'unspecified',
          currencyDescription: baseCurrencyDescription,
          consumedFeedCost: feedCostSubtotal,
          recordedOperatingExpenseSubtotal: rowExpenseTotal,
          operatingExpenseEntryCount: totalExpenseCount,
          actualSpendUnknown: totalExpenseCount === 0,
        }
      : {
          available: false,
          reason: enterpriseScoped ? 'Scope includes assigned ponds only.'
            : unallocatedCompanyWideExpenseCount > 0 ? 'Company-wide expenses have no approved pond attribution rule.'
              : withheldSharedExpenses.length > 0 ? 'One or more shared expense allocations were withheld.'
                : 'At least one pond or finance source has incomplete or unavailable evidence.',
        };

    financeData = {
      financeAllowed: true,
      currency: configuredCurrency,
      currencyStatus: configuredCurrency ? 'configured' : 'unspecified',
      currencyDescription: feedCurrencyConflictAcrossPonds || expenseCurrencyConflictAcrossPonds || unallocatedExpenseCurrencyConflict
        ? 'Company currency is not configured; conflicting or mixed cost currencies are not combined.'
        : unallocatedCompanyWideSubtotalUnavailable && configuredCurrency
          ? `Some unallocated records do not match the configured ${configuredCurrency} currency and were excluded.`
          : baseCurrencyDescription,
      totalExpenses: totalExpenseStatus === 'complete' ? rowExpenseTotal : null,
      recordedOperatingExpenseSubtotal: rowExpenseTotal,
      actualSpendUnknown: totalExpenseCount === 0,
      expenseCount: totalExpenseStatus === 'complete' ? totalExpenseCount : null,
      explicitZeroExpenseCount: totalExplicitZeroExpenseCount,
      expensesByCategory: totalExpenseStatus === 'complete'
        ? Object.fromEntries(Object.entries(totalExpensesByCategory).map(([key, amount]) => [key, round(amount, 2)]))
        : null,
      partialRecordedExpensesByCategory: totalExpenseStatus === 'partial'
        ? Object.fromEntries(Object.entries(totalExpensesByCategory).map(([key, amount]) => [key, round(amount, 2)]))
        : null,
      averageExpensePerDay: totalExpenseCount > 0 && totalExpenseStatus === 'complete'
        ? round(totalRecordedOperatingExpense / daysInPeriod, 2) : null,
      expenseBasis: 'Recorded operating-expense entries; inventory stock-in purchases and voided rows are excluded.',
      consumedFeedCost: totalFeedCostStatus === 'complete' ? feedCostSubtotal : null,
      recordedConsumedFeedCost: feedCostSubtotal,
      partialConsumedFeedCostSubtotal: totalFeedCostStatus === 'partial' ? feedCostSubtotal : null,
      consumedFeedCostCompleteness: totalFeedCostStatus,
      feedUsageRecordCount: feedUsage.length,
      feedUsageRecordsMissingCost: feedMissingCostCount,
      consumedAdditiveCost: totalAdditiveCostStatus === 'complete' ? additiveCostSubtotal : null,
      recordedConsumedAdditiveCost: additiveCostSubtotal,
      consumedAdditiveCostCompleteness: totalAdditiveCostStatus,
      additiveUsageRecords: additiveUsage.length,
      additiveUsageRecordsMissingCost: additiveMissingCostCount,
      unallocatedCompanyWideExpenseCount,
      unallocatedCompanyWideExpenseSubtotal: unallocatedExpenseSubtotal,
      staleCycleExpenseCount,
      sharedExpensesWithheld: withheldSharedExpenses.length > 0,
      withheldSharedExpenses,
      completeness: totalExpenseStatus === 'complete' && totalFeedCostStatus === 'complete' ? 'complete' : 'partial',
      totalsPartial: totalExpenseStatus !== 'complete' || totalFeedCostStatus !== 'complete',
    };
  }

  const retrievalComplete = !pondsTruncated && !pondEnumerationFailed && !expensesTruncated &&
    !feedsTruncated && !additivesTruncated && !usageHistoryTruncated && !expensesReadFailed &&
    !feedsReadFailed && !additivesReadFailed;
  for (const pond of pondFeedSummaries) {
    const warnings = [];
    if (pondsTruncated || pondEnumerationFailed) warnings.push('pond_enumeration_incomplete');
    if (pond.evidence.historicalCyclesCount > 0) warnings.push('historical_cycle_feed_rows_in_period');
    if (pond.evidence.ambiguousAttributionCount > 0) warnings.push('feed_cycle_attribution_ambiguous');
    if (canViewFinance && financeRetrievalPartial) warnings.push('one_or_more_finance_sources_incomplete');
    pond.retrieval = {
      complete: !pondsTruncated && !pondEnumerationFailed && (!canViewFinance || !financeRetrievalPartial),
      recordsRead: {
        feedDaysSelected: pond.recordedDays,
        ...(canViewFinance ? {
          feedUsageRecords: pond.finance?.feedUsageRecordCount ?? 0,
          operatingExpenseEntries: pond.finance?.operatingExpenseEntryCount ?? 0,
        } : {}),
      },
      warnings,
    };
  }
  const hasAnyFinanceEvidence = canViewFinance && pondFeedSummaries.some((row) =>
    row.finance?.feedUsageRecordCount > 0 || row.finance?.operatingExpenseEntryCount > 0
  );
  const status = feedCompleteness === 'complete' && retrievalComplete &&
    (!canViewFinance || financeData?.completeness === 'complete')
    ? 'complete'
    : (totalRecordedPondDays > 0 || hasAnyFinanceEvidence) ? 'partial' : 'unavailable';
  const coverageData = {
    startDate,
    endDate,
    asOfDate: capturedAsOfDate,
    timeZone: tz,
    daysInPeriod,
    expectedPondDays: totalExpectedPondDays,
    recordedPondDays: totalRecordedPondDays,
    daysUnrecorded,
    coveragePercent: feedCoveragePercent,
    completeness: feedCompleteness,
  };
  const evidenceData = {
    recordedDates: Array.from(allRecordedDates).sort(),
    explicitZeroDates: Array.from(allExplicitZeroDates).sort(),
    sourceIds: Array.from(allFeedSourceIds).sort(),
    ambiguousAttributionCount: totalAmbiguousFeedRecords,
  };

  return {
    status,
    scope: {
      companyId,
      pondId: requestedPondId,
      boundary: enterpriseScoped ? 'assigned_ponds' : 'company',
      pondsCount: targetPonds.length,
      pondCount: targetPonds.length,
      enterpriseScoped: Boolean(enterpriseScoped),
    },
    period: {
      startDate,
      endDate,
      asOf: capturedAsOfDate,
      asOfDate: capturedAsOfDate,
      timeZone: tz,
      daysInPeriod,
    },
    feed: {
      totalFeedKg: totalRecordedPondDays > 0 ? round(totalFeedKg, 2) : null,
      daysWithFeedRecorded: totalRecordedPondDays,
      daysWithExplicitZero: totalExplicitZeroDays,
      daysUnrecorded,
      expectedPondDays: totalExpectedPondDays,
      recordedPondDays: totalRecordedPondDays,
      averageDailyFeedKg,
      coveragePercent: feedCoveragePercent,
      completeness: feedCompleteness,
      basis: 'recorded_daily_allocation',
      totalsPartial: feedCompleteness !== 'complete',
      ponds: pondFeedSummaries,
    },
    ponds: pondFeedSummaries,
    coverage: coverageData,
    evidence: evidenceData,
    ...(canViewFinance ? { finance: financeData, farmTotal } : {}),
    retrieval: {
      pondsTruncated,
      pondsReadFailed: pondEnumerationFailed,
      ...(canViewFinance ? {
        expensesTruncated,
        feedsTruncated,
        additivesTruncated,
        usageHistoryTruncated,
        expensesReadFailed,
        feedsReadFailed,
        additivesReadFailed,
      } : {}),
      recordsRead: {
        ponds: pondRead.recordsRead,
        ...(canViewFinance ? {
          expenses: expenseRecordsRead,
          feedItems: feedItemsRead,
          additiveItems: additiveItemsRead,
          feedUsageRecords: feedUsage.length,
          additiveUsageRecords: additiveUsage.length,
        } : {}),
      },
      complete: retrievalComplete,
    },
    writesPerformed: 0,
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
    if (!isPondInCycle) {
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
    if (!isPondInCycle) {
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
    const cycleSnapshot = cyclePondEntry || (cycleDoc?.pondId === pondData.id ? cycleDoc : null);
    const cycleStart = isHistorical
      ? cycleSnapshot?.cycleStartedAt || cycleSnapshot?.startDate || cycleSnapshot?.docStart
      : pondData.cycleStartedAt || pondData.docStart;
    const initialPop = isHistorical
      ? cycleSnapshot?.initialPopulation ?? cycleSnapshot?.initialStock ?? null
      : pondData.initialPopulation || pondData.initialStock;
    const initialWt = isHistorical
      ? cycleSnapshot?.initialWeight ?? null
      : pondData.initialWeight;
    const feedCost = isHistorical ? cycleSnapshot?.feedCost ?? null : pondData.feedCost ?? null;
    const harvestRecords = isHistorical
      ? cycleSnapshot?.harvestRecords ?? (Array.isArray(pondData.harvestRecords)
        ? pondData.harvestRecords.filter((record) => record?.pondCycleId === cycleDoc.id || record?.cycleId === cycleDoc.id)
        : [])
      : pondData.harvestRecords;

    if (isHistorical && (!cycleStart || finite(initialPop) === null || finite(initialPop) <= 0)) return null;
    if (alignDoc !== null && !cycleStart) return null;

    let filteredSamplings = samplings;
    let filteredMortality = mortalityRecords;
    let filteredHarvests = Array.isArray(harvestRecords) ? harvestRecords : [];
    let cutoffDate = null;

    if (alignDoc !== null && cycleStart) {
      const cycleStartKey = normalizeFarmDateKey(cycleStart, tz);
      if (!cycleStartKey) return null;
      cutoffDate = shiftDate(cycleStartKey, alignDoc - 1);
      filteredSamplings = samplings.filter((s) => {
        const d = normalizeFarmDateKey(s.date, tz);
        return Boolean(d && d >= cycleStartKey && d <= cutoffDate);
      });
      filteredMortality = mortalityRecords.filter((m) => {
        const d = normalizeFarmDateKey(m.date, tz);
        return Boolean(d && d >= cycleStartKey && d <= cutoffDate);
      });
      filteredHarvests = filteredHarvests.filter((h) => {
        const d = normalizeFarmDateKey(h.date, tz);
        return Boolean(d && d >= cycleStartKey && d <= cutoffDate);
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
      cycleId: cycleDoc?.id || pondData.cycleId,
      pondCycleId: cycleDoc?.id || pondData.pondCycleId,
      cycleStartedAt: cycleStart,
      docStart: cycleStart,
      cycleEndedAt: isHistorical ? cycleSnapshot?.cycleEndedAt ?? null : pondData.cycleEndedAt,
      cycleStatus: isHistorical ? cycleSnapshot?.cycleStatus ?? cycleDoc.status ?? 'ended' : pondData.cycleStatus,
      initialPopulation: initialPop,
      initialStock: initialPop,
      initialWeight: initialWt,
      baselinePopulation: isHistorical ? cycleSnapshot?.baselinePopulation ?? null : pondData.baselinePopulation,
      baselineDate: isHistorical ? cycleSnapshot?.baselineDate ?? null : pondData.baselineDate,
      baselineDoc: isHistorical ? cycleSnapshot?.baselineDoc ?? null : pondData.baselineDoc,
      baselineMbw: isHistorical ? cycleSnapshot?.baselineMbw ?? null : pondData.baselineMbw,
      postHarvestBaselineDate: isHistorical ? cycleSnapshot?.postHarvestBaselineDate ?? null : pondData.postHarvestBaselineDate,
      postHarvestRemainingPopulation: isHistorical ? cycleSnapshot?.postHarvestRemainingPopulation ?? null : pondData.postHarvestRemainingPopulation,
      postHarvestRemainingBiomass: isHistorical ? cycleSnapshot?.postHarvestRemainingBiomass ?? null : pondData.postHarvestRemainingBiomass,
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

  if (!primaryResult || !secondaryResult) {
    return {
      status: 'insufficient_data',
      reason: 'A cycle-specific population baseline or valid cycle start date is missing; the comparison was withheld.',
    };
  }

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
    const primaryFeedCost = finite(primaryResult.feedCost);
    const secondaryFeedCost = finite(secondaryResult.feedCost);
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
  const { db, company, companyId, allowed, enterpriseScoped, scopedData, timeZone } = context;
  if (!allowed || (!allowed('viewFarm') && !allowed('manageFeedInventory'))) {
    throw new Error('Not permitted');
  }

  const itemId = args.itemId ? args.itemId.trim() : null;
  const itemType = args.itemType || 'all';
  if (!['feed', 'additive', 'all'].includes(itemType)) throw new Error('Invalid item type');
  const requiredQuantity = args.requiredQuantity !== undefined ? finite(args.requiredQuantity) : null;
  const requiredUnit = args.unit ? String(args.unit).trim() : null;
  if (args.plannedDays !== undefined && (!Number.isInteger(args.plannedDays) || args.plannedDays < 1 || args.plannedDays > 90)) {
    throw new Error('Invalid planning horizon');
  }
  const plannedDays = Number.isInteger(args.plannedDays) && args.plannedDays > 0 ? args.plannedDays : 7;
  if (args.lookbackDays !== undefined && (!Number.isInteger(args.lookbackDays) || args.lookbackDays < 3 || args.lookbackDays > 60)) {
    throw new Error('Invalid lookback days');
  }
  const lookbackDays = Number.isInteger(args.lookbackDays) && args.lookbackDays > 0 ? args.lookbackDays : 14;

  if (itemId && !validId(itemId)) throw new Error('Invalid item ID');

  const baseRef = db.collection('companies').doc(companyId);
  const itemsToEvaluate = [];
  let inventoryTruncated = false;
  const boundUsageHistory = (item) => {
    if (!Array.isArray(item?.usageHistory) || item.usageHistory.length <= 1000) return item;
    inventoryTruncated = true;
    const todayKey = farmToday(timeZone || company?.timeZone || 'UTC');
    const recent = item.usageHistory
      .map((row, index) => ({ row, index, date: normalizeFarmDateKey(row?.date, timeZone || company?.timeZone || 'UTC') }))
      .filter((entry) => entry.date && entry.date <= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index)
      .slice(-1000)
      .map((entry) => entry.row);
    return { ...item, usageHistory: recent };
  };

  const readCollection = async (collName, defaultType) => {
    const snap = await baseRef.collection(collName).limit(201).get();
    inventoryTruncated ||= (snap.docs || []).length > 200;
    return (snap.docs || []).slice(0, 200).map((doc) => ({
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
    itemsToEvaluate.push(boundUsageHistory(itemData));
  } else {
    if (itemType === 'feed' || itemType === 'all') {
      const feeds = await readCollection('feeds', 'feed');
      for (let f of feeds) {
        if (scopedData) {
          f = await scopedData('feeds', f);
          if (!f) continue;
        }
        itemsToEvaluate.push(boundUsageHistory(f));
      }
    }
    if (itemType === 'additive' || itemType === 'all') {
      const additives = await readCollection('additives', 'additive');
      for (let a of additives) {
        if (scopedData) {
          a = await scopedData('additives', a);
          if (!a) continue;
        }
        itemsToEvaluate.push(boundUsageHistory(a));
      }
    }
  }

  const evaluations = itemsToEvaluate.map((item) => {
    const evaluation = evaluateReplenishmentScenario({
      item,
      requiredQuantity,
      requiredUnit,
      plannedDays,
      lookbackDays,
      todayKey: farmToday(timeZone || company?.timeZone || 'UTC'),
      timeZone: timeZone || company?.timeZone || 'UTC',
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
      usageLookbackDays: lookbackDays,
    },
    items: evaluations,
    retrieval: { complete: !inventoryTruncated, itemCatalogTruncated: inventoryTruncated },
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

  const currentCycleIds = [pondData.pondCycleId, pondData.cycleId].filter((value) => typeof value === 'string' && value);
  if (cycleId && cycleId !== 'current' && !currentCycleIds.includes(cycleId)) {
    return {
      status: 'insufficient_data',
      reason: 'Harvest scenarios require the active cycle snapshot; historical scenario inputs are not stored as a complete pond snapshot.',
      missingEvidence: ['historical_cycle_snapshot_unavailable'],
    };
  }

  const activeCycleId = currentCycleIds[0] || 'active';
  const cycleScope = {
    pondCycleId: pondData.pondCycleId || activeCycleId,
    cycleId: pondData.cycleId || activeCycleId,
  };
  const scopedPond = {
    ...pondData,
    samplings: (pondData.samplings || []).filter((s) =>
      belongsToCurrentCycle(s, cycleScope),
    ),
    mortalityRecords: (pondData.mortalityRecords || []).filter((m) =>
      belongsToCurrentCycle(m, cycleScope),
    ),
  };

  const timeZone = ctxTimeZone || company?.timeZone || 'UTC';
  const now = new Date();
  const canViewFinance = Boolean(allowed('viewFinance'));

  // Load full pond cohort across company for equitable shared cycle expense allocation
  const pondsSnap = await baseRef.collection('ponds').limit(101).get();
  const pondsTruncated = (pondsSnap.docs || []).length > 100;
  const cohortPonds = [];
  for (const doc of (pondsSnap.docs || []).slice(0, 100)) {
    let p = { id: doc.id, ...doc.data() };
    if (scopedData) {
      p = await scopedData('ponds', p);
      if (!p) continue;
    }
    cohortPonds.push(p);
  }
  const allCycleCohortPonds = cohortPonds.filter((p) => p.id !== scopedPond.id).concat([scopedPond]);

  // Fetch feeds and additives for biological and nutritional projections
  const feedsSnap = await baseRef.collection('feeds').limit(201).get();
  const feedsTruncated = (feedsSnap.docs || []).length > 200;
  const feeds = [];
  let usageHistoryTruncated = false;
  for (const doc of (feedsSnap.docs || []).slice(0, 200)) {
    let f = { id: doc.id, ...doc.data() };
    if (scopedData) {
      f = await scopedData('feeds', f);
      if (!f) continue;
    }
    if (Array.isArray(f.usageHistory) && f.usageHistory.length > 1000) {
      usageHistoryTruncated = true;
      f = { ...f, usageHistory: f.usageHistory.slice(-1000) };
    }
    if (!canViewFinance) {
      const { costPerUnit, averageCost, price, ...safeFeed } = f;
      f = {
        ...safeFeed,
        usageHistory: (safeFeed.usageHistory || []).map(({ totalCost, unitPrice, ...usage }) => usage),
      };
    }
    feeds.push(f);
  }

  const additivesSnap = await baseRef.collection('additives').limit(201).get();
  const additivesTruncated = (additivesSnap.docs || []).length > 200;
  const additives = [];
  for (const doc of (additivesSnap.docs || []).slice(0, 200)) {
    let a = { id: doc.id, ...doc.data() };
    if (scopedData) {
      a = await scopedData('additives', a);
      if (!a) continue;
    }
    if (Array.isArray(a.usageHistory) && a.usageHistory.length > 1000) {
      usageHistoryTruncated = true;
      a = { ...a, usageHistory: a.usageHistory.slice(-1000) };
    }
    if (!canViewFinance) {
      const { costPerUnit, averageCost, price, ...safeAdditive } = a;
      a = {
        ...safeAdditive,
        usageHistory: (safeAdditive.usageHistory || []).map(({ totalCost, unitPrice, ...usage }) => usage),
      };
    }
    additives.push(a);
  }

  // Strict finance gating: expenses only queried if user has viewFinance
  const expenses = [];
  let expensesTruncated = false;
  let expenseReadFailed = false;
  if (canViewFinance) {
    try {
      const expSnap = await baseRef.collection('expenses').limit(501).get();
      expensesTruncated = (expSnap.docs || []).length > 500;
      for (const doc of (expSnap.docs || []).slice(0, 500)) {
        const exp = { id: doc.id, ...doc.data() };
        if (exp.voided === true || exp.isVoid === true) continue;
        expenses.push(exp);
      }
    } catch (_) {
      expenseReadFailed = true;
    }
  }

  const financeRetrievalComplete = !pondsTruncated && !feedsTruncated && !additivesTruncated &&
    !usageHistoryTruncated && !expensesTruncated && !expenseReadFailed;

  // Resolve price ladder
  let resolvedPriceLadder = customPriceLadder || [];
  if (!resolvedPriceLadder.length && canViewFinance && company?.harvestMarketPrices && typeof company.harvestMarketPrices === 'object') {
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
      // The supported expense ledger below includes other operating expenses;
      // this separate bucket would double count them.
      projectedDailyOtherCost: 0,
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

  const canExposeFinance = canViewFinance && financeRetrievalComplete;
  if (canViewFinance && !financeRetrievalComplete) {
    decision = 'review_data';
    decisionReason = 'Financial source reads were incomplete, so the financial comparison is withheld.';
    bestScenario = harvestEval.result.today;
  }

  // Map today scenario
  const todayScenario = {
    ...harvestEval.result.today,
    currentBiomass: harvestEval.result.today.projectedBiomassKg,
    currentBiomassKg: harvestEval.result.today.projectedBiomassKg,
  };
  if (!canExposeFinance) {
    delete todayScenario.pricePerKg;
    delete todayScenario.revenue;
    delete todayScenario.futureCosts;
    delete todayScenario.totalCosts;
    delete todayScenario.operatingProfit;
    delete todayScenario.incrementalProfitVsToday;
  }

  // Map targets
  const targets = harvestEval.result.targets.map((t) => {
    const mapped = {
      ...t,
      projectedMbwG: t.targetMbwG,
      projectedBiomass: t.projectedBiomassKg,
      projectedBiomassKg: t.projectedBiomassKg,
    };
    if (!canExposeFinance) {
      delete mapped.pricePerKg;
      delete mapped.revenue;
      delete mapped.futureCosts;
      delete mapped.totalCosts;
      delete mapped.operatingProfit;
      delete mapped.incrementalProfitVsToday;
    }
    return mapped;
  });

  // Map best scenario
  const finalBestScenario = {
    ...bestScenario,
    projectedBiomass: bestScenario.projectedBiomassKg,
    projectedBiomassKg: bestScenario.projectedBiomassKg,
  };
  if (!canExposeFinance) {
    delete finalBestScenario.pricePerKg;
    delete finalBestScenario.revenue;
    delete finalBestScenario.futureCosts;
    delete finalBestScenario.totalCosts;
    delete finalBestScenario.operatingProfit;
    delete finalBestScenario.incrementalProfitVsToday;
  }

  const sanitizedAssumptions = { ...harvestEval.assumptions };
  if (!canExposeFinance) {
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
    marginBasis: canExposeFinance
      ? harvestEval.marginBasis
      : canViewFinance ? 'finance_unavailable' : 'none_finance_withheld',
    today: todayScenario,
    targets,
    bestScenario: finalBestScenario,
    finance: canExposeFinance
      ? {
          financeAllowed: true,
          incurredCostsToDate: harvestEval.costSnapshot.costsToDate,
          feedUnitCostPerKg: harvestEval.costSnapshot.feedUnitCostPerKg,
          marginBasis: 'operating_profit_after_recorded_incurred_and_supported_projected_costs',
        }
      : canViewFinance
        ? {
            financeAllowed: true,
            status: 'incomplete',
            reason: 'Financial source reads were incomplete. Financial amounts and margins are withheld.',
          }
      : {
          financeAllowed: false,
          reason: 'User lacks viewFinance permission. Pricing, revenues, and operating profit withheld.',
          marginBasis: 'none_finance_withheld',
        },
    warnings: Array.from(new Set([
      ...harvestEval.costSnapshot.warnings,
      ...harvestEval.result.warnings,
      ...(canViewFinance && !financeRetrievalComplete ? ['Financial source reads were incomplete; no full financial result is available.'] : []),
    ])),
    retrieval: {
      complete: financeRetrievalComplete,
      pondCohortTruncated: pondsTruncated,
      feedsTruncated,
      additivesTruncated,
      usageHistoryTruncated,
      expensesTruncated: canViewFinance ? expensesTruncated : null,
      expenseReadFailed: canViewFinance ? expenseReadFailed : null,
    },
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
