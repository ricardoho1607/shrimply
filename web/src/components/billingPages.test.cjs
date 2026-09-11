const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { publicPlanCatalog } = require('../../../functions/shared/companyPlans');

function component(name, mocks = {}) {
  const filename = path.join(__dirname, name);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const source = new Module(filename, module);
  source.filename = filename;
  source.paths = Module._nodeModulePaths(__dirname);
  const requireOriginal = source.require.bind(source);
  source.require = specifier => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (specifier === '@/config/site') return { GOOGLE_PLAY_URL: 'https://play.google.com/store/apps/details?id=com.shrimply.tech.investashrimp' };
    if (specifier === 'next/link') return ({ prefetch, children, ...props }) => React.createElement('a', props, children);
    return requireOriginal(specifier);
  };
  source._compile(compiled, filename);
  return source.exports.default;
}

test('lifetime companies see unlimited usage and no purchase, renewal or downgrade choices', () => {
  const summary = { companyName: 'Lifetime company', entitlements: { planId: 'lifetime', planName: 'Lifetime free', pondLimit: null, orson: { monthlyTotal: null } },
    usage: { physicalPonds: 101, orsonMonthly: 9000 }, plans: publicPlanCatalog(), intervals: [], canManageBilling: true, payments: [] };
  let stateIndex = 0;
  const Billing = component('CompanyBillingPanel.tsx', {
    react: { ...React, useEffect: () => {}, useCallback: fn => fn, useState: initial => [stateIndex++ === 0 ? summary : initial === true ? false : initial, () => {}] },
    '@/lib/firebase': { app: {} }, 'firebase/functions': {}, './BillingOrderReview': () => null,
  });
  const html = renderToStaticMarkup(React.createElement(Billing, { companyId: 'company' }));
  assert.match(html, /Lifetime free/);
  assert.match(html, /101 \/ Unlimited/);
  assert.match(html, /9000 \/ Unlimited/);
  assert.match(html, /No payment or renewal is required/);
  assert.doesNotMatch(html, /Review subscription|Review renewal|Move to Free|Current access ends|Enterprise/);
});

test('public prices render the backend catalogue in both languages without company data', () => {
  const Pricing = component('PricingPage.tsx');
  for (const locale of ['en', 'id']) {
    const html = renderToStaticMarkup(React.createElement(Pricing, { locale }));
    for (const plan of publicPlanCatalog()) {
      assert.ok(html.includes(`>${plan.name}<`));
      assert.ok(html.includes(String(plan.pondLimit)));
      assert.ok(html.includes(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(plan.prices.monthly)));
    }
    assert.match(html, locale === 'en' ? /Up to 10 physical ponds/ : /Hingga 10 kolam fisik/);
    assert.match(html, locale === 'en' ? /Built to grow with your farm/ : /Dibuat untuk tumbuh bersama tambak Anda/);
    assert.equal((html.match(new RegExp(locale === 'en' ? 'Try Shrimply' : 'Coba Shrimply', 'g')) || []).length, 3);
    assert.match(html, /shrimply\.tech@gmail\.com/);
    assert.match(html, /subscription-terms/);
    assert.match(html, /href="\/privacy"/);
    assert.doesNotMatch(html, /Mid-server-|Mid-client-/);
  }
});

test('order review explicitly shows the company, full price, period and subscription scope', () => {
  const Review = component('BillingOrderReview.tsx');
  const html = renderToStaticMarkup(React.createElement(Review, { companyName: 'Test Farm', selection: { planId: 'plus', planName: 'Plus', amount: 500000, interval: 'cycle', pondLimit: 30, monthlyRequests: 300 }, busy: false, onCancel() {}, onConfirm() {} }));
  assert.match(html, /Test Farm/);
  assert.match(html, /4 months/);
  assert.match(html, /500\.000/);
  assert.match(html, /prepaid in full/);
  assert.match(html, /not a marketplace purchase/);
  assert.match(html, /No automatic debit/);
  assert.match(html, /Back to plans/);
  assert.match(html, /Continue to Midtrans checkout/);
});

test('web checkout requires an order review and does not infer paid status from URL parameters', () => {
  const source = fs.readFileSync(path.join(__dirname, 'CompanyBillingPanel.tsx'), 'utf8');
  assert.match(source, /setSelectedPlan\(plan\)/);
  assert.match(source, /onConfirm=\{\(\) => void changePlan\(selectedPlan\)\}/);
  assert.match(source, /summary\.canManageBilling/);
  assert.doesNotMatch(source, /transaction_status|status_code|URLSearchParams/);
});
