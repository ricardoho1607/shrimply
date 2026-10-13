/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFeatureSource } = require('../../../scripts/read-feature-source.cjs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const currencyContext = readFeatureSource(path.join(__dirname, 'CurrencyContext.tsx'));
const appProviders = readFeatureSource(path.join(__dirname, '../components/AppProviders.tsx'));
const inventory = readFeatureSource(path.join(__dirname, '../app/dashboard/inventory/feeds/page.tsx'));
const assets = readFeatureSource(path.join(__dirname, '../app/dashboard/inventory/assets/page.tsx'));
const finance = readFeatureSource(path.join(__dirname, '../app/dashboard/finance/page.tsx'));
const harvest = readFeatureSource(path.join(__dirname, '../app/dashboard/harvest/page.tsx'));
const marketplace = readFeatureSource(path.join(__dirname, '../app/dashboard/marketplace/page.tsx'));
const currencyCoreSource = readFeatureSource(path.join(__dirname, '../lib/companyCurrency.ts'));
const compiledCurrencyCore = ts.transpileModule(currencyCoreSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const currencyCoreModule = { exports: {} };
new Function('module', 'exports', 'require', compiledCurrencyCore)(currencyCoreModule, currencyCoreModule.exports, require);
const { resolveCompanyCurrency } = currencyCoreModule.exports;

test('company currency is the source of truth for authenticated web displays', () => {
  assert.match(appProviders, /<AuthProvider>[\s\S]*<CurrencyProvider>/);
  assert.match(currencyContext, /resolveCompanyCurrency\(company\)/);
  assert.match(currencyContext, /updateDoc\(doc\(db, 'companies', company\.id\), \{ currency \}\)/);
  assert.match(inventory, /formatCurrency\(metrics\.feedStockValue\)/);
  assert.match(finance, /formatCurrency\(stats\.totalExpense\)/);
  assert.match(harvest, /formatCurrency\(totalRevenue\)/);
  assert.match(inventory, /unitPrice\} \(\{currencyConfig\.symbol\}\)/);
  assert.match(assets, /\{copy\('Cost'\)\} \(\{currencyConfig\.symbol\}\)/);
  assert.match(marketplace, /formatCurrency\(price\)/);
  assert.doesNotMatch(`${inventory}\n${assets}`, /\(Rp\)/);
});

test('changing display currency does not rewrite monetary records', () => {
  assert.doesNotMatch(currencyContext, /inventory|transactions|harvests/);
});

test('company currency supports current, legacy, missing, and invalid records safely', () => {
  assert.equal(resolveCompanyCurrency({ currency: 'IDR' }), 'IDR');
  assert.equal(resolveCompanyCurrency({ currencyCode: 'THB' }), 'THB');
  assert.equal(resolveCompanyCurrency({ currency: 'AUD' }), 'AUD');
  assert.equal(resolveCompanyCurrency({}), 'IDR');
  assert.equal(resolveCompanyCurrency({ currency: 'INVALID' }), 'IDR');
  assert.equal(resolveCompanyCurrency(null), 'IDR');
});
