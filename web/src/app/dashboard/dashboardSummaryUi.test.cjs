const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const homeStyles = fs.readFileSync(path.join(__dirname, 'DashboardHome.module.css'), 'utf8');

test('dashboard KPI summary prioritizes labels and values without decorative icons', () => {
  const summary = source.slice(source.indexOf('{/* Summary Row */}'), source.indexOf('<section className="glass-card animate-fade-up animate-delay-2'));

  assert.doesNotMatch(summary, /dashboard-summary-icon/);
  assert.doesNotMatch(summary, /icon:\s*(Scale|TrendingUp|Users|Waves)/);
  assert.match(summary, /dashboard-summary-label/);
  assert.match(summary, /dashboard-summary-value/);
});

test('farm health reports dissolved oxygen instead of temperature', () => {
  assert.match(source, /label: 'DO'/);
  assert.match(source, /\.dissolvedOxygen/);
  assert.match(source, /average\.toFixed\(1\).*mg\/L/);
  assert.doesNotMatch(source, /label: 'Temperature'/);
});

test('new farms receive a dashboard onboarding path to pond setup', () => {
  assert.match(source, /activePonds\.length === 0/);
  assert.match(source, /Add your first pond/);
  assert.match(source, /href="\/dashboard\/ponds"/);
});

test('mobile pond list constrains long pond names to their grid column', () => {
  assert.match(source, /className={`dashboard-list-pond \$\{styles\.listPondCell\}`}/);
  assert.match(homeStyles, /\.listPondCell\s*{[\s\S]*width:\s*100%;[\s\S]*overflow:\s*hidden;/);
});

test('pond cards show the latest feed response for today instead of a blank completion label', () => {
  assert.match(source, /getLatestFeedResponseForDate/);
  assert.match(source, /todayFeedResponse \? copy\(todayFeedResponse\)\.toUpperCase\(\) : copy\('COMPLETED'\)/);
});

test('pond cards show deterministic pond risk beside posted status', () => {
  assert.match(source, /getEnterprisePondStatus/);
  assert.match(source, /pondStatus\.risk === 'high-risk'/);
  assert.match(source, /HIGH RISK/);
  assert.match(source, /WARNING/);
});
