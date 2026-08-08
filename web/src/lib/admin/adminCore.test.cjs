/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');

const core = require('/tmp/shrimply-admin-core/adminCore.js');

test('masks email and phone values without exposing full PII', () => {
  assert.equal(core.maskEmail('ayu.pratama@example.com'), 'ay••••••••@example.com');
  assert.equal(core.maskPhone('+62 812-3456-7890'), '+•• ••• ••• 7890');
});

test('latest activity uses the newest valid timestamp', () => {
  assert.equal(core.getLatestIsoTimestamp([
    '2026-08-03T09:15:00.000Z',
    null,
    'invalid',
    '2026-08-04T10:24:00.000Z',
  ]), '2026-08-04T10:24:00.000Z');
  assert.equal(core.getLatestIsoTimestamp([null, undefined, 'invalid']), null);
});

test('health calculation is weighted, transparent, and status-aware', () => {
  const healthy = core.calculateAccountHealth({
    loginRecencyScore: 100,
    samplingActivityScore: 80,
    dataCompletenessScore: 90,
    featureAdoptionScore: 75,
    subscriptionScore: 100,
    syncReliabilityScore: 100,
    supportScore: 80,
    securityScore: 100,
  });
  assert.equal(healthy.score, 89);
  assert.equal(healthy.label, 'Healthy');
  assert.equal(healthy.signals.length, 5);
  const partial = core.calculateAccountHealth({
    loginRecencyScore: 100,
    samplingActivityScore: null,
    dataCompletenessScore: null,
    featureAdoptionScore: null,
    subscriptionScore: null,
    syncReliabilityScore: null,
    supportScore: null,
    securityScore: null,
  });
  assert.equal(partial.score, 100);
  assert.equal(partial.signals[1].score, null);
  assert.equal(core.calculateAccountHealth({ ...Object.fromEntries(Object.keys({
    loginRecencyScore: 0, samplingActivityScore: 0, dataCompletenessScore: 0, featureAdoptionScore: 0,
    subscriptionScore: 0, syncReliabilityScore: 0, supportScore: 0, securityScore: 0,
  }).map((key) => [key, 100])), suspended: true }).label, 'Suspended');
});

test('directory search and filters cover identifiers, farms, status, and activity', () => {
  const users = [
    { id: 'USR-1', name: 'Ayu Pratama', maskedEmail: 'ay••••@example.com', initials: 'AP', status: 'Healthy', plan: 'Professional', country: 'Indonesia', joinedAt: '2026-07-01T00:00:00Z', lastActiveAt: '2026-08-03T00:00:00Z', farmName: 'Tambak Indah' },
    { id: 'USR-2', name: 'Budi Santoso', maskedEmail: 'bu••••@example.com', initials: 'BS', status: 'Inactive', plan: 'Free', country: 'Indonesia', joinedAt: '2025-01-01T00:00:00Z', lastActiveAt: '2025-10-01T00:00:00Z', farmName: 'Samudra Farm' },
  ];
  const all = { status: 'all', plan: 'all', country: 'all', activity: 'all', registered: 'all' };
  assert.deepEqual(core.filterDirectoryUsers(users, 'tambak', all, new Date('2026-08-04T00:00:00Z')).map((user) => user.id), ['USR-1']);
  assert.deepEqual(core.filterDirectoryUsers(users, '', { ...all, status: 'Inactive', activity: '90d+' }, new Date('2026-08-04T00:00:00Z')).map((user) => user.id), ['USR-2']);
});

test('sensitive actions require a meaningful reason and explicit confirmation', () => {
  assert.equal(core.validateSensitiveAction('short', true).allowed, false);
  assert.equal(core.validateSensitiveAction('Investigating failed sync reports', false).allowed, false);
  assert.equal(core.validateSensitiveAction('Investigating failed sync reports', true).allowed, true);
  assert.equal(core.validateDeleteUserAction('Remove duplicate test account', 'wrong@example.com', 'user@example.com').allowed, false);
  assert.equal(core.validateDeleteUserAction('short', 'user@example.com', 'user@example.com').allowed, false);
  assert.equal(core.validateDeleteUserAction('Remove duplicate test account', 'USER@example.com', 'user@example.com').allowed, true);
});
