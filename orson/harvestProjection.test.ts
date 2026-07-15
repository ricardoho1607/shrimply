import { calculateOrsonHarvestProjection } from './harvestProjection';
import { createDefaultOrsonCalibration } from './learning';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runHarvestProjectionSelfTest = () => {
  const projection = calculateOrsonHarvestProjection({
    pond: {
      id: 'pond-h1',
      pondName: 'H1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        {
          id: 's1',
          date: '2026-01-20',
          mbw: 5,
          mortality: 500,
          feed: 25,
          doMorning: 4.8,
          doEvening: 4.2,
          feedData: { totalDailyFeed: 25 },
        },
        {
          id: 's2',
          date: '2026-01-30',
          mbw: 8,
          mortality: 300,
          feed: 38,
          doMorning: 4.6,
          doEvening: 4,
          feedData: { totalDailyFeed: 38 },
        },
      ],
    },
    daysToHarvest: 14,
    expectedPricePerKg: 5.5,
    dailyFeedCost: 50,
    targetMarketSizeG: 20,
    now: new Date('2026-02-01T00:00:00Z'),
  });

  assert(projection.pondName === 'H1', 'keeps pond identity');
  assert(projection.currentDoc === 31, 'calculates current DOC');
  assert(projection.futureDoc === 45, 'calculates harvest DOC');
  assert(projection.historicalAdgGPerDay === 0.3, 'uses historical ADG');
  assert(projection.assumedAdgGPerDay === 0.3, 'defaults projection ADG to historical ADG');
  assert(projection.projectedMbwG === 12.2, 'projects MBW from ADG and days');
  assert(projection.assumedSurvivalPercent !== 80, 'does not use fixed mock survival');
  assert(projection.projectedBiomassKg !== null && projection.projectedBiomassKg > 0, 'projects biomass from survival and MBW');
  assert(projection.marketSizeRisk === 'undersize', 'flags undersize market risk');
  assert(projection.confidenceScore > 0, 'returns confidence score');
  assert(projection.risks.some((risk) => risk.id === 'projection_undersize_market'), 'returns structured projection risk');

  const calibrated = calculateOrsonHarvestProjection({
    pond: {
      id: 'pond-h1',
      pondName: 'H1',
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        { id: 's1', date: '2026-01-20', mbw: 5, mortality: 500, feed: 25 },
        { id: 's2', date: '2026-01-30', mbw: 8, mortality: 300, feed: 38 },
      ],
    },
    daysToHarvest: 14,
    expectedPricePerKg: 5.5,
    dailyFeedCost: 50,
    now: new Date('2026-02-01T00:00:00Z'),
    calibration: {
      ...createDefaultOrsonCalibration(),
      versionNumber: 1,
      versionId: 'v1-test',
      status: 'active',
      companyAdjustment: {
        adgMultiplier: 0.95,
        survivalOffsetPercentagePoints: -2,
        biomassMultiplier: 0.96,
        sampleSize: 20,
      },
    },
  });
  assert(calibrated.calibrationScope === 'company', 'applies active company calibration');
  assert(calibrated.assumedAdgGPerDay === 0.285, 'calibrates default ADG without changing the biological base');
  assert(calibrated.learningContext.baseAssumedAdgGPerDay === 0.3, 'preserves the uncalibrated ADG for backtesting');
  assert(calibrated.projectedBiomassKg! < calibrated.learningContext.baseProjectedBiomassKg!, 'applies bounded survival and biomass corrections');

  return projection;
};
