const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCycleReport } = require('./cycleReportService.ts');

test('mobile pond report isolates harvest and costs from other ponds and unallocated cycle bills', () => {
  const ponds = ['p1','p2'].map(id => ({ id, pondName: id, cycleId: 'c1', cycleStatus: 'ended', initialPopulation: 1000, initialWeight: 1, samplings: [] }));
  const report = buildCycleReport({ cycleId: 'c1', pondId: 'p1', cycles: [{id:'c1',cycleName:'Cycle',status:'active'}], ponds,
    harvestRecords: [{id:'h',cycleId:'c1',date:'2026-01-01',ponds:[{pondId:'p1',biomass:'100',price:'10',size:'100',harvestType:'final'},{pondId:'p2',biomass:'900',price:'20',size:'100',harvestType:'final'}]}],
    feeds: [{usageHistory:[{cycleId:'c1',pondId:'p1',totalCost:10,quantity:1},{cycleId:'c1',pondId:'p2',totalCost:80,quantity:1},{cycleId:'c1',totalCost:30,quantity:1}]}], additives:[],assets:[],
    expenses: [{cycleId:'c1',category:'Salary',amount:100,pondAllocations:[{pondId:'p1',cycleId:'c1',amount:40},{pondId:'p2',cycleId:'c1',amount:60}]},{cycleId:'c1',category:'Salary',amount:500}],
    calculatePondMetricsWithHarvest:()=>({currentBiomass:0,currentPopulation:0,adjustedSR:0,totalFeedConsumed:0,adjustedFCR:0}),
  });
  assert.equal(report.ponds.length,1);
  assert.equal(report.totals.harvestRevenue,1000);
  assert.equal(report.totals.costs.feed,10);
  assert.equal(report.totals.costs.manualExpenses,40);
  assert.equal(report.totals.costs.total,50);
});
