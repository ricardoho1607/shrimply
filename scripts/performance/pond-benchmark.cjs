// Run against either checkout with the same Node version and fixture.
require('../register-typescript.cjs');
const { performance } = require('node:perf_hooks');
const { calculatePondMetricsWithHarvest } = require('../../shared/pondCalculations.ts');
const { getFarmDateKeyAtRollover } = require('../../shared/farmDate.ts');
const now = new Date('2026-10-28T05:00:00Z');
const ponds = Array.from({ length: 24 }, (_, p) => ({
  id: `pond-${p}`, docStart: '2026-08-01', initialPopulation: 100000 + p * 1000,
  initialWeight: 0.01, cycleId: 'cycle-1',
  samplings: Array.from({ length: 80 }, (_, day) => ({
    id: `sample-${day}`, date: new Date(Date.UTC(2026, 7, day + 1, 5)).toISOString(),
    mbw: 0.2 + day * 0.2, mortality: day % 7 === 0 ? 10 : 0,
    feedData: { totalDailyFeed: String(1 + day * 0.3), feedingResponse: 'normal', cycleId: 'cycle-1' },
  })),
  mortalityRecords: [],
}));
function dashboardPass() {
  return ponds.reduce((sum, pond) => {
    const m = calculatePondMetricsWithHarvest(pond, 'Asia/Jakarta', { now, currentDateKey: '2026-10-28' });
    return sum + m.currentBiomass + m.adjustedFCR + m.currentPopulation;
  }, 0);
}
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
const samples = [];
let checksum;
for (let run = 0; run < 6; run++) {
  const start = performance.now();
  checksum = dashboardPass();
  if (run) samples.push(performance.now() - start);
}
const dateStart = performance.now();
for (let i = 0; i < 2000; i++) getFarmDateKeyAtRollover(now, 'Asia/Jakarta', 3);
console.log(JSON.stringify({ fixture: '24 ponds, 80 daily records each; five warm runs', node: process.version, dashboardMedianMs: median(samples), dashboardRunsMs: samples, date2000Ms: performance.now() - dateStart, checksum }, null, 2));
