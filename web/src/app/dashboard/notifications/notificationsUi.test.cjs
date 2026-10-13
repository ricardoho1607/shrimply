const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, 'NotificationsPage.module.css'), 'utf8');

test('notifications use one dashboard summary panel for filter metrics', () => {
  assert.match(source, /className={`glass-card dashboard-summary-panel \${styles\.metricGrid}`}/);
  assert.match(source, /className={`dashboard-summary-item \${styles\.metricCard}`}/);
  assert.match(source, /aria-pressed={filter === 'all'}/);
  assert.doesNotMatch(source, /metricCardStyle/);
  assert.doesNotMatch(source, /var\(--gradient\)/);
  assert.match(styles, /\.metricCard\[data-active='true'\]\s*{[\s\S]*?background:\s*var\(--primary-dim\);/);
  assert.match(styles, /@media \(max-width: 1023px\)[\s\S]*?\.metricGrid\s*{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/);
});

test('unread notification rows use a light blue outline without a side accent', () => {
  assert.doesNotMatch(source, /borderLeft:/);
  assert.match(source, /border: notification\.read \? '1px solid var\(--border\)' : '2px solid #BBE1FA'/);
});

test('notification controls use contained hover and active highlights', () => {
  assert.match(styles, /\.metricGrid\s*{[\s\S]*?padding:\s*4px;[\s\S]*?gap:\s*2px;/);
  assert.match(styles, /\.metricCard\s*{[\s\S]*?border-radius:\s*12px;[\s\S]*?text-align:\s*center;/);
  assert.match(styles, /\.metricCard \+ \.metricCard\s*{[\s\S]*?border-left:\s*0;/);
  assert.match(styles, /\.metricCard:nth-child\(n \+ 3\)\s*{[\s\S]*?border-top:\s*0;/);
  assert.doesNotMatch(source, /borderBottom:\s*filter ===/);
  assert.match(styles, /\.filterTabs button:hover\s*{[\s\S]*?background:\s*var\(--bg-mid\) !important;/);
  assert.match(styles, /\.bulkActions button:not\(:disabled\):hover\s*{[\s\S]*?background:\s*var\(--bg-mid\) !important;/);
});

test('notification rows omit category icons and keep timestamps beside titles', () => {
  assert.doesNotMatch(source, /const NotificationIcon/);
  assert.doesNotMatch(source, /<NotificationIcon/);
  assert.match(source, /className={styles\.notificationTime}/);
  assert.match(styles, /\.notificationHeading\s*{[\s\S]*?gap:\s*8px;/);
  assert.match(styles, /\.notificationTime\s*{[\s\S]*?flex:\s*0 0 auto;/);
});

test('notification filters scroll and row actions remain available on phones', () => {
  assert.match(source, /className={styles\.filterTabs}/);
  assert.match(styles, /\.filterTabs\s*{[\s\S]*?overflow-x:\s*auto;/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.notificationActions\s*{[\s\S]*?opacity:\s*1 !important;/);
});

test('notification history is paginated and bulk actions still cover the full query', () => {
  const hook = fs.readFileSync(path.join(__dirname, '../../../hooks/useDashboardData.ts'), 'utf8');
  assert.match(hook, /HISTORY_PAGE_SIZE = 50/);
  assert.match(hook, /startAfter\(session\.cursor\)/);
  assert.match(source, /Load older notifications/);
  assert.match(source, /snapshot\.docs\.length; index \+= 400/);
});

test('high-priority totals include compound Orson weather and low-DO alerts', () => {
  assert.match(source, /getEffectiveNotificationPriority\(n\) === 'high'/);
});

test('buyer dashboard requests only active marketplace listings', () => {
  const hook = fs.readFileSync(path.join(__dirname, '../../../hooks/useDashboardData.ts'), 'utf8');
  assert.match(hook, /useMarketplaceListings[\s\S]*?where\('status', '==', 'active'\)/);
});
