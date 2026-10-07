import { monetaryValue } from '../../shared/financeIntegrity';
import { savedUsageCost, isCycleOperatingExpense, isMaintenanceExpense } from '../../shared/reportingIntegrity';
import type { Asset } from '../store/assetStore';
import type { Additive, Feed, UsageHistory } from '../store/feedAdditiveStore';
import {
  type FarmCycle,
  type HarvestRecord,
  type Pond,
  getPondPlSupplier,
  hasWaterQualityData,
  isBaselineSampling,
  isPondCycleActive,
} from '../store/pondStore';
import type { Expense } from './financeService';
import { scopeExpenseRecords } from '../../shared/financeExpenseAllocation';
import { getPreviousEnterpriseCycleForSameBlocks } from '../../shared/enterpriseCycles';

export type CycleReportNote = {
  severity: 'info' | 'warning';
  key:
    | 'noPonds'
    | 'noHarvestRecords'
    | 'missingFeedCost'
    | 'missingAdditiveCost'
    | 'noMbwSampling'
    | 'maintenancePosting' | 'cycleNotClosed';
  pondName?: string;
  message: string;
};

export type CycleReportPond = {
  id: string;
  pondName: string;
  supplier: string;
  status: 'active' | 'ended';
  stockingDate: string;
  endedAt?: string;
  doc: number;
  area: number;
  density: number;
  initialPopulation: number;
  initialWeight: number;
  latestMbw: number;
  previousMbw: number;
  mbwTrend: number[];
  finalHarvestMbw: number;
  averageHarvestMbw: number;
  productivityKgPerHa: number;
  estimatedBiomass: number;
  survivalRate: number;
  fcr: number;
  actualSurvivalRate: number;
  actualFcr: number;
  totalFeedUsed: number;
  hasFinalHarvest: boolean;
  closureReason?: Pond['cycleEndReason'];
  isNonHarvestClosure: boolean;
  harvestedBiomass: number;
  harvestedPopulation: number;
  mortality: number;
  samplingCount: number;
};

export type CycleReportBenchmark = {
  cycleName: string;
  yieldTonPerHa: number;
  overallActualSurvivalRate: number;
  actualFcr: number;
  averageHarvestMbw: number;
  grossMargin: number;
};

export type CycleCostBreakdown = {
  feed: number;
  additives: number;
  maintenance: number;
  manualExpenses: number;
  total: number;
};

export type CycleReport = {
  cycle: FarmCycle;
  ponds: CycleReportPond[];
  harvestRecords: HarvestRecord[];
  notes: CycleReportNote[];
  comparison?: CycleReportBenchmark;
  totals: {
    pondCount: number;
    activePondCount: number;
    endedPondCount: number;
    totalArea: number;
    initialPopulation: number;
    harvestedPopulation: number;
    harvestedBiomass: number;
    harvestRevenue: number;
    averageHarvestSize: number;
    averageHarvestMbw: number;
    feedUsageQty: number;
    additiveUsageQty: number;
    costs: CycleCostBreakdown;
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
};

type BuildCycleReportInput = {
  cycleId: string;
  cycles: FarmCycle[];
  ponds: Pond[];
  harvestRecords: HarvestRecord[];
  feeds: Feed[];
  additives: Additive[];
  assets: Asset[];
  expenses: Expense[];
  calculatePondMetricsWithHarvest: (pond: Pond) => {
    currentBiomass: number;
    currentPopulation: number;
    adjustedSR: number;
    totalFeedConsumed: number;
    adjustedFCR: number;
  };
  includeComparison?: boolean;
};

const LEGACY_CYCLE_ID = 'legacy-active-cycle';

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const daysBetween = (start?: string, end?: string): number => {
  if (!start) return 0;
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return Math.max(0, Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)));
};

