import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(path, 'utf8');

test('core Firebase synchronization has one root owner and passive screen consumers', () => {
  const rootLayout = readSource('app/_layout.tsx');
  const syncHook = readSource('app/hooks/useFirebaseSync.ts');
  const dashboard = readSource('app/(tabs)/index.tsx');
  const cycleReport = readSource('app/cycle-report.tsx');

  assert.match(rootLayout, /<FirebaseSyncProvider>/);
  assert.equal((syncHook.match(/useFirebaseSyncController\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(dashboard, /useFirebaseSync\s*\(/);
  assert.doesNotMatch(cycleReport, /useFirebaseSync\s*\(/);
});
