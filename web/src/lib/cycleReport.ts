import {
  calculatePondMetricsWithHarvest,
  isBaselineSampling,
  toFiniteNumber,
  type SharedPond,
  type SharedSampling,
} from '../../../shared/pondCalculations';
import { getPreviousEnterpriseCycleForSameBlocks } from '../../../shared/enterpriseCycles';

export interface CycleReportCycle {
  id: string;
  cycleName: string;
  status: 'planning' | 'stocking' | 'active' | 'closing' | 'closed';
  blockIds?: string[] | null;
  blockId?: string | null;
  plannedStartDate?: string;
  stockingStartDate?: string;
  stockingEndDate?: string;
  closedAt?: string;
}

export interface CycleReportPondSource extends SharedPond {
  id: string;
  pondName: string;
  blockId?: string;
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
  samplings?: (SharedSampling & {
    phMorning?: string | number | null;
    phEvening?: string | number | null;
    doMorning?: string | number | null;
    doEvening?: string | number | null;
    transparency?: string | number | null;
    salinity?: string | number | null;
    temperature?: string | number | null;
    ammonia?: string | number | null;
    operationalNotes?: string | null;
    weatherEvent?: string | null;
    waterExchangePercent?: string | number | null;
    sludgeLoad?: string | null;
    surfaceScum?: boolean | null;
    shrimpBehaviour?: string | null;
  })[] | null;
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
  harvestRecords: CycleReportHarvestRecord[];
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
    initialWeight: number;
    latestMbw: number;
    previousMbw: number;
    mbwTrend: number[];
    totalFeedUsed: number;
    harvestedBiomass: number;
    harvestedPopulation: number;
    finalHarvestMbw: number;
    averageHarvestMbw: number;
    productivityKgPerHa: number;
    actualSurvivalRate: number;
    actualFcr: number;
    hasFinalHarvest: boolean;
    closureReason?: CycleReportPondSource['cycleEndReason'];
    isNonHarvestClosure: boolean;
  }>;
  notes: {
    severity: 'info' | 'warning';
    key: 'noPonds' | 'noHarvestRecords' | 'missingFeedCost' | 'missingAdditiveCost' | 'noMbwSampling' | 'cycleNotClosed';
    pondName?: string;
    message: string;
  }[];
  comparison?: {
    cycleName: string;
    yieldTonPerHa: number;
    overallActualSurvivalRate: number;
    actualFcr: number;
    averageHarvestMbw: number;
    grossMargin: number;
  };
  totals: {
    pondCount: number;
    totalArea: number;
    initialPopulation: number;
    harvestedPopulation: number;
    harvestedBiomass: number;
    harvestRevenue: number;
    averageHarvestMbw: number;
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
    yieldTonPerHa: number;
    overallActualSurvivalRate: number;
    actualFcr: number;
    sampledPondCount: number;
    samplingCoverage: number;
    waterQualityPondCount: number;
    waterQualityRecordCount: number;
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

const getMbwMovement = (pond: CycleReportPondSource): { previousMbw: number; mbwTrend: number[] } => {
  const trend = [...(pond.samplings || [])]
    .filter((sampling) => !isBaselineSampling(sampling) && toFiniteNumber(sampling.mbw || sampling.abw) > 0)
    .sort((first, second) => (getDateTime(first.date) ?? 0) - (getDateTime(second.date) ?? 0))
    .slice(-5)
    .map((sampling) => toFiniteNumber(sampling.mbw || sampling.abw));
  return {
    previousMbw: trend.length > 1 ? trend[trend.length - 2] : 0,
    mbwTrend: trend,
  };
};

const hasWaterQualityData = (sampling: NonNullable<CycleReportPondSource['samplings']>[number]): boolean => [
  sampling.phMorning,
  sampling.phEvening,
  sampling.doMorning,
  sampling.doEvening,
  sampling.transparency,
  sampling.salinity,
  sampling.temperature,
  sampling.ammonia,
  sampling.operationalNotes,
  sampling.weatherEvent,
  sampling.waterExchangePercent,
  sampling.sludgeLoad,
  sampling.surfaceScum,
  sampling.shrimpBehaviour,
].some((value) => value !== null && value !== undefined && String(value).trim() !== '');

const calculatePondHarvest = (
  records: CycleReportHarvestRecord[],
  pondId: string,
) => {
  let biomass = 0;
  let population = 0;
  let finalBiomass = 0;
  let finalPopulation = 0;
  let weightedHarvestMbw = 0;
  let weightedHarvestBiomass = 0;

  records.forEach((record) => {
    record.ponds.filter((pond) => pond.pondId === pondId).forEach((pond) => {
      const mainBiomass = toFiniteNumber(pond.biomass);
      const subBiomass = toFiniteNumber(pond.subBiomass);
      const mainPopulation = mainBiomass * toFiniteNumber(pond.size);
      const subPopulation = subBiomass * toFiniteNumber(pond.subSize);
      biomass += mainBiomass + subBiomass;
      population += mainPopulation + subPopulation;
      if (mainBiomass > 0 && toFiniteNumber(pond.size) > 0) {
        weightedHarvestMbw += mainBiomass * (1000 / toFiniteNumber(pond.size));
        weightedHarvestBiomass += mainBiomass;
      }
      if (subBiomass > 0 && toFiniteNumber(pond.subSize) > 0) {
        weightedHarvestMbw += subBiomass * (1000 / toFiniteNumber(pond.subSize));
        weightedHarvestBiomass += subBiomass;
      }
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
    averageHarvestMbw: weightedHarvestBiomass > 0 ? weightedHarvestMbw / weightedHarvestBiomass : 0,
  };
};

export function buildWebCycleReport({
  cycle,
  cycles = [],
  ponds,
  harvestRecords,
  feeds,
  additives,
  expenses,
  assets,
  timeZone,
  includeComparison = true,
}: {
  cycle: CycleReportCycle;
  cycles?: CycleReportCycle[];
  ponds: CycleReportPondSource[];
  harvestRecords: CycleReportHarvestRecord[];
  feeds: CycleReportInventoryItem[];
  additives: CycleReportInventoryItem[];
  expenses: CycleReportExpense[];
  assets: CycleReportAsset[];
  timeZone?: string;
  includeComparison?: boolean;
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
    const initialWeight = toFiniteNumber(pond.initialWeight || 0.5);
    const initialBiomass = (initialPopulation * initialWeight) / 1000;
    const biomassGain = harvestedBiomass - initialBiomass;
    const mbwMovement = getMbwMovement(pond);

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
      initialWeight,
      latestMbw: getLatestMbw(pond),
      previousMbw: mbwMovement.previousMbw,
      mbwTrend: mbwMovement.mbwTrend,
      totalFeedUsed: metrics.totalFeedConsumed,
      harvestedBiomass,
      harvestedPopulation,
      finalHarvestMbw: harvest.finalHarvestMbw,
      averageHarvestMbw: harvest.averageHarvestMbw,
      productivityKgPerHa: toFiniteNumber(pond.pondArea || pond.area) > 0
        ? harvestedBiomass / (toFiniteNumber(pond.pondArea || pond.area) / 10_000)
        : 0,
      actualSurvivalRate: initialPopulation > 0 ? (harvestedPopulation / initialPopulation) * 100 : 0,
      actualFcr: biomassGain > 0 ? metrics.totalFeedConsumed / biomassGain : 0,
      hasFinalHarvest: harvest.hasFinalHarvest,
      closureReason: pond.cycleEndReason,
      isNonHarvestClosure: ['disease', 'reset', 'other'].includes(pond.cycleEndReason || ''),
    };
  });

  const harvestedBiomass = reportPonds.reduce((sum, pond) => sum + pond.harvestedBiomass, 0);
  const harvestedPopulation = reportPonds.reduce((sum, pond) => sum + pond.harvestedPopulation, 0);
  const initialPopulation = reportPonds.reduce((sum, pond) => sum + pond.initialPopulation, 0);
  const totalArea = reportPonds.reduce((sum, pond) => sum + pond.area, 0);
  const fcrPonds = reportPonds.filter((pond) => pond.hasFinalHarvest && pond.actualFcr > 0);
  const fcrBiomassGain = fcrPonds.reduce((sum, pond) => (
    sum + pond.harvestedBiomass - ((pond.initialPopulation * pond.initialWeight) / 1000)
  ), 0);
  const sampledPondCount = cyclePonds.filter((pond) => (pond.samplings || []).some((sampling) => (
    !isBaselineSampling(sampling) && toFiniteNumber(sampling.mbw || sampling.abw) > 0
  ))).length;
  const waterQualityPondCount = cyclePonds.filter((pond) => (pond.samplings || []).some(hasWaterQualityData)).length;
  const waterQualityRecordCount = cyclePonds.reduce((sum, pond) => (
    sum + (pond.samplings || []).filter(hasWaterQualityData).length
  ), 0);
  const averageHarvestMbw = harvestedBiomass > 0
    ? reportPonds.reduce((sum, pond) => sum + (pond.averageHarvestMbw * pond.harvestedBiomass), 0) / harvestedBiomass
    : 0;
  const costs = {
    feed: feedCost,
    additives: additiveCost,
    maintenance: maintenanceCost,
    manualExpenses,
    total: feedCost + additiveCost + maintenanceCost + manualExpenses,
  };
  const grossProfit = harvestRevenue - costs.total;
  const notes: WebCycleReport['notes'] = [];
  if (cyclePonds.length === 0) notes.push({ severity: 'warning', key: 'noPonds', message: 'No pond documents were found for this cycle.' });
  if (matchedHarvestRecords.length === 0) notes.push({ severity: 'warning', key: 'noHarvestRecords', message: 'No harvest records are linked to this cycle yet.' });
  if (feeds.flatMap((item) => item.usageHistory || []).filter(matchesUsage).some((usage) => usageCost(usage) <= 0)) notes.push({ severity: 'warning', key: 'missingFeedCost', message: 'Some feed usage records do not have a saved cost.' });
  if (additives.flatMap((item) => item.usageHistory || []).filter(matchesUsage).some((usage) => usageCost(usage) <= 0)) notes.push({ severity: 'warning', key: 'missingAdditiveCost', message: 'Some additive usage records do not have a saved cost.' });
  cyclePonds.filter((pond) => !(pond.samplings || []).some((sampling) => !isBaselineSampling(sampling) && toFiniteNumber(sampling.mbw || sampling.abw) > 0)).forEach((pond) => {
    notes.push({ severity: 'info', key: 'noMbwSampling', pondName: pond.pondName, message: `${pond.pondName} has no MBW sampling records.` });
  });
  if (cycle.status !== 'closed') notes.push({ severity: 'info', key: 'cycleNotClosed', message: 'This cycle is not closed yet. Final profitability may still change.' });

  const result: WebCycleReport = {
    cycle,
    harvestRecords: matchedHarvestRecords,
    ponds: reportPonds,
    notes,
    totals: {
      pondCount: reportPonds.length,
      totalArea,
      initialPopulation,
      harvestedPopulation,
      harvestedBiomass,
      harvestRevenue,
      averageHarvestMbw,
      costs,
      grossProfit,
      costPerKg: harvestedBiomass > 0 ? costs.total / harvestedBiomass : 0,
      revenuePerKg: harvestedBiomass > 0 ? harvestRevenue / harvestedBiomass : 0,
      profitPerKg: harvestedBiomass > 0 ? grossProfit / harvestedBiomass : 0,
      yieldTonPerHa: totalArea > 0 ? (harvestedBiomass * 10) / totalArea : 0,
      overallActualSurvivalRate: initialPopulation > 0 ? (harvestedPopulation / initialPopulation) * 100 : 0,
      actualFcr: fcrBiomassGain > 0 ? fcrPonds.reduce((sum, pond) => sum + pond.totalFeedUsed, 0) / fcrBiomassGain : 0,
      sampledPondCount,
      samplingCoverage: reportPonds.length > 0 ? (sampledPondCount / reportPonds.length) * 100 : 0,
      waterQualityPondCount,
      waterQualityRecordCount,
    },
  };

  if (includeComparison) {
    const previousCycle = getPreviousEnterpriseCycleForSameBlocks(cycle, cycles, ponds);
    const previousReport = previousCycle ? buildWebCycleReport({
      cycle: previousCycle,
      cycles,
      ponds,
      harvestRecords,
      feeds,
      additives,
      expenses,
      assets,
      timeZone,
      includeComparison: false,
    }) : null;
    if (previousReport) {
      result.comparison = {
        cycleName: previousReport.cycle.cycleName,
        yieldTonPerHa: previousReport.totals.yieldTonPerHa,
        overallActualSurvivalRate: previousReport.totals.overallActualSurvivalRate,
        actualFcr: previousReport.totals.actualFcr,
        averageHarvestMbw: previousReport.totals.averageHarvestMbw,
        grossMargin: previousReport.totals.harvestRevenue > 0
          ? (previousReport.totals.grossProfit / previousReport.totals.harvestRevenue) * 100
          : 0,
      };
    }
  }

  return result;
}
