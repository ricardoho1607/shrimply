const test = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/register-typescript.cjs');
const { applyOfflineMutationToCollection } = require('./offlineWorkspace.ts');
const { overlayDailyFeedIntents } = require('./dailyFeedTransaction.ts');
const intent = { pondId:'p', date:'2026-09-11', previousFeedIds:['f'], allocations:[{ inventoryFeedId:'f', quantityKg:20 }] };
const mutation = { id:'op', dailyFeed:intent };
test('pending feed overlay reconciles a refreshed stock instead of applying a stale delta', () => {
 const original = [{id:'f', totalStock:100, totalCost:200, usageHistory:[]}];
 const first = applyOfflineMutationToCollection(original, mutation);
 assert.equal(first[0].totalStock, 80);
 assert.equal(applyOfflineMutationToCollection(first, mutation)[0].totalStock, 80);
 const otherDevice = [{...first[0], usageHistory:first[0].usageHistory.map(row=>({...row,id:'other:f'}))}];
 assert.equal(applyOfflineMutationToCollection(otherDevice, mutation)[0].totalStock,80);
});
test('pending desired feed survives a server pond refresh without changing biological sampling', () => {
 const sample = {id:'sample',date:intent.date,mbw:10,feed:5};
 const result = overlayDailyFeedIntents([{id:'p',samplings:[sample]}],[intent]);
 assert.deepEqual(result[0].samplings[0],sample);
 assert.equal(result[0].samplings[1].feedData.totalDailyFeed,'20.00');
 assert.equal(overlayDailyFeedIntents(result,[intent])[0].samplings.length,2);
});
