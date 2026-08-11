import assert from 'node:assert/strict';
import test from 'node:test';
import { createFirebaseSyncListenerOwner } from '../app/hooks/firebaseSyncListenerOwner.ts';

test('keeps one listener set for the active company', () => {
  const owner = createFirebaseSyncListenerOwner();
  let attachCount = 0;

  const attach = () => {
    attachCount += 1;
    return [() => undefined];
  };

  assert.equal(owner.start('company-a', attach), true);
  assert.equal(owner.start('company-a', attach), false);
  assert.equal(attachCount, 1);
  assert.equal(owner.getActiveCompanyId(), 'company-a');
});

test('cleans the previous company before attaching the next company', () => {
  const owner = createFirebaseSyncListenerOwner();
  const events: string[] = [];

  owner.start('company-a', () => [
    () => events.push('cleanup-a-ponds'),
    () => events.push('cleanup-a-cycles'),
  ]);
  owner.start('company-b', () => {
    events.push('attach-b');
    return [() => events.push('cleanup-b')];
  });

  assert.deepEqual(events, ['cleanup-a-ponds', 'cleanup-a-cycles', 'attach-b']);
  assert.equal(owner.getActiveCompanyId(), 'company-b');
});

test('sign-out cleanup runs each unsubscribe exactly once', () => {
  const owner = createFirebaseSyncListenerOwner();
  let cleanupCount = 0;

  owner.start('company-a', () => Array.from({ length: 4 }, () => () => {
    cleanupCount += 1;
  }));

  assert.equal(owner.stop('company-a'), true);
  assert.equal(owner.stop('company-a'), false);
  assert.equal(cleanupCount, 4);
  assert.equal(owner.getActiveCompanyId(), null);
});

test('a stale cleanup cannot stop a newer company listener set', () => {
  const owner = createFirebaseSyncListenerOwner();
  let companyBCleanupCount = 0;

  owner.start('company-a', () => [() => undefined]);
  owner.start('company-b', () => [() => {
    companyBCleanupCount += 1;
  }]);

  assert.equal(owner.stop('company-a'), false);
  assert.equal(owner.getActiveCompanyId(), 'company-b');
  assert.equal(companyBCleanupCount, 0);
});
