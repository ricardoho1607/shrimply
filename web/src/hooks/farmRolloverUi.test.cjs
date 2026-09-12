const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const srcRoot = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(srcRoot, file), 'utf8');

test('web DOC surfaces refresh at the 3am farm boundary', () => {
  for (const file of [
    'app/dashboard/page.tsx',
    'app/dashboard/ponds/page.tsx',
    'app/dashboard/ponds/detail/PondDetailClient.tsx',
    'app/dashboard/projections/page.tsx',
  ]) {
    assert.match(
      read(file),
      /useFarmDateKey\([^\n]+FARM_OPERATIONAL_DAY_ROLLOVER_HOUR\)/,
      `${file} must refresh at the operational boundary`,
    );
  }
});

test('settings explains the shared 3am DOC and Orson reset', () => {
  assert.match(
    read('app/dashboard/settings/page.tsx'),
    /DOC and daily Orson limits roll over together at 3:00 AM/,
  );
});