const getLatestMbw = (pond: Pond): number => {
  const validSamplings = [...(pond.samplings || [])]
    .filter((sampling) => !isBaselineSampling(sampling) && toNumber(sampling.mbw) > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return toNumber(validSamplings[0]?.mbw || pond.baselineMbw || pond.initialWeight || 0);
};

const getMbwMovement = (pond: Pond): { previousMbw: number; mbwTrend: number[] } => {
  const validSamplings = [...(pond.samplings || [])]
    .filter((sampling) => !isBaselineSampling(sampling) && toNumber(sampling.mbw) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const trend = validSamplings.slice(-5).map((sampling) => toNumber(sampling.mbw));
  return {
    previousMbw: trend.length > 1 ? trend[trend.length - 2] : 0,
    mbwTrend: trend,
  };
};

const getPondMortality = (pond: Pond): number =>
  (pond.samplings || []).filter((sampling) => !isBaselineSampling(sampling)).reduce((sum, sampling) => sum + toNumber(sampling.mortality), 0);

const usageMatchesCycle = (usage: UsageHistory, cycleId: string, cyclePondIds: Set<string>): boolean =>
  usage.source !== 'treatmentMixProduction' && (usage.cycleId ? usage.cycleId === cycleId :
    (cycleId === LEGACY_CYCLE_ID && !!usage.pondId) || (!!usage.pondId && cyclePondIds.has(usage.pondId)));

const usageCost = savedUsageCost;

const harvestPondMatchesCycle = (
  harvest: HarvestRecord,
  pond: HarvestRecord['ponds'][number],
  cycleId: string,
  cyclePondIds: Set<string>,
): boolean => {
  if (pond.cycleId) return pond.cycleId === cycleId;
  if (harvest.cycleId) return harvest.cycleId === cycleId;
  return cyclePondIds.has(pond.pondId);
};

const harvestMatchesCycle = (harvest: HarvestRecord, cycleId: string, cyclePondIds: Set<string>): boolean =>
  harvest.ponds.some((pond) => harvestPondMatchesCycle(harvest, pond, cycleId, cyclePondIds));

const calculateHarvestTotals = (records: HarvestRecord[], cycleId: string, cyclePondIds: Set<string>) => {
  let biomass = 0;
  let revenue = 0;
  let weightedSize = 0;
  let weightedSizeBiomass = 0;

  records.forEach((record) => {
    record.ponds.filter((pond) => harvestPondMatchesCycle(record, pond, cycleId, cyclePondIds)).forEach((pond) => {
      const mainBiomass = toNumber(pond.biomass);
      const mainSize = toNumber(pond.size);
      const mainPrice = toNumber(pond.price);
      const subBiomass = toNumber(pond.subBiomass);
      const subSize = toNumber(pond.subSize);
      const subPrice = toNumber(pond.subPrice);

      biomass += mainBiomass + subBiomass;
      revenue += (mainBiomass * mainPrice) + (subBiomass * subPrice);

      if (mainBiomass > 0 && mainSize > 0) {
        weightedSize += mainBiomass * mainSize;
        weightedSizeBiomass += mainBiomass;
      }
      if (subBiomass > 0 && subSize > 0) {
        weightedSize += subBiomass * subSize;
        weightedSizeBiomass += subBiomass;
      }
    });
  });

  return {
    biomass,
    revenue,
    averageSize: weightedSizeBiomass > 0 ? weightedSize / weightedSizeBiomass : 0,
  };
};

export const calculatePondHarvestTotals = (records: HarvestRecord[], pondId: string) => {
  let biomass = 0;
  let population = 0;
  let weightedMbw = 0;
  let weightedMbwBiomass = 0;
  const finalHarvests: { date: string; biomass: number; population: number }[] = [];

  records.forEach((record) => {
    record.ponds
      .filter((harvestPond) => harvestPond.pondId === pondId)
      .forEach((harvestPond) => {
        const mainBiomass = toNumber(harvestPond.biomass);
        const subBiomass = toNumber(harvestPond.subBiomass);
        const mainPopulation = mainBiomass * toNumber(harvestPond.size);
        const subPopulation = subBiomass * toNumber(harvestPond.subSize);
        const pondBiomass = mainBiomass + subBiomass;
        const pondPopulation = mainPopulation + subPopulation;

        biomass += pondBiomass;
        population += pondPopulation;
        if (mainBiomass > 0 && toNumber(harvestPond.size) > 0) {
          weightedMbw += mainBiomass * (1000 / toNumber(harvestPond.size));
          weightedMbwBiomass += mainBiomass;
        }
        if (subBiomass > 0 && toNumber(harvestPond.subSize) > 0) {
          weightedMbw += subBiomass * (1000 / toNumber(harvestPond.subSize));
          weightedMbwBiomass += subBiomass;
        }
        if (harvestPond.harvestType === 'final') {
          finalHarvests.push({ date: record.date, biomass: pondBiomass, population: pondPopulation });
        }
      });
  });

  const finalHarvest = finalHarvests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return {
    biomass,
    population,
    hasFinalHarvest: Boolean(finalHarvest),
    finalHarvestMbw: finalHarvest && finalHarvest.population > 0
      ? (finalHarvest.biomass * 1000) / finalHarvest.population
      : 0,
    averageHarvestMbw: weightedMbwBiomass > 0 ? weightedMbw / weightedMbwBiomass : 0,
  };
};

export const calculateActualPondPerformance = ({
  initialPopulation,
  initialWeight,
  harvestedBiomass,
  harvestedPopulation,
  totalFeedUsed,
}: {
  initialPopulation: number;
  initialWeight: number;
  harvestedBiomass: number;
  harvestedPopulation: number;
  totalFeedUsed: number;
}) => {
  const initialBiomass = (initialPopulation * initialWeight) / 1000;
  const biomassGain = harvestedBiomass - initialBiomass;
  return {
    actualSurvivalRate: initialPopulation > 0 ? (harvestedPopulation / initialPopulation) * 100 : 0,
    actualFcr: biomassGain > 0 ? totalFeedUsed / biomassGain : 0,
  };
};

export const calculateProductivityKgPerHa = (harvestedBiomass: number, areaSquareMetres: number): number => {
  const biomass = toNumber(harvestedBiomass);
  const area = toNumber(areaSquareMetres);
  return area > 0 ? biomass / (area / 10_000) : 0;
};

const inferCycle = (cycleId: string, cycles: FarmCycle[], ponds: Pond[]): FarmCycle | undefined => {
  const cycle = cycles.find((item) => item.id === cycleId);
  if (cycle) return cycle;

  const cyclePonds = ponds.filter((pond) =>
    pond.cycleId === cycleId ||
    (cycleId === LEGACY_CYCLE_ID && !pond.cycleId)
  );
  if (cyclePonds.length === 0) return undefined;

  const startDates = cyclePonds
    .map((pond) => pond.cycleStartedAt || pond.docStart)
    .filter(Boolean)
    .sort();
  const endDates = cyclePonds
    .map((pond) => pond.cycleEndedAt)
    .filter(Boolean)
    .sort();

  return {
    id: cycleId,
    cycleName: cyclePonds[0]?.cycleName || 'Cycle',
    status: cyclePonds.some(isPondCycleActive) ? 'active' : 'closed',
    plannedStartDate: startDates[0],
    stockingStartDate: startDates[0],
    stockingEndDate: endDates[endDates.length - 1],
    closedAt: endDates[endDates.length - 1],
  };
};

export const buildCycleReport = ({
  cycleId,
  cycles,
  ponds,
  harvestRecords,
  feeds,
  additives,
  assets,
  expenses,
  calculatePondMetricsWithHarvest,
  includeComparison = true,
}: BuildCycleReportInput): CycleReport | null => {
  const cycle = inferCycle(cycleId, cycles, ponds);
  if (!cycle) return null;

  const cyclePonds = ponds.filter((pond) =>
    pond.cycleId === cycleId ||
    (cycleId === LEGACY_CYCLE_ID && !pond.cycleId)
  );
  const cyclePondIds = new Set(cyclePonds.map((pond) => pond.id));
  const matchedHarvestRecords = harvestRecords.filter((harvest) => harvestMatchesCycle(harvest, cycleId, cyclePondIds));
  const harvestTotals = calculateHarvestTotals(matchedHarvestRecords, cycleId, cyclePondIds);

  const feedUsages = feeds.flatMap((feed) =>
    (feed.usageHistory || [])
      .filter((usage) => usageMatchesCycle(usage, cycleId, cyclePondIds))
      .map((usage) => ({ usage, feed }))
  );
  const additiveUsages = additives.flatMap((additive) =>
    (additive.usageHistory || [])
      .filter((usage) => usageMatchesCycle(usage, cycleId, cyclePondIds))
      .map((usage) => ({ usage, additive }))
  );

  const feedCost = feedUsages.reduce((sum, item) => sum + usageCost(item.usage), 0);
  const additiveCost = additiveUsages.reduce((sum, item) => sum + usageCost(item.usage), 0);
  const feedUsageQty = feedUsages.reduce((sum, item) => sum + toNumber(item.usage.quantity), 0);
  const additiveUsageQty = additiveUsages.reduce((sum, item) => sum + toNumber(item.usage.quantity), 0);

  const operatingExpenses = scopeExpenseRecords(expenses, cycleId, ponds).filter(isCycleOperatingExpense);
  const maintenanceCost = operatingExpenses.filter(isMaintenanceExpense).reduce((sum, expense) => sum + (monetaryValue(expense.amount) ?? Number.NaN), 0);
  const manualExpenses = operatingExpenses.filter(expense => !isMaintenanceExpense(expense)).reduce((sum, expense) => sum + (monetaryValue(expense.amount) ?? Number.NaN), 0);

  const reportPonds: CycleReportPond[] = cyclePonds.map((pond) => {
    const metrics = calculatePondMetricsWithHarvest(pond);
    const pondHarvest = calculatePondHarvestTotals(matchedHarvestRecords, pond.id);
    const harvestedBiomass = pondHarvest.biomass || toNumber(pond.totalHarvestedBiomass);
    const harvestedPopulation = pondHarvest.population || toNumber(pond.totalHarvestedPopulation);
    const initialPopulation = toNumber(pond.initialPopulation);
    const area = toNumber(pond.pondArea);
    const initialWeight = toNumber(pond.initialWeight || 0.5);
    const mbwMovement = getMbwMovement(pond);
    const actualPerformance = calculateActualPondPerformance({
      initialPopulation,
      initialWeight,
      harvestedBiomass,
      harvestedPopulation,
      totalFeedUsed: metrics.totalFeedConsumed,
    });
    const nonHarvestReasons: Pond['cycleEndReason'][] = ['disease', 'reset', 'other'];
    return {
      id: pond.id,
      pondName: pond.pondName,
      supplier: getPondPlSupplier(pond),
      status: isPondCycleActive(pond) ? 'active' : 'ended',
      stockingDate: pond.cycleStartedAt || pond.docStart,
      endedAt: pond.cycleEndedAt,
      doc: daysBetween(pond.cycleStartedAt || pond.docStart, pond.cycleEndedAt || cycle.closedAt),
      area,
      density: toNumber(pond.density),
      initialPopulation: toNumber(pond.initialPopulation),
      initialWeight,
      latestMbw: getLatestMbw(pond),
      previousMbw: mbwMovement.previousMbw,
      mbwTrend: mbwMovement.mbwTrend,
      finalHarvestMbw: pondHarvest.finalHarvestMbw,
      averageHarvestMbw: pondHarvest.averageHarvestMbw,
      productivityKgPerHa: calculateProductivityKgPerHa(harvestedBiomass, area),
      estimatedBiomass: metrics.currentBiomass,
      survivalRate: metrics.adjustedSR,
      fcr: metrics.adjustedFCR,
      actualSurvivalRate: actualPerformance.actualSurvivalRate,
      actualFcr: actualPerformance.actualFcr,
      totalFeedUsed: metrics.totalFeedConsumed,
      hasFinalHarvest: pondHarvest.hasFinalHarvest,
      closureReason: pond.cycleEndReason,
      isNonHarvestClosure: nonHarvestReasons.includes(pond.cycleEndReason),
      harvestedBiomass,
      harvestedPopulation,
      mortality: getPondMortality(pond),
      samplingCount: (pond.samplings || []).filter((sampling) => !isBaselineSampling(sampling) && toNumber(sampling.mbw) > 0).length,
    };
  });

  const notes: CycleReportNote[] = [];
  if (cyclePonds.length === 0) notes.push({ severity: 'warning', key: 'noPonds', message: 'No pond documents were found for this cycle.' });
  if (matchedHarvestRecords.length === 0) notes.push({ severity: 'warning', key: 'noHarvestRecords', message: 'No harvest records are linked to this cycle yet.' });
  if (feedUsages.some((item) => !Number.isFinite(usageCost(item.usage)))) notes.push({ severity: 'warning', key: 'missingFeedCost', message: 'Some feed usage records do not have a saved cost.' });
  if (additiveUsages.some((item) => !Number.isFinite(usageCost(item.usage)))) notes.push({ severity: 'warning', key: 'missingAdditiveCost', message: 'Some additive usage records do not have a saved cost.' });
  reportPonds
    .filter((pond) => pond.samplingCount === 0)
    .forEach((pond) => notes.push({ severity: 'info', key: 'noMbwSampling', pondName: pond.pondName, message: `${pond.pondName} has no MBW sampling records.` }));
  if (assets.some(asset => (asset.maintenanceHistory || []).length > 0)) notes.push({ severity: 'info', key: 'maintenancePosting', message: 'Maintenance is counted from Finance entries only. Check that each asset maintenance cost has been posted once in Finance; asset-register amounts are not added again.' });
  if (cycle.status !== 'closed') notes.push({ severity: 'info', key: 'cycleNotClosed', message: 'This cycle is not closed yet. Final profitability may still change.' });

  const costs: CycleCostBreakdown = {
    feed: feedCost,
    additives: additiveCost,
    maintenance: maintenanceCost,
    manualExpenses,
    total: feedCost + additiveCost + maintenanceCost + manualExpenses,
  };
  const grossProfit = harvestTotals.revenue - costs.total;
  const harvestedPopulation = reportPonds.reduce((sum, pond) => sum + pond.harvestedPopulation, 0);
  const initialPopulation = reportPonds.reduce((sum, pond) => sum + pond.initialPopulation, 0);
  const totalArea = reportPonds.reduce((sum, pond) => sum + pond.area, 0);
  const harvestedBiomass = harvestTotals.biomass || reportPonds.reduce((sum, pond) => sum + pond.harvestedBiomass, 0);
  const fcrPonds = reportPonds.filter((pond) => pond.hasFinalHarvest && pond.actualFcr > 0);
  const fcrBiomassGain = fcrPonds.reduce((sum, pond) => (
    sum + pond.harvestedBiomass - ((pond.initialPopulation * pond.initialWeight) / 1000)
  ), 0);
  const sampledPondCount = reportPonds.filter((pond) => pond.samplingCount > 0).length;
  const averageHarvestMbw = harvestedBiomass > 0
    ? reportPonds.reduce((sum, pond) => sum + (pond.averageHarvestMbw * pond.harvestedBiomass), 0) / harvestedBiomass
    : 0;
  const waterQualityPonds = cyclePonds.filter((pond) => (pond.samplings || []).some(hasWaterQualityData));
  const waterQualityRecordCount = cyclePonds.reduce((sum, pond) => (
    sum + (pond.samplings || []).filter(hasWaterQualityData).length
  ), 0);

  const result: CycleReport = {
    cycle,
    ponds: reportPonds,
    harvestRecords: matchedHarvestRecords,
    notes,
    totals: {
      pondCount: reportPonds.length,
      activePondCount: reportPonds.filter((pond) => pond.status === 'active').length,
      endedPondCount: reportPonds.filter((pond) => pond.status === 'ended').length,
      totalArea,
      initialPopulation,
      harvestedPopulation,
      harvestedBiomass,
      harvestRevenue: harvestTotals.revenue,
      averageHarvestSize: harvestTotals.averageSize,
      averageHarvestMbw,
      feedUsageQty,
      additiveUsageQty,
      costs,
      grossProfit,
      costPerKg: harvestedBiomass > 0 ? costs.total / harvestedBiomass : 0,
      revenuePerKg: harvestedBiomass > 0 ? harvestTotals.revenue / harvestedBiomass : 0,
      profitPerKg: harvestedBiomass > 0 ? grossProfit / harvestedBiomass : 0,
      yieldTonPerHa: totalArea > 0 ? (harvestedBiomass * 10) / totalArea : 0,
      overallActualSurvivalRate: initialPopulation > 0 ? (harvestedPopulation / initialPopulation) * 100 : 0,
      actualFcr: fcrBiomassGain > 0 ? fcrPonds.reduce((sum, pond) => sum + pond.totalFeedUsed, 0) / fcrBiomassGain : 0,
      sampledPondCount,
      samplingCoverage: reportPonds.length > 0 ? (sampledPondCount / reportPonds.length) * 100 : 0,
      waterQualityPondCount: waterQualityPonds.length,
      waterQualityRecordCount,
    },
  };

  if (includeComparison) {
    const previousCycle = getPreviousEnterpriseCycleForSameBlocks(cycle, cycles, ponds);
    const previousReport = previousCycle ? buildCycleReport({
      cycleId: previousCycle.id,
      cycles,
      ponds,
      harvestRecords,
      feeds,
      additives,
      assets,
      expenses,
      calculatePondMetricsWithHarvest,
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
};
