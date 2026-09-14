const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'finance.tsx'), 'utf8');

test('mobile finance uses a dedicated translated workspace navigation', () => {
  assert.match(source, /label: t\.finance\?\.overview \|\| 'Overview'/);
  assert.match(source, /label: t\.finance\?\.revenues \|\| 'Revenue'/);
  assert.match(source, /label: t\.finance\?\.expenses \|\| 'Expenses'/);
  assert.match(source, /label: t\.sidebar\?\.financialReports \|\| 'Financial Reports'/);
  assert.match(source, /router\.push\('\/financial-reports'\)/);
});

test('mobile finance keeps the same data-backed overview, revenue, and expense views', () => {
  assert.match(source, /activeTab === 'overview'/);
  assert.match(source, /activeTab === 'expenses'/);
  assert.match(source, /activeTab === 'revenues'/);
  assert.match(source, /const \[expenses, setExpenses\] = useState<Expense\[]>/);
  assert.match(source, /const \[revenues, setRevenues\] = useState<Revenue\[]>/);
  assert.match(source, /financeService\.subscribe\(company\.id, setExpenses/);
  assert.match(source, /revenueService\.subscribe\(company\.id, setRevenues/);
});

test('mobile finance hides internal sync explanations and shortens ledger descriptions', () => {
  assert.match(source, /const conciseFinanceDescription/);
  assert.doesNotMatch(source, /styles\.ledgerNotes/);
  assert.doesNotMatch(source, /Auto-sync Inventory/);
  assert.doesNotMatch(source, /Auto-sync Harvest/);
  assert.doesNotMatch(source, />Auto<\/Text>/);
});
