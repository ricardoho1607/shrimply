const test = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
const { buildServerOrsonSystemInstruction } = require('../orson').__test;

for (const route of ['aquaculture_knowledge', 'farm_analysis']) {
  test(`oxygen guidance reaches ${route} answers`, () => {
    const prompt = buildServerOrsonSystemInstruction('standard', 'chat', route);
    assert.match(prompt, /preferred operating target above 5 mg\/L/);
    assert.match(prompt, /3–4 mg\/L.*never a normal operating target/);
    assert.match(prompt, /At or below 3 mg\/L is an emergency action threshold/);
    assert.match(prompt, /measurement time and depth/);
    assert.match(prompt, /temperature, salinity, biomass, exposure duration/);
    assert.match(prompt, /consistent throughout the answer/);
  });
}
