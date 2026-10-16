'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assertCompanyMemberForCallable } = require('./shared/companyAccess');
const { authorizeAgent } = require('./shared/orsonActionAuth');
const { createAgentTools } = require('./orsonAgentTools');

test('request-local data reuse eliminates duplicate company and user setup reads', async () => {
  let companyGets = 0;
  let userGets = 0;

  const db = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => {
          if (name === 'companies') {
            companyGets++;
            return {
              exists: true,
              data: () => ({ id, ownerId: 'user-1', currency: 'IDR' }),
            };
          }
          if (name === 'users') {
            userGets++;
            return {
              exists: true,
              data: () => ({ companyId: id === 'user-1' ? 'company-1' : 'other', role: 'admin' }),
            };
          }
          return { exists: false, data: () => ({}) };
        },
      }),
    }),
  };

  const requestCache = new Map();

  // Call 1: assertCompanyMemberForCallable
  const company = await assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { cache: requestCache });
  assert.equal(company.id, 'company-1');
  assert.equal(companyGets, 1);
  assert.equal(userGets, 1);

  // Call 2: authorizeAgent with the same requestCache
  const auth = await authorizeAgent(db, 'user-1', 'company-1', null, { cache: requestCache });
  assert.equal(auth.companyId, 'company-1');
  // No additional Firestore gets should have occurred!
  assert.equal(companyGets, 1, 'Company read should be reused from request cache');
  assert.equal(userGets, 1, 'User read should be reused from request cache');

  // Call 3: Handler user read directly from cache
  assert.ok(requestCache.has('users:user-1'), 'Cache key should be users:uid');
  const cachedUserSnap = await requestCache.get('users:user-1');
  assert.equal(cachedUserSnap.data().companyId, 'company-1');
  assert.equal(userGets, 1, 'User read count remains exactly 1');
});

test('failed reads are evicted from cache and subsequent reads can succeed', async () => {
  let attempt = 0;
  const db = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => {
          attempt++;
          if (attempt === 1) {
            throw new Error('transient_network_error');
          }
          return {
            exists: true,
            data: () => ({ ownerId: 'user-1', companyId: 'company-1', id }),
          };
        },
      }),
    }),
  };

  const requestCache = new Map();

  await assert.rejects(
    assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { cache: requestCache }),
    /transient_network_error/
  );

  assert.equal(requestCache.has('companies:company-1'), false, 'Failed read must be evicted from cache');

  // Next call should retry and succeed
  const company = await assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { cache: requestCache });
  assert.equal(company.ownerId, 'user-1');
  assert.equal(attempt, 3); // 1st try failed company, 2nd try read company (attempt 2) + user (attempt 3)
});

test('explicit refresh bypasses cache and updates stored snapshot', async () => {
  let companyReads = 0;
  const db = {
    collection: (name) => ({
      doc: () => ({
        get: async () => {
          if (name === 'companies') companyReads++;
          return {
            exists: true,
            data: () => ({ ownerId: 'user-1', companyId: 'company-1', reads: companyReads }),
          };
        },
      }),
    }),
  };

  const requestCache = new Map();

  const first = await assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { cache: requestCache });
  assert.equal(first.reads, 1);

  // Normal call reuses cache
  const second = await assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { cache: requestCache });
  assert.equal(second.reads, 1);

  // Explicit refresh forces read
  const refreshed = await assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { cache: requestCache, refresh: true });
  assert.equal(refreshed.reads, 2);
});

test('fresh transaction auth is preserved and bypasses cache when transaction is provided', async () => {
  let txGets = 0;
  let nonTxGets = 0;

  const db = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => {
          nonTxGets++;
          return { exists: true, data: () => ({ id, ownerId: 'user-1', companyId: 'company-1' }) };
        },
      }),
    }),
  };

  const mockTx = {
    get: async () => {
      txGets++;
      return { exists: true, data: () => ({ ownerId: 'user-1', companyId: 'company-1' }) };
    },
  };

  const requestCache = new Map();
  // Prime the cache
  await authorizeAgent(db, 'user-1', 'company-1', null, { cache: requestCache });
  assert.equal(nonTxGets, 2);
  assert.equal(txGets, 0);

  // Authorize within transaction: MUST use transaction.get, never cached non-transactional read!
  await authorizeAgent(db, 'user-1', 'company-1', mockTx, { cache: requestCache });
  assert.equal(txGets, 2, 'Transaction auth must execute fresh gets via transaction.get');
});

