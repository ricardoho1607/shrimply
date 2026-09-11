import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(path, 'utf8');

test('enterprise mobile add menu reuses the existing sampling and mortality entry handlers', () => {
  const dashboard = readSource('app/(tabs)/index.tsx');
  const enterpriseDashboard = readSource('app/components/enterprise/EnterpriseCycleDashboard.tsx');

  assert.match(dashboard, /onAddSampling=\{\(\) => openModal\('sampling'\)\}/);
  assert.match(dashboard, /onAddMortality=\{\(\) => openModal\('mortality'\)\}/);
  assert.match(enterpriseDashboard, /onPress=\{\(\) => \{ setAddMenuVisible\(false\); onAddSampling\(\); \}\}/);
  assert.match(enterpriseDashboard, /onPress=\{\(\) => \{ setAddMenuVisible\(false\); onAddMortality\(\); \}\}/);
});

test('enterprise web add menu opens existing pond operations without changing sampling persistence', () => {
  const enterpriseDashboard = readSource('web/src/components/EnterpriseCycleDashboard.tsx');
  const pondDetail = readSource('web/src/app/dashboard/ponds/detail/PondDetailClient.tsx');

  assert.match(enterpriseDashboard, /setOperationAction\('sampling'\)/);
  assert.match(enterpriseDashboard, /setOperationAction\('mortality'\)/);
  assert.match(enterpriseDashboard, /action=\$\{operationAction\}/);
  assert.match(pondDetail, /requestedAction === 'sampling'/);
  assert.match(pondDetail, /requestedAction === 'mortality'/);
  assert.match(pondDetail, /mortalityRecords: arrayUnion\(newRecord\)/);
  assert.match(pondDetail, /transaction\.update\(reference, \{ samplings: updatedSamplings/);
});
