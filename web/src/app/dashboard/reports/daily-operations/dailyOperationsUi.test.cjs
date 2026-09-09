const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('daily report date selector matches authenticated report controls', () => {
  assert.match(source, /className="daily-operations-date-input"/);
  assert.match(source, /\.daily-operations-date-input\s*{[\s\S]*?height:\s*44px;/);
  assert.match(source, /\.daily-operations-date-input\s*{[\s\S]*?border:\s*1px solid var\(--border\);/);
  assert.match(source, /\.daily-operations-date-input:focus\s*{[\s\S]*?box-shadow:\s*0 0 0 3px rgba\(50, 130, 184, 0\.12\);/);
});

test('daily report follows the farm date until the user selects a different day', () => {
  assert.match(source, /const today = useFarmDateKey\(company\?\.timeZone\)/);
  assert.match(source, /current === previousToday\.current \? today : current/);
  assert.match(source, /timeZone: company\?\.timeZone/);
});

test('daily operations tables use Shrimply themed headers', () => {
  assert.match(source, /const headerCell = \{[\s\S]*?background: '#0F4C75'[\s\S]*?color: '#fff'/);
  assert.doesNotMatch(source, /background: '#fff4a8'/);
});

test('daily operations water table includes morning and evening columns for temperature, appearance, depth, and transparency', () => {
  assert.match(source, /copy\.temperatureMorning/);
  assert.match(source, /copy\.temperatureEvening/);
  assert.match(source, /copy\.waterAppearanceMorning/);
  assert.match(source, /copy\.waterAppearanceEvening/);
  assert.match(source, /copy\.waterDepthMorning/);
  assert.match(source, /copy\.waterDepthEvening/);
  assert.match(source, /copy\.transparencyMorning/);
  assert.match(source, /copy\.transparencyEvening/);

  assert.match(source, /row\.temperatureMorning/);
  assert.match(source, /row\.temperatureEvening/);
  assert.match(source, /row\.waterAppearanceMorning/);
  assert.match(source, /row\.waterAppearanceEvening/);
  assert.match(source, /row\.waterDepthCmMorning/);
  assert.match(source, /row\.waterDepthCmEvening/);
  assert.match(source, /row\.transparencyMorning/);
  assert.match(source, /row\.transparencyEvening/);
});
