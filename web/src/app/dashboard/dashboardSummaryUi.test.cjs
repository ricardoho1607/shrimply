const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

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
