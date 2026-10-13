const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../../../scripts/register-typescript.cjs');
const { generateProfitLossHTML } = require('./generated/mobileProfitLossReport.ts');
const fixture = { period: 'month', startDate: '2026-09-01', endDate: '2026-09-30', companyName: 'Fixture Company', totalRevenue: 100000, revenueBreakdown: { Sales: 100000 }, totalCOGS: 1000, cogsBreakdown: { Feed: 1000 }, grossProfit: 99000, totalOPEX: 600, opexBreakdown: {}, operatingIncome: 98400, totalOtherExpenses: 0, otherExpenseBreakdown: {}, netProfit: 98400, currencyCode: 'USD', currencySymbol: '$' };
for (const ios of [false, true]) test(`P&L retains all 60 categories and brands every page (iOS=${ios})`, () => {
  const data = { ...fixture, opexBreakdown: Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`Expense-${String(i).padStart(3, '0')}`, 10])) };
  const html = generateProfitLossHTML(data, { backgroundBase64: 'background', logoBase64: 'logo' }, 'en', ios);
  const pages = html.split('<div class="pdf-page">').slice(1);
  assert.ok(pages.length > 2);
  for (const name of Object.keys(data.opexBreakdown)) assert.equal(html.split(`<span>${name}</span>`).length - 1, 1);
  for (const page of pages) {
    assert.match(page, /class="page-bg" src="data:image\/png;base64,background"/);
    assert.match(page, /class="company-name">Fixture Company/);
    assert.match(page, /class="footer"/);
  }
  assert.equal(html.split('<span>Total Operating Expenses</span>').length - 1, 1);
  assert.match(html, /Net Income/);
  assert.match(html, /Risk Assessment/);
});
module.exports = { fixture };
test('long category names and analysis span pages without empty continuation pages', () => {
  const name = 'Long production category '.repeat(60);
  const html = generateProfitLossHTML({ ...fixture, opexBreakdown: { [name]: 600 } }, { backgroundBase64: '', logoBase64: '' }, 'en');
  const blocks = [...html.matchAll(/<div class="report-blocks">([\s\S]*?)<\/div>\s*<div class="footer">/g)].map(match => match[1]);
  assert.ok(blocks.length > 2);
  for (const block of blocks) {
    assert.match(block, /class="(?:report-row|analysis-line)/);
    const height = (block.match(/class="report-row /g) || []).length * 32
      + (block.match(/class="report-heading"/g) || []).length * 32
      + (block.match(/class="analysis-line"/g) || []).length * 24
      + (block.match(/class="analysis-gap"/g) || []).length * 8;
    assert.ok(height <= 480, `content budget exceeded: ${height}`);
  }
  const categories = [...html.matchAll(/<div class="report-row category"><span>(.*?)<\/span>/g)].map(match => match[1]).join('');
  assert.ok(categories.includes(name));
});
