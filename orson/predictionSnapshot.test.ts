import { calculateOrsonHarvestProjection } from './harvestProjection';
import { buildOrsonPredictionSnapshotRequest } from './predictionSnapshot';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runPredictionSnapshotSelfTest = () => {
  const pond = {
    id: 'pond-snapshot',
    pondName: 'Snapshot Pond',
    cycleId: 'cycle-2',
    pondCycleId: 'pond-cycle-2',
    initialPopulation: 100000,
    initialWeight: 0.5,
    docStart: '2026-01-01',
    samplings: [
      { id: 's1', date: '2026-01-20', mbw: 5, mortality: 100, feed: 20 },
      { id: 's2', date: '2026-01-30', mbw: 8, mortality: 200, feed: 30 },
    ],
  };
  const projection = calculateOrsonHarvestProjection({
    pond,
    daysToHarvest: 14,
    expectedPricePerKg: 5,
    dailyFeedCost: 50,
    now: new Date('2026-02-01T00:00:00Z'),
  });
  const snapshot = buildOrsonPredictionSnapshotRequest('company-1', pond, projection);

  assert(snapshot.companyId === 'company-1', 'keeps the company boundary in the callable payload');
  assert(snapshot.cycleId === 'cycle-2' && snapshot.pondCycleId === 'pond-cycle-2', 'links prediction to both lifecycle IDs');
  assert(snapshot.targetDate === '2026-02-15', 'stores the measurable target date');
  assert(snapshot.learningContext.baseProjectedMbwG !== null, 'stores the uncalibrated base for replay testing');
  assert(snapshot.projected.biomassKg === projection.projectedBiomassKg, 'stores the prediction shown to the user');
};