test('agent tools reuse catalog reads, support explicit refresh, and evict failed reads', async () => {
  let catalogQueries = 0;
  let failCatalog = false;

  const auth = {
    uid: 'user-1',
    companyId: 'company-1',
    company: { currency: 'IDR' },
    allowed: () => true,
    base: {
      collection: (name) => ({
        where: () => ({
          get: async () => {
            catalogQueries++;
            if (failCatalog) throw new Error('catalog_fetch_failed');
            return { docs: [] };
          },
        }),
        get: async () => {
          catalogQueries++;
          if (failCatalog) throw new Error('catalog_fetch_failed');
          return { docs: [{ id: 'pond-1', data: () => ({ name: 'Pond 1' }) }] };
        },
      }),
    },
  };

  const cache = new Map();
  const agent = createAgentTools({
    db: {},
    auth,
    onActivity: async () => {},
    cache,
  });

  const catalog1 = await agent.execute('discover_farm_action_targets', {});
  const queriesAfterFirst = catalogQueries;
  assert.ok(queriesAfterFirst > 0);
  assert.ok(catalog1);

  // Repeated call in same request should reuse catalog
  const catalog2 = await agent.execute('discover_farm_action_targets', {});
  assert.equal(catalogQueries, queriesAfterFirst, 'Catalog should be cached across discover calls');

  // Explicit refresh forces re-query
  await agent.execute('discover_farm_action_targets', { refresh: true });
  assert.ok(catalogQueries > queriesAfterFirst, 'Explicit refresh must re-query catalog');

  // Failure evicts only the same promise
  failCatalog = true;
  await assert.rejects(
    agent.execute('discover_farm_action_targets', { refresh: true }),
    /catalog_fetch_failed/
  );
  assert.equal(cache.has('catalog:company-1'), false, 'Failed catalog promise must be evicted');

  // Next attempt succeeds
  failCatalog = false;
  const recovered = await agent.execute('discover_farm_action_targets', {});
  assert.ok(recovered);
});

test('write tools preserve idempotence within turn and do not cache across requests', async () => {
  let prepareCalls = 0;
  const auth = {
    uid: 'user-1',
    companyId: 'company-1',
    company: { currency: 'IDR' },
    allowed: () => true,
    checkPond: () => {},
    base: {
      collection: (name) => ({
        where: () => ({
          get: async () => ({ docs: [] }),
        }),
        get: async () => ({
          docs: [{ id: 'pond-1', data: () => ({ name: 'Pond 1', blockId: 'block-1' }) }],
        }),
      }),
    },
  };

  const mockService = {
    get: async () => null,
    prepare: async ({ commands, operationId, revision }) => {
      prepareCalls++;
      return {
        id: operationId || 'op-123',
        revision: revision || 1,
        rows: commands.map((c) => ({
          id: c.id,
          valid: true,
          type: c.type,
          date: c.date,
          pondId: c.pondId,
          ...c.values,
        })),
      };
    },
  };

  const requestCache = new Map();
  const agent = createAgentTools({
    db: {},
    auth,
    onActivity: async () => {},
    onOperation: async () => {},
    service: mockService,
    userMessage: 'Tolong catat pH kolam',
    cache: requestCache,
  });

  const args = {
    commands: [{
      id: 'row-1',
      type: 'upsert_water_quality',
      date: '2026-10-14',
      pondId: 'pond-1',
      values: { phMorning: 7.8 },
    }],
  };

  // First prepare
  const result1 = await agent.execute('prepare_farm_actions', args);
  assert.equal(result1.status, 'awaiting_user_confirmation');
  assert.equal(prepareCalls, 1);
  assert.equal(result1.rows[0].valid, true);
  assert.equal(result1.rows[0].type, 'upsert_water_quality');

  // Duplicate prepare within same agent must return the same pending/resolved draft (idempotence)
  const result2 = await agent.execute('prepare_farm_actions', args);
  assert.equal(result2.status, 'awaiting_user_confirmation');
  assert.equal(result1.operationId, result2.operationId);
  assert.equal(prepareCalls, 1, 'Duplicate preparation within turn should be idempotent and not re-execute service.prepare');

  // A fresh agent instance must prepare freshly without reusing the first agent's private idempotence map
  const freshAgent = createAgentTools({
    db: {},
    auth,
    onActivity: async () => {},
    onOperation: async () => {},
    service: mockService,
    userMessage: 'Tolong catat pH kolam',
    cache: requestCache,
  });
  await freshAgent.execute('prepare_farm_actions', args);
  assert.equal(prepareCalls, 2, 'Fresh agent instance must execute preparation freshly');

  // Verify write tools / draft operations are not stored in request-wide cache
  assert.equal(requestCache.has('operations:op-123'), false, 'Write tools must never populate the request cache');
  const writeKeys = [...requestCache.keys()].filter(k => k.startsWith('operation:') || k.startsWith('write:'));
  assert.equal(writeKeys.length, 0, 'Draft write operations must never be cached in requestCache');
});

