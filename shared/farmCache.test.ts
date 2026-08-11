import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FARM_CACHE_VERSION,
  createAuthBootstrapSnapshot,
  createFarmCacheSnapshot,
  getAuthBootstrapKey,
  getFarmCacheKey,
  parseAuthBootstrapSnapshot,
  parseFarmCacheSnapshot,
} from './farmCache.ts';

test('scopes farm and auth cache keys by user and company', () => {
  assert.notEqual(getFarmCacheKey('user-a', 'company-a'), getFarmCacheKey('user-b', 'company-a'));
  assert.notEqual(getFarmCacheKey('user-a', 'company-a'), getFarmCacheKey('user-a', 'company-b'));
  assert.notEqual(getAuthBootstrapKey('user-a', 'company-a'), getAuthBootstrapKey('user-a', 'company-b'));
});

test('rejects a farm cache belonging to another user or company', () => {
  const snapshot = createFarmCacheSnapshot('user-a', 'company-a', {
    ponds: [{ id: 'pond-a' }],
    physicalPonds: [],
    cycles: [],
    harvestRecords: [],
  });
  const raw = JSON.stringify(snapshot);

  assert.ok(parseFarmCacheSnapshot(raw, 'user-a', 'company-a'));
  assert.equal(parseFarmCacheSnapshot(raw, 'user-b', 'company-a'), null);
  assert.equal(parseFarmCacheSnapshot(raw, 'user-a', 'company-b'), null);
});

test('rejects corrupt and incompatible cache data', () => {
  assert.equal(parseFarmCacheSnapshot('{broken', 'user-a', 'company-a'), null);
  assert.equal(parseFarmCacheSnapshot(JSON.stringify({
    version: FARM_CACHE_VERSION + 1,
    userId: 'user-a',
    companyId: 'company-a',
    cachedAt: Date.now(),
    data: { ponds: [], physicalPonds: [], cycles: [], harvestRecords: [] },
  }), 'user-a', 'company-a'), null);
  assert.equal(parseFarmCacheSnapshot(JSON.stringify({
    version: FARM_CACHE_VERSION,
    userId: 'user-a',
    companyId: 'company-a',
    cachedAt: Date.now(),
    data: { ponds: 'invalid', physicalPonds: [], cycles: [], harvestRecords: [] },
  }), 'user-a', 'company-a'), null);
});

test('normalizes Date, Firestore Timestamp, undefined, and non-finite values', () => {
  const snapshot = createFarmCacheSnapshot('user-a', 'company-a', {
    ponds: [{
      createdAt: { toMillis: () => 1_750_000_000_123 },
      sampledAt: new Date('2025-01-02T03:04:05.000Z'),
      omitted: undefined,
      invalidNumber: Number.NaN,
    }],
    physicalPonds: [],
    cycles: [],
    harvestRecords: [],
  });
  const pond = snapshot.data.ponds[0] as Record<string, unknown>;

  assert.deepEqual(pond.createdAt, { seconds: 1_750_000_000, nanoseconds: 123_000_000 });
  assert.equal(pond.sampledAt, '2025-01-02T03:04:05.000Z');
  assert.equal('omitted' in pond, false);
  assert.equal(pond.invalidNumber, null);
});

test('requires an exact UID and company binding for cached auth bootstrap', () => {
  const raw = JSON.stringify({
    version: FARM_CACHE_VERSION,
    userId: 'user-a',
    companyId: 'company-a',
    cachedAt: Date.now(),
    user: { uid: 'user-a', companyId: 'company-a', role: 'owner' },
    company: { id: 'company-a', companyName: 'Farm A' },
  });

  assert.ok(parseAuthBootstrapSnapshot(raw, 'user-a', 'company-a'));
  assert.equal(parseAuthBootstrapSnapshot(raw, 'user-b', 'company-a'), null);
  assert.equal(parseAuthBootstrapSnapshot(raw, 'user-a', 'company-b'), null);
});

test('keeps invite and membership data out of the auth bootstrap', () => {
  const snapshot = createAuthBootstrapSnapshot(
    'user-a',
    'company-a',
    { uid: 'user-a', companyId: 'company-a', role: 'owner', inviteToken: 'secret' },
    { id: 'company-a', companyName: 'Farm A', teamMembers: ['user-a'], pendingInvites: ['private'] },
  );

  assert.equal('inviteToken' in snapshot.user, false);
  assert.equal('teamMembers' in snapshot.company, false);
  assert.equal('pendingInvites' in snapshot.company, false);
});
