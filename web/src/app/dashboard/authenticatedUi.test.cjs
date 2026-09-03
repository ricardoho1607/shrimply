const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const styles = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');
const layout = fs.readFileSync(path.join(__dirname, 'layout.tsx'), 'utf8');

const compactRoutes = [
  'admin/page.tsx',
  'ai/page.tsx',
  'company/page.tsx',
  'disease/page.tsx',
  'finance/page.tsx',
  'harvest/page.tsx',
  'inventory/assets/page.tsx',
  'inventory/feeds/page.tsx',
  'inventory/treatment-mixes/page.tsx',
  'marketplace/page.tsx',
  'notifications/page.tsx',
  'projections/page.tsx',
  'reports/cycles/page.tsx',
  'reports/financial/page.tsx',
  'reports/shrimp/page.tsx',
  'settings/page.tsx',
  'suppliers/page.tsx',
];

const businessRoutes = [
  'finance/page.tsx',
  'reports/financial/page.tsx',
  'reports/shrimp/page.tsx',
  'reports/cycles/page.tsx',
  'projections/page.tsx',
  'inventory/feeds/page.tsx',
  'inventory/treatment-mixes/page.tsx',
  'inventory/assets/page.tsx',
];

test('authenticated dashboard has a scoped compact UI layer', () => {
  assert.match(styles, /\.dashboard-saas \.glass-card/);
  assert.match(styles, /\.dashboard-saas \.responsive-modal/);
  assert.match(styles, /\.dashboard-saas \.dashboard-toolbar-card/);
  assert.match(styles, /\.dashboard-saas :where\(input, select, textarea\)/);
});

test('authenticated compact UI includes mobile overflow protection', () => {
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.dashboard-saas \.responsive-modal/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.dashboard-saas :where\(table/);
});

test('dashboard shell follows authenticated spacing and content width', () => {
  assert.match(layout, /padding: '16px 16px 32px'/);
  assert.match(layout, /maxWidth: '1232px'/);
  assert.match(layout, /calc\(12px \+ var\(--safe-area-right\)\)/);
});

test('dashboard form confirmation buttons use the solid navy primary color', () => {
  assert.match(layout, /\.dashboard-saas button\[type="submit"\]\.btn-primary\s*{[\s\S]*?background:\s*#0f4c75;/);
});

test('dashboard modal close controls use a square hover-only highlight', () => {
  assert.match(layout, /\.dashboard-saas \.responsive-modal-header > button,[\s\S]*?min-height:\s*40px !important;[\s\S]*?border-radius:\s*8px !important;[\s\S]*?background:\s*transparent !important;/);
  assert.match(layout, /\.dashboard-saas \.responsive-modal-header > button:hover,[\s\S]*?background:\s*var\(--bg-mid\) !important;/);
});

test('all enabled dashboard buttons receive a semantic hover highlight', () => {
  assert.match(layout, /\.dashboard-saas :where\(button, \[role="button"\]\):not\(:disabled\):not\(\.sidebar-backdrop\):not\(\.admin-inspector-backdrop\):hover\s*{[\s\S]*?outline:\s*2px solid color-mix\(in srgb, currentColor 24%, transparent\);/);
  assert.match(layout, /\.dashboard-saas \.btn-secondary:not\(:disabled\):hover,[\s\S]*?background:\s*var\(--bg-mid\) !important;/);
});

test('tablet navigation exposes an internal sidebar toggle', () => {
  assert.match(layout, /data-sidebar-toggle/);
  assert.match(layout, /aria-label=\{copy\('Close dashboard navigation'\)\}/);
  assert.match(layout, /onClick={toggleSidebar}/);
  assert.match(layout, /data-sidebar-toggle[\s\S]*?<PanelLeft size=\{18\} aria-hidden="true" \/>/);
  assert.doesNotMatch(layout, /PanelLeftClose/);
  assert.match(layout, /@media \(min-width: 1024px\)[\s\S]*?#dashboard-navigation \.sidebar-toggle\s*{[\s\S]*?display:\s*none !important;/);
  assert.match(layout, /const syncNavigationMode = \(\) => {[\s\S]*?if \(mediaQuery\.matches\)[\s\S]*?setSidebarOpen\(false\)/);
});

test('tablet navigation docks beside the main content instead of covering it', () => {
  assert.match(layout, /const \[isMobileNavigation, setMobileNavigation\] = useState\(false\)/);
  assert.match(layout, /const isOverlayNavigation = isSidebarOpen && isMobileNavigation/);
  assert.match(layout, /\{isOverlayNavigation && \(/);
  assert.match(layout, /aria-hidden=\{isOverlayNavigation \|\| undefined\}/);
  assert.match(layout, /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*?#dashboard-navigation\.sidebar\.mobile-open[\s\S]*?flex:\s*0 0 240px/);
});

test('mobile navigation backdrop stays full-screen and dismisses the sidebar', () => {
  assert.match(layout, /className="sidebar-backdrop"/);
  assert.match(layout, /button\[aria-label\^="Close"\]:not\(\.admin-inspector-backdrop\):not\(\.sidebar-backdrop\)/);
  assert.match(layout, /className="sidebar-backdrop"[\s\S]*?onClick=\{\(\) => setSidebarOpen\(false\)\}/);
  assert.match(layout, /position: 'fixed', inset: 0/);
});

test('business routes use the shared business UI layer', () => {
  assert.match(layout, /\.business-dashboard-page :where\(\.btn-primary, \.dashboard-action-primary\)[\s\S]*?background:\s*#0f4c75 !important;/);
  assert.match(layout, /@media \(max-width: 640px\)[\s\S]*?\.business-dashboard-page \.dashboard-action-row/);
  for (const route of businessRoutes) {
    const source = fs.readFileSync(path.join(__dirname, route), 'utf8');
    assert.match(source, /business-dashboard-page/, `${route} is missing the business UI class`);
  }
});

test('remaining authenticated routes opt into the compact UI standard', () => {
  for (const route of compactRoutes) {
    const source = fs.readFileSync(path.join(__dirname, route), 'utf8');
    assert.match(source, /authenticated-compact-page/, `${route} is missing the compact UI class`);
  }
});

test('dashboard date waits for the client so server and browser markup match', () => {
  assert.match(layout, /const \[todayLabel, setTodayLabel\] = useState\(''\)/);
  assert.match(layout, /setTodayLabel\(formatDashboardDate\(new Date\(\)\)\)/);
  assert.doesNotMatch(layout, /const todayLabel = new Intl\.DateTimeFormat/);
});

test('harvest projections live beside Orson instead of inside PDF reports', () => {
  const appServices = layout.slice(layout.indexOf('appServices: ['), layout.indexOf('business: ['));
  const reports = layout.slice(layout.indexOf("id: 'reports'"), layout.indexOf("id: 'inventory'"));
  assert.match(appServices, /\/dashboard\/ai[\s\S]*?\/dashboard\/projections/);
  assert.doesNotMatch(reports, /\/dashboard\/projections/);
});