test('discovery to prep shares single catalog and schema construction executes zero DB reads', async () => {
  let authCalls = 0;
  let catalogQueries = 0;

  const auth = {
    uid: 'user-1',
    companyId: 'company-1',
    company: { currency: 'IDR' },
    allowed: () => true,
    checkPond: () => {},
    base: {
      collection: (name) => ({
        where: () => ({
          get: async () => ({ docs: [] }),
        }),
        get: async () => {
          catalogQueries++;
          return { docs: [{ id: 'pond-1', data: () => ({ name: 'Pond 1', blockId: 'block-1' }) }] };
        },
      }),
    },
  };

  const lazyAuth = async () => {
    authCalls++;
    return auth;
  };

  const mockService = {
    get: async () => null,
    prepare: async ({ commands, operationId, revision }) => ({
      id: operationId || 'op-999',
      revision: revision || 1,
      rows: commands.map((c) => ({ id: c.id, valid: true, type: c.type })),
    }),
  };

  const requestCache = new Map();

  // 1. Schema construction executes zero DB reads!
  const agent = createAgentTools({
    db: {},
    auth: lazyAuth,
    onActivity: async () => {},
    onOperation: async () => {},
    service: mockService,
    userMessage: 'Catat pakan kolam',
    cache: requestCache,
  });

  assert.equal(agent.tools.length, 3);
  assert.equal(authCalls, 0, 'Schema construction must do zero auth or DB reads');
  assert.equal(catalogQueries, 0, 'Schema construction must do zero catalog reads');

  // 2. Discover targets triggers lazy auth and fetches catalog once
  const catalog = await agent.execute('discover_farm_action_targets', {});
  assert.ok(catalog);
  assert.equal(authCalls, 1, 'First execute triggers lazy authorization');
  const queriesAfterDiscovery = catalogQueries;
  assert.ok(queriesAfterDiscovery > 0);

  // 3. Prepare farm actions reuses the exact same catalog promise!
  const prep = await agent.execute('prepare_farm_actions', {
    commands: [{
      id: 'row-1',
      type: 'upsert_water_quality',
      date: '2026-10-14',
      pondId: 'pond-1',
      values: { phMorning: 8.0 },
    }],
  });
  assert.equal(prep.status, 'awaiting_user_confirmation');
  assert.equal(catalogQueries, queriesAfterDiscovery, 'Discovery -> prep must reuse single catalog without re-querying');
});

test('server-populated snapshots bypass initial reads while transaction reads remain fresh', async () => {
  let dbCompanyGets = 0;
  let dbUserGets = 0;
  let txGets = 0;

  const db = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => {
          if (name === 'companies') dbCompanyGets++;
          if (name === 'users') dbUserGets++;
          return { exists: true, data: () => ({ id, ownerId: 'user-1', companyId: 'company-1' }) };
        },
      }),
    }),
  };

  const companySnap = { exists: true, data: () => ({ id: 'company-1', ownerId: 'user-1' }) };
  const userSnap = { exists: true, data: () => ({ companyId: 'company-1', role: 'admin' }) };

  // Using server-populated snapshots: zero db reads
  const company = await assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { companySnap, userSnap });
  assert.equal(company.ownerId, 'user-1');
  assert.equal(dbCompanyGets, 0);
  assert.equal(dbUserGets, 0);

  // When transaction is provided, snapshots are bypassed and transaction.get is executed fresh
  const mockTx = {
    get: async () => {
      txGets++;
      return { exists: true, data: () => ({ id: 'company-1', ownerId: 'user-1', companyId: 'company-1' }) };
    },
  };
  await assertCompanyMemberForCallable(db, 'user-1', 'company-1', 'useOrson', { transaction: mockTx, companySnap, userSnap });
  assert.equal(txGets, 2, 'Transaction must read fresh via transaction.get even if snapshots are provided');
});
