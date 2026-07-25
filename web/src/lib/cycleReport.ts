import {
  calculatePondMetricsWithHarvest,
  isBaselineSampling,
  toFiniteNumber,
  type SharedPond,
  type SharedSampling,
} from '../../../shared/pondCalculations';

export interface CycleReportCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  plannedStartDate?: string;
  stockingStartDate?: string;
  stockingEndDate?: string;
  closedAt?: string;
}

export interface CycleReportPondSource extends SharedPond {
  id: string;
  pondName: string;
  pondArea?: number;
  area?: number;
  density?: number;
  supplier?: string;
  plSupplier?: string;
  cycleId?: string;
  cycleStatus?: 'active' | 'ended';
  cycleStartedAt?: string;
  cycleEndedAt?: string;
  cycleEndReason?: 'harvested' | 'disease' | 'reset' | 'other';
  samplings?: SharedSampling[] | null;
}

export interface CycleReportHarvestRecord {
  id: string;
  date: string;
  cycleId?: string;
  ponds: Array<{
    pondId: string;
    cycleId?: string;
    pondCycleId?: string;
    harvestType?: 'partial' | 'final';
    biomass?: number | string;
    size?: number | string;
    price?: number | string;
    subBiomass?: number | string;
    subSize?: number | string;
    subPrice?: number | string;
  }>;
}

interface UsageHistory {
  pondId?: string;
  cycleId?: string;
  quantity?: number | string;
  totalCost?: number | string;
  unitPrice?: number | string;
}

export interface CycleReportInventoryItem {
  usageHistory?: UsageHistory[];
}

export interface CycleReportExpense {
  amount?: number | string;
  category?: string;
  reference?: string;
  cycleId?: string;
}

export interface CycleReportAsset {
  maintenanceHistory?: Array<{
    cycleId?: string;
    cost?: number | string;
  }>;
}

export interface WebCycleReport {
  cycle: CycleReportCycle;
  ponds: Array<{
    id: string;
    pondName: string;
    supplier: string;
    status: 'active' | 'ended';
    stockingDate?: string;
    endedAt?: string;
    doc: number;
    area: number;
    initialPopulation: number;
    latestMbw: number;
    totalFeedUsed: number;
    harvestedBiomass: number;
    harvestedPopulation: number;
    finalHarvestMbw: number;
    actualSurvivalRate: number;
    actualFcr: number;
    hasFinalHarvest: boolean;
    closureReason?: CycleReportPondSource['cycleEndReason'];
  }>;
  totals: {
    pondCount: number;
    totalArea: number;
    harvestedBiomass: number;
    harvestRevenue: number;
    costs: {
      feed: number;
      additives: number;
      maintenance: number;
      manualExpenses: number;
      total: number;
    };
    grossProfit: number;
    costPerKg: number;
    revenuePerKg: number;
    profitPerKg: number;
  };
}

const getDateTime = (value?: string): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const daysBetween = (start?: string, end?: string): number => {
  const startTime = getDateTime(start);
  const endTime = getDateTime(end) ?? Date.now();
  if (startTime === null) return 0;
  return Math.max(0, Math.floor((endTime - startTime) / (24 * 60 * 60 * 1000)));
};

const usageCost = (usage: UsageHistory): number => {
  const savedCost = toFiniteNumber(usage.totalCost);
  return savedCost > 0
    ? savedCost
    : toFiniteNumber(usage.quantity) * toFiniteNumber(usage.unitPrice);
};

const getLatestMbw = (pond: CycleReportPondSource): number => {
  const latest = [...(pond.samplings || [])]
    .filter((sampling) => !isBaselineSampling(sampling) && toFiniteNumber(sampling.mbw || sampling.abw) > 0)
    .sort((first, second) => (getDateTime(second.date) ?? 0) - (getDateTime(first.date) ?? 0))[0];
  return toFiniteNumber(latest?.mbw || latest?.abw || pond.baselineMbw || pond.initialWeight || 0);
};

const calculatePondHarvest = (
  records: CycleReportHarvestRecord[],
  pondId: string,
) => {
  let biomass = 0;
  let population = 0;
  let finalBiomass = 0;
  let finalPopulation = 0;

  records.forEach((record) => {
    record.ponds.filter((pond) => pond.pondId === pondId).forEach((pond) => {
      const mainBiomass = toFiniteNumber(pond.biomass);
      const subBiomass = toFiniteNumber(pond.subBiomass);
      const mainPopulation = mainBiomass * toFiniteNumber(pond.size);
      const subPopulation = subBiomass * toFiniteNumber(pond.subSize);
      biomass += mainBiomass + subBiomass;
      population += mainPopulation + subPopulation;
      if (pond.harvestType === 'final') {
        finalBiomass += mainBiomass + subBiomass;
        finalPopulation += mainPopulation + subPopulation;
      }
    });
  });

  return {
    biomass,
    population,
    hasFinalHarvest: finalBiomass > 0,
    finalHarvestMbw: finalPopulation > 0 ? (finalBiomass * 1000) / finalPopulation : 0,
  };
};

