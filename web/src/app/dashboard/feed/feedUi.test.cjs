const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');
const mobileSource = fs.readFileSync(path.join(__dirname, '../../../../../app/(tabs)/feed.tsx'), 'utf8');
const sharedCalculations = fs.readFileSync(path.join(__dirname, '../../../../../shared/pondCalculations.ts'), 'utf8');

test('feed overview uses the compact authenticated layout', () => {
  assert.match(source, /className="dashboard-page feed-page"/);
  assert.match(source, /className="glass-card dashboard-toolbar-card feed-toolbar/);
  assert.match(source, /className="feed-pond-grid"/);
  assert.match(source, /className="glass-card feed-pond-card/);
});

test('feed controls have hover and mobile responsive states', () => {
  assert.match(styles, /\.feed-history-button:hover/);
  assert.match(styles, /\.feed-quick-entry:hover/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.feed-pond-grid/);
});

test('feed entry and history surfaces use compact authenticated styling', () => {
  assert.match(source, /className="responsive-side-drawer feed-history-drawer"/);
  assert.match(source, /className="glass-card animate-fade-up responsive-modal feed-log-modal"/);
  assert.match(source, /className="feed-save-button"/);
  assert.match(styles, /\.feed-save-button\s*\{[\s\S]*background:\s*var\(--primary\)/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.feed-log-grid/);
});

test('mobile feed history remains a narrow drawer instead of covering the page', () => {
  assert.match(styles, /\.feed-history-drawer\s*\{[\s\S]*?width:\s*min\(300px, 78vw\) !important;[\s\S]*?max-width:\s*78vw !important;/);
});

test('feed history drawer closes only when its backdrop is clicked', () => {
  assert.match(source, /const handleHistoryBackdropClick = \(event: React\.MouseEvent<HTMLDivElement>\)/);
  assert.match(source, /event\.target !== event\.currentTarget/);
  assert.match(source, /className="responsive-side-drawer-overlay feed-history-overlay" onClick=\{handleHistoryBackdropClick\}/);
});

test('feed deletion confirmation stays above history, and closing history clears its pending deletion', () => {
  const historyLayer = source.match(/className="responsive-side-drawer-overlay feed-history-overlay"[^>]*zIndex:\s*(\d+)/);
  const confirmationLayer = source.match(/className="responsive-modal-overlay dashboard-confirm-overlay"[^>]*zIndex:\s*(\d+)/);
  assert.ok(historyLayer && confirmationLayer);
  assert.ok(Number(confirmationLayer[1]) > Number(historyLayer[1]), 'Delete and cancel must remain reachable above history');
  const closeHistory = source.slice(source.indexOf('const closeHistoryDrawer ='), source.indexOf('const handleHistoryBackdropClick ='));
  assert.match(closeHistory, /setDeletingFeedRecord\(null\)/, 'A pending deletion must not reopen for a different pond');
});

test('phone feed history header stays below device navigation and status areas', () => {
  assert.match(source, /className="responsive-side-drawer-overlay feed-history-overlay"[\s\S]*?style=\{\{ zIndex: 9100 \}\}/);
  assert.match(source, /className="responsive-side-drawer feed-history-drawer"[\s\S]*?style=\{\{ paddingTop: 0 \}\}/);
  assert.match(source, /<style jsx global>[\s\S]*?\.dashboard-saas \.feed-history-header\s*{[\s\S]*?padding-top:\s*calc\(12px \+ var\(--safe-area-top\)\) !important;/);
});

test('feeding response is required on web, persisted, and shown beside daily feed on web and mobile', () => {
  assert.match(sharedCalculations, /FEEDING_RESPONSE_VALUES = \['strong', 'normal', 'weak'\]/);
  assert.match(source, /if \(!formData\.feedingResponse\)/);
  assert.match(source, /feedingResponse: formData\.feedingResponse/);
  assert.match(source, /className="feed-pond-response"/);
  assert.match(source, /role="radiogroup"/);
  assert.match(source, /feedingResponse: response/);
  assert.match(mobileSource, /feedingResponse,/);
  assert.match(mobileSource, /style=\{styles\.cardMetricsRow\}/);
  assert.match(mobileSource, /setFeedingResponse\(selected \? null : response\)/);
});

test('inventory quantities are formatted for display without changing stock math', () => {
  assert.match(source, /formatFeedQuantityForDisplay\(feed\.totalStock\)/);
  assert.doesNotMatch(source, /\{feed\.totalStock \|\| 0\} \{feed\.unit \|\| 'kg'\}/);
});

test('page module does not export helpers as named exports', () => {
  assert.doesNotMatch(source, /export\s+(const|function|let|var)\s+isFeedStocked/);
});

test('production feed helpers correctly filter and allocate feeds across all lifecycle states', () => {
  const ts = require('typescript');

  const helperMatch = source.match(
    /(function isFeedStocked[\s\S]*?function getSelectableFeedOptions[\s\S]*?\n\})/
  );
  assert.ok(helperMatch, 'helper functions should be declared in page.tsx');
  const compiled = ts.transpileModule(
    `${helperMatch[1]}\nmodule.exports = { isFeedStocked, getUnusedStockedFeeds, getSelectableFeedOptions };`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
  ).outputText;
  const helpersModule = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(helpersModule, helpersModule.exports, require);
  const { isFeedStocked, getUnusedStockedFeeds, getSelectableFeedOptions } = helpersModule.exports;

  // 1. Stocked predicate checks
  assert.equal(isFeedStocked({ totalStock: 15 }), true);
  assert.equal(isFeedStocked({ totalStock: 0.5 }), true);
  assert.equal(isFeedStocked({ totalStock: '12' }), true);
  assert.equal(isFeedStocked({ totalStock: 0 }), false);
  assert.equal(isFeedStocked({ totalStock: -1 }), false);
  assert.equal(isFeedStocked({ totalStock: null }), false);
  assert.equal(isFeedStocked({ totalStock: undefined }), false);
  assert.equal(isFeedStocked({ totalStock: NaN }), false);
  assert.equal(isFeedStocked({ totalStock: Infinity }), false);
  assert.equal(isFeedStocked({ totalStock: -Infinity }), false);
  assert.equal(isFeedStocked({ totalStock: true }), false);
  assert.equal(isFeedStocked({ totalStock: false }), false);
  assert.equal(isFeedStocked({ totalStock: [12] }), false);
  assert.equal(isFeedStocked({ totalStock: {} }), false);
  assert.equal(isFeedStocked({ totalStock: '' }), false);
  assert.equal(isFeedStocked({ totalStock: '   ' }), false);

  // 2. zero-stock-first: zero stock at head of inventory is skipped
  const zeroStockFirstInventory = [
    { id: 'feed-depleted-first', totalStock: 0 },
    { id: 'feed-available-second', totalStock: 50 },
  ];
  const unusedFromZeroFirst = getUnusedStockedFeeds(zeroStockFirstInventory, []);
  assert.equal(unusedFromZeroFirst.length, 1);
  assert.equal(unusedFromZeroFirst[0].id, 'feed-available-second');

  // 3. no available stock: returns empty list
  const emptyStockInventory = [
    { id: 'feed-0', totalStock: 0 },
    { id: 'feed-neg', totalStock: -10 },
    { id: 'feed-missing' },
  ];
  assert.deepEqual(getUnusedStockedFeeds(emptyStockInventory, []), []);

  // 4. duplicate exclusion: already allocated feeds cannot be re-added
  const activeInventory = [
    { id: 'feed-a', totalStock: 100 },
    { id: 'feed-b', totalStock: 80 },
    { id: 'feed-c', totalStock: 60 },
  ];
  const unusedAfterA = getUnusedStockedFeeds(activeInventory, ['feed-a']);
  assert.deepEqual(unusedAfterA.map((f) => f.id), ['feed-b', 'feed-c']);

  // 5. historical selected depleted feed: stays selectable, other depleted items excluded
  const inventoryWithHistory = [
    { id: 'historical-depleted', totalStock: 0 },
    { id: 'other-depleted', totalStock: 0 },
    { id: 'fresh-available', totalStock: 45 },
  ];
  const selectableForHistoryRow = getSelectableFeedOptions(
    inventoryWithHistory,
    'historical-depleted',
    ['historical-depleted']
  );
  assert.deepEqual(selectableForHistoryRow.map((f) => f.id), ['historical-depleted', 'fresh-available']);
  assert.equal(selectableForHistoryRow.some((f) => f.id === 'other-depleted'), false);

  // 6. selection of an available feed: unused stocked feed can be selected
  const availableSelection = getUnusedStockedFeeds(inventoryWithHistory, ['historical-depleted']);
  assert.deepEqual(availableSelection.map((f) => f.id), ['fresh-available']);
});

test('UI wiring connects helpers and disables Add Feed with clear guidance', () => {
  assert.match(source, /getUnusedStockedFeeds\(inventoryFeeds,\s*allocatedFeedIds\)/);
  assert.match(source, /getSelectableFeedOptions\(inventoryFeeds,\s*allocation\.inventoryFeedId,\s*allocatedFeedIds\)/);
  assert.match(source, /disabled=\{savePending \|\| !hasUnusedStockedFeed\}/);
  assert.match(source, /availableStockedFeeds\.length === 0\s*\?\s*t\.feed\.noFeedsAvailable\s*:\s*t\.feed\.selectFeedFirst/);
  assert.match(source, /!hasUnusedStockedFeed && \(/);
  assert.match(source, /All stocked feeds have been added/);
});
