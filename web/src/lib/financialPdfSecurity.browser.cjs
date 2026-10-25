const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../../../scripts/register-typescript.cjs');
const { chromium } = require('playwright');
const { generateProfitLossHTML } = require('./generated/mobileProfitLossReport.ts');
const { generateCashFlowHTML } = require('./generated/mobileCashFlowReport.ts');
const companyName = '<img src="data:,bad" onerror="globalThis.pdfInjected=true"> Farm & Partners';
const maliciousCategory = '<svg/onload=globalThis.pdfInjected=true>';
const assets = { backgroundBase64: '', logoBase64: '' };
const profit = { period: 'month', startDate: '2026-09-01', endDate: '2026-09-30', companyName,
  totalRevenue: 100, revenueBreakdown: { [maliciousCategory]: 100 }, totalCOGS: 10,
  cogsBreakdown: { [maliciousCategory]: 10 }, grossProfit: 90, totalOPEX: 5,
  opexBreakdown: { [maliciousCategory]: 5 }, operatingIncome: 85, totalOtherExpenses: 0,
  otherExpenseBreakdown: {}, netProfit: 85, currencyCode: 'USD', currencySymbol: '<svg/onload=globalThis.pdfInjected=true>' };
const cash = { period: 'month', startDate: profit.startDate, endDate: profit.endDate, companyName,
  openingBalance: 10, currencyCode: '<svg/onload=globalThis.pdfInjected=true>', currencySymbol: '$',
  operatingActivities: { cashFromSales: 100, cashFromCustomers: 0, paymentToSuppliers: 10, paymentForExpenses: 5, otherOperatingCash: 0 },
  investingActivities: { saleOfAssets: 0, saleOfInvestments: 0, purchaseOfAssets: 0, purchaseOfInvestments: 0 },
  financingActivities: { loansReceived: 0, capitalContributed: 0, loanRepayments: 0, dividendsPaid: 0, ownerWithdrawals: 0 } };

test('financial exports keep hostile names, categories, analysis and currencies as inert text', async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    for (const [kind, html] of [['profit', generateProfitLossHTML(profit, assets, 'en')], ['cash', generateCashFlowHTML(cash, assets, 'en')]]) {
      await page.setContent('<html><body></body></html>');
      // Use the same parse/reinsert boundary as downloadMobilePdf.
      await page.evaluate(html => {
        globalThis.pdfInjected = false;
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const element = document.createElement('div');
        element.insertAdjacentHTML('beforeend', parsed.body.innerHTML);
        document.body.appendChild(element);
      }, html);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => globalThis.pdfInjected), false, `${kind}: script executed`);
      assert.equal(await page.locator('[onerror], [onload], script, iframe, svg').count(), 0, `${kind}: active markup created`);
      assert.equal(await page.locator('.company-name').first().textContent(), companyName);
      assert.ok((await page.locator('body').textContent()).includes('85'), `${kind}: legitimate amounts remain`);
    }
  } finally { await browser.close(); }
});
