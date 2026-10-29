/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const mobileSource = fs.readFileSync(path.join(__dirname, '../../../../../app/(tabs)/harvest.tsx'), 'utf8');
const commitSource = fs.readFileSync(path.join(__dirname, '../../../../../shared/commitHarvestOperation.ts'), 'utf8');
const finance = fs.readFileSync(path.join(__dirname, '../../../../../shared/financeSync.ts'), 'utf8');
const loaded = { exports: {} };
new Function('module', 'exports', ts.transpileModule(finance, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(loaded, loaded.exports);

test('harvest price and biomass inputs accept whole numbers and hundredths', () => {
  for (const field of ['price', 'subPrice', 'biomass', 'subBiomass']) {
    const input = source.match(new RegExp('<input[^>]*value=\\{formData\\.' + field + '\\}[^>]*>'))?.[0];
    assert.ok(input, field);
    assert.match(input, /min="0.01"/);
    assert.match(input, /step="0.01"/, field);
  }
});

test('displayed harvest revenue handles omitted sub-grade sales and includes recorded sales', () => {
  const expression = source.match(/\{formatCurrency\(([^\n]+)\)\}/g)
    .find(value => value.includes('p.') || value.includes('ponds: [p]'));
  assert.ok(expression);
  const calculate = new Function('p', 'record', 'buildHarvestRevenue', 'formatCurrency',
    'return ' + expression.slice(1, -1));
  const record = { id: 'h1', date: '2026-09-09' };
  for (const optional of [{}, { subBiomass: '', subPrice: '' }]) {
    assert.equal(calculate({ biomass: '100', price: '10.50', ...optional }, record,
      loaded.exports.buildHarvestRevenue, value => value), 1050);
  }
  assert.equal(calculate({ biomass: '100', price: '10', subBiomass: '20', subPrice: '5.25' },
    record, loaded.exports.buildHarvestRevenue, value => value), 1105);
});

const styles = fs.readFileSync(path.join(__dirname, 'HarvestPage.module.css'), 'utf8');

test('harvest entry uses a compact scrollable modal with persistent actions', () => {
  assert.match(source, /className={`glass-card responsive-modal \$\{styles\.harvestModal\}`}/);
  assert.match(styles, /\.harvestOverlay\s*{[\s\S]*?z-index:\s*9100 !important;/);
  assert.match(source, /className={`responsive-modal-body \$\{styles\.harvestForm\}`}/);
  assert.match(source, /className={styles\.harvestFormScroll}/);
  assert.match(source, /className={`responsive-modal-footer \$\{styles\.harvestFooter\}`}/);
  assert.match(styles, /\.harvestModal\s*{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/);
  assert.match(styles, /\.harvestForm\s*{[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(styles, /\.harvestFormScroll\s*{[\s\S]*?flex:\s*1;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(styles, /\.harvestFooter\s*{[\s\S]*?flex:\s*0 0 auto;/);
});

test('phone harvest entry pairs short fields and compacts biomass inputs', () => {
  assert.match(source, /className={`responsive-form-grid \$\{styles\.harvestGrid\}`}/);
  assert.match(source, /className={`responsive-two-column \$\{styles\.primaryMetrics\}`}/);
  assert.match(source, /className={`responsive-card-grid \$\{styles\.secondaryMetrics\}`}/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.harvestGrid\s*{[\s\S]*?grid-template-areas:[\s\S]*?"date size"/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.metricsPanel\s*{[\s\S]*?grid-area:\s*metrics !important;/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.primaryMetrics\s*{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important;/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.secondaryMetrics\s*{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important;/);
});

test('save harvest uses the solid Shrimply primary color', () => {
  assert.match(source, /className={`btn-primary \$\{styles\.saveButton\}`}/);
  assert.match(styles, /\.saveButton\s*{[\s\S]*?background:\s*#0f4c75 !important;/);
});

test('close control is square and highlights only on hover', () => {
  assert.match(source, /className={styles\.closeButton}/);
  assert.match(styles, /\.closeButton\s*{[\s\S]*?border-radius:\s*8px;[\s\S]*?background:\s*transparent;/);
  assert.match(styles, /\.closeButton:hover\s*{[\s\S]*?background:\s*var\(--bg-mid\);/);
});

test('harvest requires a positive-MBW sampling on the selected date', () => {
  assert.match(source, /getHarvestDateSampling\(selectedPond, formData\.date\)/);
  assert.match(source, /pond.id === formData.pondId && !getHarvestDateSampling/);
  assert.match(source, /saveRequiredSampling\(pond\)/);
  assert.match(source, /harvestSizeDiffersFromSampling/);
});

test('harvest waits for ponds, cycles, and records before showing counts', () => {
  assert.match(source, /const \[pondsResolved, setPondsResolved\] = useState\(false\)/);
  assert.match(source, /const \[cyclesResolved, setCyclesResolved\] = useState\(false\)/);
  assert.match(source, /const \[harvestRecordsResolved, setHarvestRecordsResolved\] = useState\(false\)/);
  assert.match(source, /const loading = !pondsResolved \|\| !cyclesResolved \|\| !harvestRecordsResolved/);
  assert.match(source, /if \(loading\) \{[\s\S]*?return \([\s\S]*?aria-label=\{copy\('Loading harvest data'\)\}/);
});

test('saved harvest ponds can open a prefilled editor on web and mobile', () => {
  assert.match(source, /const openEditRecord = \(record: HarvestRecord, pondId\?: string\)/);
  assert.match(source, /onClick=.*openEditRecord\(record\)/);
  assert.match(source, /openEditRecord\(record, p\.pondId\)/);
  assert.match(source, /setFormData\(entries\[entries\.length - 1\]\)/);
  assert.match(mobileSource, /const handleEditHarvest = \(record: HarvestRecord\)/);
  assert.match(mobileSource, /onPress=\{\(\) => handleEditHarvest\(harvest\)\}/);
  assert.match(mobileSource, /setPondData\(record\.ponds\.map/);
});

test('editing uses an auditable void and replacement correction', () => {
  assert.match(commitSource, /correctedFromHarvestId: original\.id/);
  assert.match(commitSource, /transaction\.update\(sourceRef/);
  assert.match(source, /voided:\s*true/);
  assert.match(mobileSource, /createHarvestOperation\(id, records, editingHarvest \|\| undefined\)/);
});

test('changing the current pond date preserves queued ponds and manual harvest values', () => {
  const handler = source.slice(source.indexOf('  const changePondDate ='), source.indexOf('  const editQueuedPond ='));
  const compiled = ts.transpileModule(handler + '\nreturn changePondDate;', {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  require('../../../../../scripts/register-typescript.cjs');
  const calculations = require('../../../../../shared/harvestCalculations.ts');
  for (const manual of [false,true]) {
    let formData = {pondId:'p1',date:'2026-09-16',size:manual?'55':'50',biomass:'100',price:'10'};
    const queued = [{pondId:'p2',date:'2026-09-15',biomass:'200'}];
    const deps = {...calculations,formData,autoFilledSizes:{current:manual?{}:{p1:'50'}},
      formPonds:[{id:'p1',samplings:[{date:'2026-09-17',mbw:25}]}],
      setFormData:update=>{formData=update(formData);},setSamplingMbwDrafts:()=>{},setSamplingFeedStatuses:()=>{}};
    new Function(...Object.keys(deps),compiled)(...Object.values(deps))('2026-09-17');
    assert.equal(formData.date,'2026-09-17');
    assert.equal(formData.size,manual?'55':'40');
    assert.equal(formData.biomass,'100');assert.equal(formData.price,'10');
    assert.deepEqual(queued,[{pondId:'p2',date:'2026-09-15',biomass:'200'}]);
  }
});
