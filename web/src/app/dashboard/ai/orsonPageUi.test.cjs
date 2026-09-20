const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pagePath = path.join(__dirname, 'page.tsx');
const cssPath = path.join(__dirname, '../../globals.css');
const page = fs.readFileSync(pagePath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

test('Orson removes extra iconography and the analyzed ponds panel', () => {
  assert.doesNotMatch(page, /DashboardIcon|orson-logo|orson-side|Analyzed ponds|suggestedPrompts|Suggested queries|<Shrimp\b|MessageSquare|TrendingUp/);
});

test('assistant messages are background-first while user messages retain the bubble treatment', () => {
  assert.match(css, /\.orson-bubble\s*\{[\s\S]*?padding:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.match(css, /\.orson-message-row\.is-user \.orson-bubble\s*\{[\s\S]*?padding:\s*14px 16px;[\s\S]*?background:\s*var\(--primary\);/);
});
