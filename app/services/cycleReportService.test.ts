import {
  buildCycleReport,
  calculateActualPondPerformance,
  calculatePondHarvestTotals,
  calculateProductivityKgPerHa,
} from './cycleReportService';
import type { FarmCycle, HarvestRecord, Pond } from '../store/pondStore';

const assertClose = (actual: number, expected: number, label: string) => {
  if (Math.abs(actual - expected) > 0.0001) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};
export const runCycleReportServiceSelfTest = () => {
  const records: HarvestRecord[] = [
    {
      id: 'partial-1',
      date: '2026-07-01',
      cycleId: 'cycle-1',
      ponds: [{
        pondId: 'pond-1', pondName: 'Pond 1', harvestType: 'partial', partialHarvestNumber: 1,
        biomass: '100', size: '80', price: '10', subBiomass: '', subSize: '', subPrice: '',
      }],
    },
    {
      id: 'final-1',
      date: '2026-07-10',
      cycleId: 'cycle-1',
      ponds: [{
        pondId: 'pond-1', pondName: 'Pond 1', harvestType: 'final',
        biomass: '800', size: '100', price: '10', subBiomass: '100', subSize: '125', subPrice: '8',
      }],
    },
  ];

  const harvest = calculatePondHarvestTotals(records, 'pond-1');
  assertClose(harvest.biomass, 1_000, 'total harvested biomass');
  assertClose(harvest.population, 100_500, 'total harvested population');
  assertClose(harvest.finalHarvestMbw, (900 * 1000) / 92_500, 'weighted final harvest MBW');
  assertClose(harvest.averageHarvestMbw, 10.05, 'biomass-weighted cycle harvest MBW');
  if (!harvest.hasFinalHarvest) throw new Error('final harvest was not detected');
  assertClose(calculateProductivityKgPerHa(harvest.biomass, 2_000), 5_000, 'pond productivity per hectare');
  assertClose(calculateProductivityKgPerHa(harvest.biomass, 0), 0, 'missing pond area productivity');

  const performance = calculateActualPondPerformance({
    initialPopulation: 110_000,
    initialWeight: 0.5,
    harvestedBiomass: harvest.biomass,
    harvestedPopulation: harvest.population,
    totalFeedUsed: 1_200,
  });
  assertClose(performance.actualSurvivalRate, (100_500 / 110_000) * 100, 'actual survival rate');
  assertClose(performance.actualFcr, 1_200 / 945, 'actual FCR');

  const mixedCycleHarvest: HarvestRecord[] = [{
    id: 'mixed-cycle-harvest',
    date: '2026-07-20',
    cycleId: 'cycle-1',
    ponds: [
      {
        pondId: 'pond-1', pondName: 'Pond 1', cycleId: 'cycle-1', harvestType: 'final',
        biomass: '100', size: '100', price: '10', subBiomass: '', subSize: '', subPrice: '',
      },
      {
        pondId: 'pond-2', pondName: 'Pond 2', cycleId: 'cycle-2', harvestType: 'final',
        biomass: '900', size: '100', price: '20', subBiomass: '', subSize: '', subPrice: '',
      },
    ],
  }];
  const mixedCycleReport = buildCycleReport({
    cycleId: 'cycle-1',
    cycles: [{ id: 'cycle-1', cycleName: 'Cycle 1', status: 'closed' } as FarmCycle],
    ponds: [{
      id: 'pond-1', pondName: 'Pond 1', cycleId: 'cycle-1', cycleStatus: 'ended',
      pondArea: 1_000, initialPopulation: 10_000, initialWeight: 0.5, samplings: [
        { id: 'sample-1', date: '2026-06-10', mbw: 6, mortality: 0, feed: 0 },
        { id: 'sample-2', date: '2026-06-20', mbw: 9, mortality: 0, feed: 0, phMorning: '7.8' },
      ],
    } as unknown as Pond],
    harvestRecords: mixedCycleHarvest,
    feeds: [],
    additives: [],
    assets: [],
    expenses: [],
    calculatePondMetricsWithHarvest: () => ({
      currentBiomass: 0,
      currentPopulation: 0,
      adjustedSR: 0,
      totalFeedConsumed: 0,
      adjustedFCR: 0,
    }),
  });
  if (!mixedCycleReport) throw new Error('mixed-cycle report was not built');
  assertClose(mixedCycleReport.totals.harvestedBiomass, 100, 'cycle-scoped harvested biomass');
  assertClose(mixedCycleReport.totals.harvestRevenue, 1_000, 'cycle-scoped harvest revenue');
  assertClose(mixedCycleReport.totals.grossProfit, 1_000, 'cycle-scoped gross profit');
  assertClose(mixedCycleReport.totals.revenuePerKg, 10, 'cycle-scoped revenue per kg');
  assertClose(mixedCycleReport.totals.averageHarvestMbw, 10, 'cycle average harvest MBW');
  assertClose(mixedCycleReport.totals.yieldTonPerHa, 1, 'cycle yield in tonnes per hectare');
  assertClose(mixedCycleReport.totals.overallActualSurvivalRate, 100, 'cycle overall survival');
  assertClose(mixedCycleReport.totals.samplingCoverage, 100, 'cycle MBW sampling coverage');
  assertClose(mixedCycleReport.totals.waterQualityRecordCount, 1, 'cycle water-quality record count');
  assertClose(mixedCycleReport.ponds[0].previousMbw, 6, 'previous valid MBW');
  if (mixedCycleReport.ponds[0].mbwTrend.join(',') !== '6,9') throw new Error('recent MBW movement was not preserved');

  const comparisonReport = buildCycleReport({
    cycleId: 'cycle-current',
    cycles: [
      { id: 'cycle-current', cycleName: 'Current Cycle', status: 'closed', closedAt: '2026-07-20' } as FarmCycle,
      { id: 'cycle-previous', cycleName: 'Previous Cycle', status: 'closed', closedAt: '2026-06-01' } as FarmCycle,
    ],
    ponds: [
      { id: 'pond-current', pondName: 'Current Pond', cycleId: 'cycle-current', cycleStatus: 'ended', pondArea: 1_000, initialPopulation: 10_000, initialWeight: 0.5, samplings: [] } as unknown as Pond,
      { id: 'pond-previous', pondName: 'Previous Pond', cycleId: 'cycle-previous', cycleStatus: 'ended', pondArea: 1_000, initialPopulation: 10_000, initialWeight: 0.5, samplings: [] } as unknown as Pond,
    ],
    harvestRecords: [
      { id: 'current-harvest', date: '2026-07-20', cycleId: 'cycle-current', ponds: [{ pondId: 'pond-current', pondName: 'Current Pond', cycleId: 'cycle-current', harvestType: 'final', biomass: '100', size: '100', price: '10', subBiomass: '', subSize: '', subPrice: '' }] },
      { id: 'previous-harvest', date: '2026-06-01', cycleId: 'cycle-previous', ponds: [{ pondId: 'pond-previous', pondName: 'Previous Pond', cycleId: 'cycle-previous', harvestType: 'final', biomass: '80', size: '100', price: '8', subBiomass: '', subSize: '', subPrice: '' }] },
    ],
    feeds: [],
    additives: [],
    assets: [],
    expenses: [],
    calculatePondMetricsWithHarvest: () => ({ currentBiomass: 0, currentPopulation: 0, adjustedSR: 0, totalFeedConsumed: 0, adjustedFCR: 0 }),
  });
  if (!comparisonReport?.comparison) throw new Error('previous cycle comparison was not created');
  if (comparisonReport.comparison.cycleName !== 'Previous Cycle') throw new Error('wrong comparison cycle selected');
  assertClose(comparisonReport.comparison.yieldTonPerHa, 0.8, 'previous cycle yield comparison');
};
