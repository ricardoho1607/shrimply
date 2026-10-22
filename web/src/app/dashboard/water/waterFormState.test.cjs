const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const waterFormSource = fs.readFileSync(path.join(__dirname, 'waterFormState.ts'), 'utf8');
const compiledWaterForm = ts.transpileModule(waterFormSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const waterFormModule = { exports: {} };
new Function('module', 'exports', 'require', compiledWaterForm)(waterFormModule, waterFormModule.exports, require);
const { initializeWaterDraft, isDailyWaterRecord } = waterFormModule.exports;

test('draft is independent of later snapshots and preserves typed salinity and pH', () => {
  const records = [];
  const draft = initializeWaterDraft('sim-f1', '2026-09-04', records);
  Object.assign(draft, { salinity: '19.1', phMorning: '8.05', phEvening: '8.35' });
  records.push({ date: '2026-09-04', mbw: 0, feed: 0, mortality: 0, salinity: '16' });
  assert.equal(draft.salinity, '19.1');
  assert.equal(draft.phMorning, '8.05');
  assert.equal(draft.phEvening, '8.35');
});

test('correction selects the existing daily record, excludes feed/sampling, and keeps zero readings', () => {
  const records = [
    { id: 'feed', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, feedData: {} },
    { id: 'sampling', date: '2026-09-04', mbw: 2, mortality: 0, feed: 0 },
    { id: 'water', date: '2026-09-04', mbw: 0, mortality: 0, feed: 0, ammonia: 0, waterExchangePercent: 0, surfaceScum: false },
  ];
  assert.equal(records.findIndex(record => isDailyWaterRecord(record, '2026-09-04')), 2);
  const draft = initializeWaterDraft('sim-f1', '2026-09-04', records);
  assert.equal(draft.ammonia, '0');
  assert.equal(draft.waterExchangePercent, '0');
  assert.equal(draft.surfaceScum, false);
});

test('draft initializes morning and evening fields and falls back to legacy single fields', () => {
  const legacyRecord = {
    date: '2026-09-04', mbw: 0, feed: 0, mortality: 0,
    transparency: 35,
    temperature: 29.5,
    waterAppearance: 'Brown',
    waterDepthCm: 140,
  };
  const draft = initializeWaterDraft('pond-1', '2026-09-04', [legacyRecord]);
  assert.equal(draft.transparencyMorning, '35');
  assert.equal(draft.temperatureMorning, '29.5');
  assert.equal(draft.waterAppearanceMorning, 'Brown');
  assert.equal(draft.waterDepthCmMorning, '140');

  const emptyDraft = initializeWaterDraft('pond-1', '2026-09-05', []);
  assert.equal(emptyDraft.transparencyMorning, '');
  assert.equal(emptyDraft.transparencyEvening, '');
  assert.equal(emptyDraft.temperatureMorning, '');
  assert.equal(emptyDraft.temperatureEvening, '');
  assert.equal(emptyDraft.waterAppearanceMorning, '');
  assert.equal(emptyDraft.waterAppearanceEvening, '');
  assert.equal(emptyDraft.waterDepthCmMorning, '');
  assert.equal(emptyDraft.waterDepthCmEvening, '');
});


test('nitrite and test-kit basis survive reopening a dated reading without inventing units', () => {
  const record = {date:'2026-10-13', mbw:0, feed:0, mortality:0, nitriteMgL:0, nitriteBasis:'NO2-N', ammoniaBasis:'TAN-N'};
  const draft = initializeWaterDraft('pond-a', '2026-10-13', [record]);
  assert.equal(draft.nitriteMgL, '0');
  assert.equal(draft.nitriteBasis, 'NO2-N');
  assert.equal(draft.ammoniaBasis, 'TAN-N');
  const otherDate = initializeWaterDraft('pond-a', '2026-10-14', [record]);
  assert.equal(otherDate.nitriteMgL, '');
  assert.equal(otherDate.nitriteBasis, '');
});

test('a nitrite-only record, including zero, remains visible in water history', () => {
  const source = fs.readFileSync(path.join(__dirname, 'WaterQualityModel.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020} }).outputText;
  const model = {exports: {}};
  new Function('module', 'exports', 'require', compiled)(model, model.exports, require);
  assert.equal(model.exports.hasWaterQualityHistory({nitriteMgL: '0'}), true);
  assert.equal(model.exports.hasWaterQualityHistory({nitriteMgL: '0.2'}), true);
  assert.equal(model.exports.hasWaterQualityHistory({nitriteMgL: ''}), false);
});
