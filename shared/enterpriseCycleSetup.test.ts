import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countCompletedEnterprisePondSetups,
  createEnterprisePondSetupValues,
  isEnterprisePondSetupComplete,
  parseEnterprisePondDensity,
} from './enterpriseCycleSetup.ts';

test('requires a positive density and supplier for every pond in a block', () => {
  const values = createEnterprisePondSetupValues(['pond-1', 'pond-2']);
  values['pond-1'] = { density: '120', supplier: 'Hatchery A' };
  values['pond-2'] = { density: '0', supplier: 'Hatchery B' };

  assert.equal(isEnterprisePondSetupComplete(values['pond-1']), true);
  assert.equal(isEnterprisePondSetupComplete(values['pond-2']), false);
  assert.equal(countCompletedEnterprisePondSetups(['pond-1', 'pond-2'], values), 1);
});

test('accepts comma decimal density input', () => {
  assert.equal(parseEnterprisePondDensity('12,5'), 12.5);
});

test('requires a current MBW when an enterprise pond imports an existing cycle', () => {
  const values = createEnterprisePondSetupValues(['pond-1']);
  values['pond-1'] = { density: '120', supplier: 'Hatchery A' };

  assert.equal(isEnterprisePondSetupComplete(values['pond-1'], 'new'), true);
  assert.equal(isEnterprisePondSetupComplete(values['pond-1'], 'midcycle'), false);

  values['pond-1'].baselineMbw = '8.5';
  assert.equal(isEnterprisePondSetupComplete(values['pond-1'], 'midcycle'), true);
});
