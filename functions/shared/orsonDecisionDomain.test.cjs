const test = require('node:test');
// Run the exported assertion batches: loading these TS modules alone does not execute them.
for (const file of ['../../shared/harvestProfitability.test.ts', '../../shared/financeMetrics.test.ts', '../../orson/harvestProjection.test.ts']) {
  for (const [name, run] of Object.entries(require(file))) {
    if (/^run.*SelfTest$/.test(name)) test(name, run);
  }
}
