import {
  calculateActualPondPerformance,
  calculatePondHarvestTotals,
} from './cycleReportService';
import type { HarvestRecord } from '../store/pondStore';

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
  if (!harvest.hasFinalHarvest) throw new Error('final harvest was not detected');

  const performance = calculateActualPondPerformance({
    initialPopulation: 110_000,
    initialWeight: 0.5,
    harvestedBiomass: harvest.biomass,
    harvestedPopulation: harvest.population,
    totalFeedUsed: 1_200,
  });
  assertClose(performance.actualSurvivalRate, (100_500 / 110_000) * 100, 'actual survival rate');
  assertClose(performance.actualFcr, 1_200 / 945, 'actual FCR');
};
