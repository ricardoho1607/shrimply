import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(path, 'utf8');

test('checks Google Play before applying a compatible OTA update', () => {
  const manager = readSource('app/components/StartupUpdateManager.tsx');
  const storeCheckIndex = manager.indexOf('await checkForUpdate()');
  const otaCheckIndex = manager.indexOf('await Updates.checkForUpdateAsync()');

  assert.ok(storeCheckIndex >= 0);
  assert.ok(otaCheckIndex > storeCheckIndex);
  assert.match(manager, /if \(storeUpdate\.updateAvailable\)/);
});

test('shows mandatory custom copy and opens the Shrimply Google Play listing', () => {
  const manager = readSource('app/components/StartupUpdateManager.tsx');
  const rootLayout = readSource('app/_layout.tsx');

  assert.match(manager, /A better Shrimply is ready/);
  assert.match(manager, /Please update now to continue/);
  assert.match(manager, /onRequestClose=\{\(\) => undefined\}/);
  assert.doesNotMatch(manager, /Maybe later/);
  assert.match(manager, /market:\/\/details\?id=/);
  assert.match(rootLayout, /<StartupUpdateManager \/>/);
});
