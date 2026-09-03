import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countCompletedEnterprisePondSetups,
  createEnterprisePondSetupValues,
  getEnterpriseStockingDateRange,
  isEnterprisePondSetupComplete,
  parseEnterprisePondDensity,
} from './enterpriseCycleSetup.ts';

test('requires a positive density and supplier for every pond in a block', () => {
  const values = createEnterprisePondSetupValues(['pond-1', 'pond-2'], '2026-07-20');
  values['pond-1'] = { stockingDate: '2026-07-20', density: '120', supplier: 'Hatchery A' };
  values['pond-2'] = { stockingDate: '2026-07-24', density: '0', supplier: 'Hatchery B' };

  assert.equal(isEnterprisePondSetupComplete(values['pond-1']), true);
  assert.equal(isEnterprisePondSetupComplete(values['pond-2']), false);
  assert.equal(countCompletedEnterprisePondSetups(['pond-1', 'pond-2'], values), 1);
});

test('accepts comma decimal density input', () => {
  assert.equal(parseEnterprisePondDensity('12,5'), 12.5);
});

test('requires a current MBW when an enterprise pond imports an existing cycle', () => {
  const values = createEnterprisePondSetupValues(['pond-1'], '2026-07-20');
  values['pond-1'] = { stockingDate: '2026-07-20', density: '120', supplier: 'Hatchery A' };

  assert.equal(isEnterprisePondSetupComplete(values['pond-1'], 'new'), true);
  assert.equal(isEnterprisePondSetupComplete(values['pond-1'], 'midcycle'), false);

  values['pond-1'].baselineMbw = '8.5';
  assert.equal(isEnterprisePondSetupComplete(values['pond-1'], 'midcycle'), true);
});

test('keeps each pond stocking date and returns the cycle date range', () => {
  const values = createEnterprisePondSetupValues(['pond-1', 'pond-2'], '2026-07-20');
  values['pond-2'].stockingDate = '2026-07-24';

  assert.equal(values['pond-1'].stockingDate, '2026-07-20');
  assert.equal(values['pond-2'].stockingDate, '2026-07-24');
  assert.deepEqual(getEnterpriseStockingDateRange(Object.values(values).map((value) => value.stockingDate)), {
    stockingStartDate: '2026-07-20',
    stockingEndDate: '2026-07-24',
  });
});

test('does not mark a pond ready without its own stocking date', () => {
  assert.equal(isEnterprisePondSetupComplete({ stockingDate: '', density: '120', supplier: 'Hatchery A' }), false);
});
