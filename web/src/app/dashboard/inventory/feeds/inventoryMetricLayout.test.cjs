const assert = require('node:assert/strict');
const { readFeatureSource } = require('../../../../../../scripts/read-feature-source.cjs');
const path = require('node:path');
const test = require('node:test');

const stylesheet = readFeatureSource(path.join(__dirname, 'InventoryFeeds.module.css'));
const source = readFeatureSource(path.join(__dirname, 'page.tsx'));

test('inventory currency metrics stay on one line with a wider value column', () => {
  assert.match(stylesheet, /grid-template-columns:\s*minmax\(0, 0\.85fr\)\s+minmax\(0, 1fr\)\s+minmax\(0, 1\.25fr\)/);
  assert.match(stylesheet, /\.inventoryMetricValue\s*\{[^}]*white-space:\s*nowrap;/s);
});

test('inventory metrics reflow safely on narrow cards', () => {
  assert.match(stylesheet, /@media \(max-width: 480px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(stylesheet, /\.inventoryMetric:last-child\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
});

test('inventory cards keep header and actions compact without decorative icons', () => {
  assert.match(source, /className=\{styles\.inventoryCardHeader\}/);
  assert.match(source, /className=\{styles\.inventoryCardActions\}/);
  assert.match(source, /copy\('History'\)/);
  assert.match(source, /copy\('Delete'\)/);
  assert.match(source, /copy\(activeTab === 'additive' \? 'Product' : 'Threshold'\)/);
  const cardSection = source.match(/className=\{styles\.inventoryCardHeader\}[\s\S]*?className=\{styles\.inventoryCardActions\}[\s\S]*?<\/div>\s*\)\}\s*<\/div>/);
  assert.ok(cardSection, 'inventory card section should exist');
  assert.doesNotMatch(cardSection[0], /<History size=/);
  assert.doesNotMatch(cardSection[0], /<Trash2 size=/);
  assert.match(stylesheet, /\.inventoryCardActions\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/s);
});

test('inventory card details use consistent rows without pushing metrics out of alignment', () => {
  assert.match(stylesheet, /\.inventoryCardIdentity h3\s*\{[^}]*white-space:\s*nowrap;[^}]*text-overflow:\s*ellipsis;/s);
  assert.match(stylesheet, /\.inventoryCardMeta\s*\{[^}]*display:\s*grid;[^}]*align-items:\s*start;/s);
  assert.match(stylesheet, /\.inventoryCardMeta > span:first-child\s*\{[^}]*white-space:\s*nowrap;[^}]*text-overflow:\s*ellipsis;/s);
  assert.match(stylesheet, /\.inventoryCardCategory\s*\{[^}]*width:\s*max-content;[^}]*max-width:\s*100%;/s);
});

test('inventory dashboard uses one input popover for all create actions', () => {
  assert.match(source, /aria-label=\{copy\('Add inventory input'\)\}/);
  assert.match(source, /role="menu"[^>]*className="pond-detail-record-popover inventory-input-popover"/);
  assert.match(source, /copy\('Treatment Mixes'\)/);
  assert.match(source, /\{t\.inventory\.addFeed\}/);
  assert.match(source, /\{t\.inventory\.addAdditive\}/);
});

test('inventory dashboard navigation and metrics use compact equal rows', () => {
  assert.match(source, /className="inventory-section-tabs"/);
  assert.match(source, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(source, /className="glass-card inventory-summary-bar"/);
  assert.match(source, /gridTemplateColumns: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.doesNotMatch(source, /<metric\.icon/);
});

test('dashboard alerts and recent transactions keep compact icon-free headings', () => {
  assert.doesNotMatch(source, /Optimal Stock Levels/);
  assert.match(source, /<h2 className="inventory-section-heading">\{copy\('Stock Status Alerts'\)\}<\/h2>/);
  assert.match(source, /<h2 className="inventory-section-heading">\{copy\('Recent Transactions'\)\}<\/h2>/);
  assert.match(source, /className="inventory-alert-count"/);
});

test('transaction direction is selected from a sort popover', () => {
  assert.match(source, /aria-label=\{copy\('Filter transactions'\)\}/);
  assert.match(source, /<ArrowUpDown size=\{17\}/);
  assert.match(source, /className="pond-detail-record-popover inventory-filter-popover"/);
  assert.match(source, /All transactions/);
  assert.match(source, /Stock in/);
  assert.match(source, /Stock out/);
});

test('inventory input actions open the shared compact modal treatment', () => {
  assert.match(source, /className="glass-card responsive-modal animate-fade-up inventory-modal"/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /aria-label=\{copy\('Close inventory dialog'\)\}/);
  assert.match(source, /className="responsive-modal-footer inventory-modal-footer"/);
  assert.match(source, /\.inventory-modal-footer\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.doesNotMatch(source, /modalType === 'add' \? <Plus/);
  assert.match(source, /`\$\{copy\('Add'\)\} \$\{copy\(itemType === 'feed' \? 'Feed' : 'Additive'\)\}`/);
});

test('inventory create form stays compact with constrained dropdown choices', () => {
  assert.match(source, /const FEED_CATEGORIES = \['Starter', 'Grower', 'Finisher', 'Other'\]/);
  assert.match(source, /aria-label=\{copy\('Inventory classification'\)\}/);
  assert.match(source, /className="responsive-form-grid inventory-add-details"/);
  assert.match(source, /className="responsive-form-grid inventory-stock-details"/);
  assert.match(source, /className="inventory-full-row"/);
  assert.match(source, /maxWidth: modalType === 'history' \? '920px' : '560px'/);
  assert.match(source, /\.inventory-add-details,[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important;/);
});

test('inventory stock intake records the selected arrival date without batch fields', () => {
  assert.match(source, /type="date"[^>]*value=\{formData\.stockDate\}/);
  assert.match(source, /const stockDate = formData\.stockDate/);
  assert.doesNotMatch(source, /formData\.batch|Batch Number|Lot\/Batch/);
});

test('usage display helper normalizes positive and negative stored usage to one negative magnitude', () => {
  const ts = require('typescript');

  const helperMatch = source.match(/(function formatUsageDisplay[\s\S]*?\n\})/);
  assert.ok(helperMatch, 'formatUsageDisplay should be declared in page.tsx');
  const compiled = ts.transpileModule(
    `const formatQuantity = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);\n${helperMatch[1]}\nmodule.exports = { formatUsageDisplay };`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
  ).outputText;
  const helperModule = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(helperModule, helperModule.exports, require);
  const { formatUsageDisplay } = helperModule.exports;

  assert.equal(formatUsageDisplay(25), '-25');
  assert.equal(formatUsageDisplay(-25), '-25');
  assert.equal(formatUsageDisplay('14.2'), '-14.2');
  assert.equal(formatUsageDisplay('-14.2'), '-14.2');
  assert.equal(formatUsageDisplay(0), '-0');

  assert.match(source, /\{tx\.type === 'Stock In' \? `\+\$\{formatQuantity\(tx\.quantity\)\}` : formatUsageDisplay\(tx\.quantity\)\}/);
  assert.match(source, /<strong className=\{styles\.historyQuantity\}>\{formatUsageDisplay\(h\.quantity\)\} \{historyItem\.unit\}<\/strong>/);
});

test('stock-in display preserves raw quantity without changing signs or arithmetic', () => {
  assert.match(source, /\+\{formatQuantity\(h\.quantity\)\} \{historyItem\.unit\}/);
});