export function buildWebCycleReport({
  cycle,
  ponds,
  harvestRecords,
  feeds,
  additives,
  expenses,
  assets,
  timeZone,
}: {
  cycle: CycleReportCycle;
  ponds: CycleReportPondSource[];
  harvestRecords: CycleReportHarvestRecord[];
  feeds: CycleReportInventoryItem[];
  additives: CycleReportInventoryItem[];
  expenses: CycleReportExpense[];
  assets: CycleReportAsset[];
  timeZone?: string;
}): WebCycleReport {
  const cyclePonds = ponds.filter((pond) => pond.cycleId === cycle.id);
  const cyclePondIds = new Set(cyclePonds.map((pond) => pond.id));
  const matchedHarvestRecords = harvestRecords.filter((record) => (
    record.cycleId === cycle.id
    || record.ponds.some((pond) => pond.cycleId === cycle.id || cyclePondIds.has(pond.pondId))
  ));
  const matchesUsage = (usage: UsageHistory) => (
    usage.cycleId === cycle.id
    || Boolean(usage.pondId && cyclePondIds.has(usage.pondId))
  );

  const feedCost = feeds.flatMap((item) => item.usageHistory || [])
    .filter(matchesUsage)
    .reduce((sum, usage) => sum + usageCost(usage), 0);
  const additiveCost = additives.flatMap((item) => item.usageHistory || [])
    .filter(matchesUsage)
    .reduce((sum, usage) => sum + usageCost(usage), 0);
  const maintenanceCost = assets.reduce((sum, asset) => (
    sum + (asset.maintenanceHistory || [])
      .filter((maintenance) => maintenance.cycleId === cycle.id)
      .reduce((maintenanceSum, maintenance) => maintenanceSum + toFiniteNumber(maintenance.cost), 0)
  ), 0);
  const manualExpenses = expenses
    .filter((expense) => (
      expense.cycleId === cycle.id
      && !expense.reference?.startsWith('INVENTORY-')
      && expense.category !== 'Maintenance'
    ))
    .reduce((sum, expense) => sum + toFiniteNumber(expense.amount), 0);

  let harvestRevenue = 0;
  matchedHarvestRecords.forEach((record) => {
    record.ponds
      .filter((pond) => pond.cycleId === cycle.id || cyclePondIds.has(pond.pondId))
      .forEach((pond) => {
      harvestRevenue += (toFiniteNumber(pond.biomass) * toFiniteNumber(pond.price))
        + (toFiniteNumber(pond.subBiomass) * toFiniteNumber(pond.subPrice));
      });
  });

  const reportPonds = cyclePonds.map((pond) => {
    const metrics = calculatePondMetricsWithHarvest(pond, timeZone);
    const harvest = calculatePondHarvest(matchedHarvestRecords, pond.id);
    const harvestedBiomass = harvest.biomass || toFiniteNumber(pond.totalHarvestedBiomass);
    const harvestedPopulation = harvest.population || toFiniteNumber(pond.totalHarvestedPopulation);
    const initialPopulation = toFiniteNumber(pond.initialPopulation || pond.initialStock);
    const initialBiomass = (initialPopulation * toFiniteNumber(pond.initialWeight || 0.5)) / 1000;
    const biomassGain = harvestedBiomass - initialBiomass;

    return {
      id: pond.id,
      pondName: pond.pondName,
      supplier: pond.plSupplier || pond.supplier || 'N/A',
      status: pond.cycleStatus === 'ended' ? 'ended' as const : 'active' as const,
      stockingDate: pond.cycleStartedAt || pond.docStart || undefined,
      endedAt: pond.cycleEndedAt,
      doc: daysBetween(pond.cycleStartedAt || pond.docStart || undefined, pond.cycleEndedAt || cycle.closedAt),
      area: toFiniteNumber(pond.pondArea || pond.area),
      initialPopulation,
      latestMbw: getLatestMbw(pond),
      totalFeedUsed: metrics.totalFeedConsumed,
      harvestedBiomass,
      harvestedPopulation,
      finalHarvestMbw: harvest.finalHarvestMbw,
      actualSurvivalRate: initialPopulation > 0 ? (harvestedPopulation / initialPopulation) * 100 : 0,
      actualFcr: biomassGain > 0 ? metrics.totalFeedConsumed / biomassGain : 0,
      hasFinalHarvest: harvest.hasFinalHarvest,
      closureReason: pond.cycleEndReason,
    };
  });

  const harvestedBiomass = reportPonds.reduce((sum, pond) => sum + pond.harvestedBiomass, 0);
  const costs = {
    feed: feedCost,
    additives: additiveCost,
    maintenance: maintenanceCost,
    manualExpenses,
    total: feedCost + additiveCost + maintenanceCost + manualExpenses,
  };
  const grossProfit = harvestRevenue - costs.total;

  return {
    cycle,
    ponds: reportPonds,
    totals: {
      pondCount: reportPonds.length,
      totalArea: reportPonds.reduce((sum, pond) => sum + pond.area, 0),
      harvestedBiomass,
      harvestRevenue,
      costs,
      grossProfit,
      costPerKg: harvestedBiomass > 0 ? costs.total / harvestedBiomass : 0,
      revenuePerKg: harvestedBiomass > 0 ? harvestRevenue / harvestedBiomass : 0,
      profitPerKg: harvestedBiomass > 0 ? grossProfit / harvestedBiomass : 0,
    },
  };
}
