const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const dashboardRoot = path.resolve(__dirname);

const readTree = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTree(entryPath);
    return entry.name.endsWith('.tsx') ? [fs.readFileSync(entryPath, 'utf8')] : [];
  })
  .join('\n');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('Indonesian dashboard copy is not bypassed by hard-coded English UI text', () => {
  const source = readTree(dashboardRoot);
  const leakedCopy = [
    'Treatment Mixes',
    'Current cycle',
    'Financial Health',
    'No company profile found',
    'Shrimp Production Audit',
    'Custom date range',
    'Search assets by name or serial number...',
    'Stock Status Alerts',
    'No treatment mixes yet',
    'Visible Results',
    'Total alerts',
    'Add your first pond',
    'New Parameter Log',
    'Aquaculture assistant',
  ];

  const failures = leakedCopy.filter((text) => {
    const escaped = escapeRegExp(text);
    const bypassesCopy = new RegExp(`>\\s*${escaped}\\s*<`).test(source)
      || new RegExp(`(?:aria-label|title|placeholder)=["']${escaped}["']`).test(source);
    return bypassesCopy || !source.includes(`copy('${text}')`);
  });

  assert.deepEqual(failures, [], `Dashboard copy bypassed localization: ${failures.join(', ')}`);
});
