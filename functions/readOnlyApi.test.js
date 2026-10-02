'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReadOnlyApiHandler, matchRoute } = require('./readOnlyApi');
const { CURRENT_CURSOR_REVISION, encodeCursor } = require('./shared/readOnlyFarmApi');
const {
  FIXED_SITE_PROJECT_ID,
  buildCanonicalRequest,
  computeHmacSignature,
  computeBodyHash,
  hashPairCode,
} = require('./shared/siteMcpDelegation');

const createMockReqRes = ({
  method = 'GET',
  url = '/',
  headers = {},
  query = {},
  body = null,
} = {}) => {
  const req = {
    method,
    url,
    headers: { ...headers },
    query: { ...query },
    body,
    rawBody: body !== null && body !== undefined
      ? (typeof body === 'object' ? Buffer.from(JSON.stringify(body)) : Buffer.from(String(body)))
      : Buffer.from(''),
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    getHeader(key) {
      return this.headers[key.toLowerCase()];
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };

  return { req, res };
};

const createMockAuth = ({
  validTokens = {},
  revokedTokens = new Set(),
  disabledUsers = new Set(),
  deletedUsers = new Set(),
  tokensValidAfterTimeByUid = {},
} = {}) => {
  const calls = [];
  return {
    calls,
    verifyIdToken: async (token, checkRevoked) => {
      calls.push({ op: 'verifyIdToken', token, checkRevoked });
      if (checkRevoked && revokedTokens.has(token)) {
        const err = new Error('The Firebase ID token has been revoked.');
        err.code = 'auth/id-token-revoked';
        throw err;
      }
      if (validTokens[token]) {
      const decoded = validTokens[token];
      return {
        ...decoded,
        auth_time: decoded.auth_time ?? Math.floor(Date.now() / 1000),
      };
      }
      const err = new Error('The Firebase ID token is invalid.');
      err.code = 'auth/invalid-id-token';
      throw err;
    },
    getUser: async (uid) => {
      calls.push({ op: 'getUser', uid });
      if (deletedUsers.has(uid)) {
        const err = new Error('No user record found for the provided user ID.');
        err.code = 'auth/user-not-found';
        throw err;
      }
      return {
        uid,
        disabled: disabledUsers.has(uid),
        tokensValidAfterTime: tokensValidAfterTimeByUid[uid] || new Date(0).toISOString(),
      };
    },
  };
};

const createMockDb = (data = {}) => {
  const store = {
    companies: data.companies || {},
    users: data.users || {},
    blocks: data.blocks || {},
    ponds: data.ponds || {},
    siteMcpPairChallenges: data.siteMcpPairChallenges || {},
    sitePrincipalLinks: data.sitePrincipalLinks || {},
    userSitePrincipalLinks: data.userSitePrincipalLinks || {},
    siteMcpNonces: data.siteMcpNonces || {},
  };

  const getDoc = (coll, id) => {
    const docData = store[coll]?.[id];
    return {
      id,
      _collName: coll,
      exists: !!docData,
      data: () => (docData ? JSON.parse(JSON.stringify(docData)) : undefined),
    };
  };

  const setDoc = (coll, id, val, opts = {}) => {
    if (!store[coll]) store[coll] = {};
    if (opts?.merge && store[coll][id]) {
      store[coll][id] = { ...store[coll][id], ...JSON.parse(JSON.stringify(val)) };
    } else {
      store[coll][id] = JSON.parse(JSON.stringify(val));
    }
  };

  const updateDoc = (coll, id, val) => {
    if (!store[coll] || !store[coll][id]) {
      const err = new Error(`Document ${coll}/${id} does not exist`);
      err.code = 5;
      throw err;
    }
    store[coll][id] = { ...store[coll][id], ...JSON.parse(JSON.stringify(val)) };
  };

  const deleteDoc = (coll, id) => {
    if (store[coll]) {
      delete store[coll][id];
    }
  };

  const makeQuery = (items, filters = [], sortField = null, cursor = null, limitCount = null) => ({
    where: (field, op, val) =>
      makeQuery(items, [...filters, { field, op, val }], sortField, cursor, limitCount),
    orderBy: (field) => makeQuery(items, filters, field, cursor, limitCount),
    startAfter: (cur) => makeQuery(items, filters, sortField, cur, limitCount),
    limit: (n) => makeQuery(items, filters, sortField, cursor, n),
    get: async () => {
      let result = [...items];
      for (const f of filters) {
        if (f.op === '==') {
          result = result.filter((it) => it.data[f.field] === f.val);
        } else if (f.op === 'in') {
          result = result.filter((it) => Array.isArray(f.val) && f.val.includes(it.data[f.field]));
        }
      }
      if (sortField) {
        result.sort((a, b) => {
          const va = sortField === '__name__' ? a.id : a.data[sortField] || '';
          const vb = sortField === '__name__' ? b.id : b.data[sortField] || '';
          return String(va).localeCompare(String(vb));
        });
      }
      if (cursor) {
        const idx = result.findIndex((it) => it.id === cursor);
        if (idx >= 0) {
          result = result.slice(idx + 1);
        }
      }
      if (limitCount !== null) {
        result = result.slice(0, limitCount);
      }
      return {
        docs: result.map((it) => ({
          id: it.id,
          exists: true,
          data: () => ({ ...it.data }),
        })),
        empty: result.length === 0,
      };
    },
  });

  return {
    _store: store,
    runTransaction: async (updateFn) => {
      const tx = {
        get: async (ref) => getDoc(ref._collName, ref.id),
        set: (ref, val, opts) => setDoc(ref._collName, ref.id, val, opts),
        update: (ref, val) => updateDoc(ref._collName, ref.id, val),
        delete: (ref) => deleteDoc(ref._collName, ref.id),
      };
      return updateFn(tx);
    },
    collection: (collName) => ({
      doc: (docId) => ({
        id: docId,
        _collName: collName,
        get: async () => getDoc(collName, docId),
        set: async (val, opts) => setDoc(collName, docId, val, opts),
        update: async (val) => updateDoc(collName, docId, val),
        delete: async () => deleteDoc(collName, docId),
        collection: (subColl) => {
          const subItemsMap = store[subColl]?.[docId] || {};
          const items = Object.entries(subItemsMap).map(([id, itemData]) => ({
            id,
            data: itemData,
          }));

          return {
            doc: (subDocId) => ({
              id: subDocId,
              _collName: subColl,
              get: async () => {
                const subData = subItemsMap[subDocId];
                return {
                  id: subDocId,
                  exists: !!subData,
                  data: () => (subData ? { ...subData } : undefined),
                };
              },
            }),
            where: (field, op, val) => makeQuery(items, [{ field, op, val }]),
            orderBy: (field) => makeQuery(items, [], field),
            startAfter: (cur) => makeQuery(items, [], null, cur),
            limit: (n) => makeQuery(items, [], null, null, n),
            get: async () => makeQuery(items).get(),
          };
        },
      }),
    }),
  };
};

const createTestFixture = () => {
  return {
    companies: {
      'farm-1': {
        name: 'Farm One',
        ownerId: 'owner-uid',
        teamMembers: ['owner-uid', 'tech-a', 'buyer-uid'],
        businessSize: 'enterprise',
        timeZone: 'UTC',
      },
      'farm-attacker': {
        name: 'Attacker Farm',
        ownerId: 'attacker-uid',
        teamMembers: ['attacker-uid'],
        businessSize: 'standard',
        timeZone: 'UTC',
      },
    },
    users: {
      'owner-uid': { role: 'owner', companyId: 'farm-1' },
      'tech-a': { role: 'technician', companyId: 'farm-1' },
      'buyer-uid': { role: 'buyer', companyId: 'farm-1' },
      'attacker-uid': { role: 'owner', companyId: 'farm-attacker' },
    },
    blocks: {
      'farm-1': {
        'blk-a': { name: 'Block Alpha', assignedTechnicianId: 'tech-a' },
        'blk-b': { name: 'Block Beta', assignedTechnicianId: 'tech-b' },
      },
    },
    ponds: {
      'farm-1': {
        'pond-a1': {
          pondName: 'Alpha Pond 1',
          blockId: 'blk-a',
          pondArea: 1000,
          cycleStatus: 'active',
          samplings: [
            {
              id: 's-a1-1',
              date: '2026-09-01',
              phMorning: 7.8,
              phEvening: 8.2,
              doMorning: 5.4,
              doEvening: 6.1,
              salinity: 26,
              temperature: 28.5,
              mbw: 4.2,
              feedData: { totalDailyFeed: 30, feedingResponse: 'normal' },
            },
            {
              id: 's-a1-2',
              date: '2026-09-02',
              phMorning: 7.9,
              doMorning: 5.1,
              salinity: 26,
              temperature: 28.9,
              mbw: 4.8,
              feedData: { totalDailyFeed: 0, isExplicitZero: true },
            },
          ],
        },
        'pond-b1': {
          pondName: 'Beta Pond 1',
          blockId: 'blk-b',
          pondArea: 1500,
          cycleStatus: 'active',
          samplings: [
            {
              id: 's-b1-1',
              date: '2026-09-01',
              phMorning: 7.6,
              mbw: 5.5,
              feedData: { totalDailyFeed: 50 },
            },
          ],
        },
      },
      'farm-attacker': {
        'pond-attacker-1': {
          pondName: 'Attacker Pond',
          pondArea: 500,
          cycleStatus: 'active',
          samplings: [],
        },
      },
    },
  };
};

const createSignedSiteReq = ({
  method = 'GET',
  path,
  query = {},
  body = null,
  principal = `${FIXED_SITE_PROJECT_ID}:site-principal-1`,
  secret = 'test-hmac-secret-123',
  nonce = `nonce-${Date.now()}-${Math.random()}`,
  timestamp = Date.now(),
  headers = {},
} = {}) => {
  const bodyHash = computeBodyHash(body);
  const stringToSign = buildCanonicalRequest({
    method,
    path,
    query,
    timestamp,
    nonce,
    principal,
    bodyHash,
  });
  const signature = computeHmacSignature({ secret, stringToSign });

  const queryString = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    queryString.set(k, String(v));
  }
  const queryPart = queryString.toString();
  const url = queryPart ? `${path}?${queryPart}` : path;

  return createMockReqRes({
    method,
    url,
    query,
    body,
    headers: {
      'x-mcp-signature': signature,
      'x-mcp-timestamp': String(timestamp),
      'x-mcp-nonce': nonce,
      'x-mcp-principal': principal,
      ...headers,
    },
  });
};

test('auth: verifies token with checkRevoked true and rejects missing or invalid auth headers', async () => {
  const auth = createMockAuth({
    validTokens: {
      'valid-owner-token': { uid: 'owner-uid' },
    },
    revokedTokens: new Set(['revoked-token']),
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  // Missing Authorization header -> 401
  const { req: r1, res: s1 } = createMockReqRes({ url: '/api/integrations/v1/ponds' });
  await handler(r1, s1);
  assert.equal(s1.statusCode, 401);
  assert.equal(s1.body.error.code, 'unauthenticated');
  assert.match(s1.body.error.message, /Missing Authorization header/i);

  // Non-Bearer header -> 401
  const { req: r2, res: s2 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Basic dXNlcjpwYXNz' },
  });
  await handler(r2, s2);
  assert.equal(s2.statusCode, 401);
  assert.match(s2.body.error.message, /Expected Bearer <token>/i);

  // Empty Bearer token -> 401
  const { req: r3, res: s3 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer   ' },
  });
  await handler(r3, s3);
  assert.equal(s3.statusCode, 401);
  assert.match(s3.body.error.message, /token is empty/i);

  // Invalid token -> 401
  const { req: r4, res: s4 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer invalid-token' },
  });
  await handler(r4, s4);
  assert.equal(s4.statusCode, 401);
  assert.match(s4.body.error.message, /Invalid, expired, or revoked/i);

  // Revoked token -> 401
  const { req: r5, res: s5 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer revoked-token' },
  });
  await handler(r5, s5);
  assert.equal(s5.statusCode, 401);
  assert.match(s5.body.error.message, /Invalid, expired, or revoked/i);

  // Valid token -> 200
  const { req: r6, res: s6 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer valid-owner-token' },
  });
  await handler(r6, s6);
  assert.equal(s6.statusCode, 200);

  // Verify that verifyIdToken was called with checkRevoked: true on every token check
  assert.ok(auth.calls.length >= 3);
  for (const call of auth.calls) {
    if (call.op === 'verifyIdToken') {
      assert.equal(call.checkRevoked, true, 'verifyIdToken must be invoked with checkRevoked true');
    }
  }
});

test('no writes: enforces only GET requests and rejects mutations with 405 Method Not Allowed', async () => {
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const { req, res } = createMockReqRes({
      method,
      url: '/api/integrations/v1/ponds',
      headers: { authorization: 'Bearer tok-owner' },
    });
    await handler(req, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.body.error.code, 'method-not-allowed');
    assert.equal(res.getHeader('allow'), 'GET');
  }
});

test('no CORS: explicitly omits CORS headers on success and error responses', async () => {
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  // 200 response
  const { req: r1, res: s1 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: {
      authorization: 'Bearer tok-owner',
      origin: 'https://attacker.example.com',
    },
  });
  await handler(r1, s1);
  assert.equal(s1.statusCode, 200);
  assert.equal(s1.getHeader('access-control-allow-origin'), undefined);
  assert.equal(s1.getHeader('access-control-allow-methods'), undefined);

  // 401 response
  const { req: r2, res: s2 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { origin: 'https://attacker.example.com' },
  });
  await handler(r2, s2);
  assert.equal(s2.statusCode, 401);
  assert.equal(s2.getHeader('access-control-allow-origin'), undefined);
});

test('cache headers: sends strict private no-cache headers on all responses', async () => {
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  const { req, res } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.getHeader('cache-control'), 'private, no-cache, no-store, must-revalidate');
  assert.equal(res.getHeader('pragma'), 'no-cache');
  assert.equal(res.getHeader('expires'), '0');
});

test('query validation: rejects caller companyId and unknown query keys with 400', async () => {
  const auth = createMockAuth({
    validTokens: {
      'tok-owner': { uid: 'owner-uid' },
    },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  // Reject caller companyId in query param
  const { req: r1, res: s1 } = createMockReqRes({
    url: '/api/integrations/v1/ponds?companyId=farm-attacker',
    query: { companyId: 'farm-attacker' },
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r1, s1);
  assert.equal(s1.statusCode, 400);
  assert.equal(s1.body.error.code, 'invalid-argument');
  assert.match(s1.body.error.message, /Caller cannot specify companyId/i);

  // Reject caller company_id in query param
  const { req: r2, res: s2 } = createMockReqRes({
    url: '/api/integrations/v1/ponds?company_id=farm-attacker',
    query: { company_id: 'farm-attacker' },
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r2, s2);
  assert.equal(s2.statusCode, 400);
  assert.match(s2.body.error.message, /Caller cannot specify companyId/i);

  // Reject caller-selected company headers as well as query parameters.
  const { req: rHeader, res: sHeader } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer tok-owner', CompanyId: 'farm-attacker' },
  });
  await handler(rHeader, sHeader);
  assert.equal(sHeader.statusCode, 400);
  assert.equal(sHeader.body.error.code, 'invalid-argument');
  assert.match(sHeader.body.error.message, /query parameters or headers/i);

  const { req: rMalformedId, res: sMalformedId } = createMockReqRes({
    url: '/api/integrations/v1/ponds/%E0%A4%A/summary',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(rMalformedId, sMalformedId);
  assert.equal(sMalformedId.statusCode, 400);
  assert.equal(sMalformedId.body.error.code, 'invalid-argument');

  // Reject unknown query parameters
  const { req: r3, res: s3 } = createMockReqRes({
    url: '/api/integrations/v1/ponds?unknownParam=value',
    query: { unknownParam: 'value' },
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r3, s3);
  assert.equal(s3.statusCode, 400);
  assert.match(s3.body.error.message, /Unknown query parameter/i);

  // Reject query params on pond-summary route
  const { req: r4, res: s4 } = createMockReqRes({
    url: '/api/integrations/v1/ponds/pond-a1/summary?limit=10',
    query: { limit: '10' },
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r4, s4);
  assert.equal(s4.statusCode, 400);
  assert.match(s4.body.error.message, /Unknown query parameter/i);

  // Reject repeated query parameters
  const { req: r5, res: s5 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    query: { limit: ['10', '20'] },
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r5, s5);
  assert.equal(s5.statusCode, 400);
  assert.match(s5.body.error.message, /Repeated query parameter/i);
});

test('routes & envelope: wraps successful responses in {apiVersion: "v1", data, meta}', async () => {
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  // Route 1: GET /api/integrations/v1/ponds
  const { req: r1, res: s1 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r1, s1);
  assert.equal(s1.statusCode, 200);
  assert.equal(s1.body.apiVersion, 'v1');
  assert.ok(Array.isArray(s1.body.data));
  assert.equal(s1.body.data.length, 2);
  assert.equal(s1.body.meta.cursorRevision, CURRENT_CURSOR_REVISION);
  assert.equal(s1.body.meta.hasMore, false);

  // Route 2: GET /api/integrations/v1/ponds/:pondId/summary
  const { req: r2, res: s2 } = createMockReqRes({
    url: '/api/integrations/v1/ponds/pond-a1/summary',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r2, s2);
  assert.equal(s2.statusCode, 200);
  assert.equal(s2.body.apiVersion, 'v1');
  assert.equal(s2.body.data.id, 'pond-a1');
  assert.equal(s2.body.data.currentMbw, 4.8);
  assert.equal(s2.body.data.mbwSource, 'sampling');
  assert.equal(s2.body.meta.pondId, 'pond-a1');

  // Route 3: GET /api/integrations/v1/ponds/:pondId/water-quality
  const { req: r3, res: s3 } = createMockReqRes({
    url: '/api/integrations/v1/ponds/pond-a1/water-quality?startDate=2026-09-01&endDate=2026-09-02',
    query: { startDate: '2026-09-01', endDate: '2026-09-02' },
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r3, s3);
  assert.equal(s3.statusCode, 200);
  assert.equal(s3.body.apiVersion, 'v1');
  assert.equal(s3.body.data.length, 2);
  assert.equal(s3.body.meta.pondId, 'pond-a1');
  assert.equal(s3.body.meta.dataCoverage.requestedDays, 2);

  // Route 4: GET /api/integrations/v1/ponds/:pondId/feed-summary
  const { req: r4, res: s4 } = createMockReqRes({
    url: '/api/integrations/v1/ponds/pond-a1/feed-summary?startDate=2026-09-01&endDate=2026-09-02',
    query: { startDate: '2026-09-01', endDate: '2026-09-02' },
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r4, s4);
  assert.equal(s4.statusCode, 200);
  assert.equal(s4.body.apiVersion, 'v1');
  assert.equal(s4.body.data.length, 2);
  assert.equal(s4.body.meta.pondId, 'pond-a1');
  assert.equal(s4.body.meta.totalFeedKg, 30);
  assert.equal(s4.body.meta.unit, 'kg');
  assert.equal(s4.body.data[0].feedKg, 30);
  assert.equal(s4.body.data[1].feedKg, 0);
  assert.equal(s4.body.data[1].isExplicitZero, true);

  // Farm-wide summary removed -> 404
  const { req: rFarm, res: sFarm } = createMockReqRes({
    url: '/summary',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(rFarm, sFarm);
  assert.equal(sFarm.statusCode, 404);
  assert.equal(sFarm.body.error.code, 'not-found');
});

test('stale cursor: maps aborted/conflict to HTTP 409', async () => {
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
  });
  const db = createMockDb(createTestFixture());

  const staleCursor = encodeCursor({
    id: 's-a1-1',
    revision: CURRENT_CURSOR_REVISION,
    route: 'water-quality',
    order: 'date_id',
    uid: 'owner-uid',
    companyId: 'farm-1',
    pondId: 'pond-a1',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    digest: 'stale-digest-xyz',
    offset: 1,
  });

  const handler = createReadOnlyApiHandler({ auth, db });
  const { req, res } = createMockReqRes({
    url: `/api/integrations/v1/ponds/pond-a1/water-quality?startDate=2026-09-01&endDate=2026-09-02&cursor=${staleCursor}`,
    query: {
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      cursor: staleCursor,
    },
    headers: { authorization: 'Bearer tok-owner' },
  });

  await handler(req, res);
  assert.equal(res.statusCode, 409, 'Stale cursor must return HTTP 409 Conflict');
  assert.equal(res.body.error.code, 'aborted');
  assert.match(res.body.error.message, /Cursor is stale/i);
});

test('roles & enterprise scoping: returns 404 for inaccessible ponds to prevent pond enumeration', async () => {
  const auth = createMockAuth({
    validTokens: {
      'tok-tech-a': { uid: 'tech-a' },
      'tok-buyer': { uid: 'buyer-uid' },
    },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  // Buyer (no viewFarm) -> 403
  const { req: rb, res: sb } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer tok-buyer' },
  });
  await handler(rb, sb);
  assert.equal(sb.statusCode, 403);
  assert.equal(sb.body.error.code, 'permission-denied');

  // Tech A: pond-a1 in assigned block -> 200
  const { req: rOk, res: sOk } = createMockReqRes({
    url: '/api/integrations/v1/ponds/pond-a1/summary',
    headers: { authorization: 'Bearer tok-tech-a' },
  });
  await handler(rOk, sOk);
  assert.equal(sOk.statusCode, 200);
  assert.equal(sOk.body.data.id, 'pond-a1');

  // Tech A: pond-b1 in unassigned block -> returns 404 (not 403, preventing pond enumeration)
  const { req: rDenied, res: sDenied } = createMockReqRes({
    url: '/api/integrations/v1/ponds/pond-b1/summary',
    headers: { authorization: 'Bearer tok-tech-a' },
  });
  await handler(rDenied, sDenied);
  assert.equal(sDenied.statusCode, 404);
  assert.equal(sDenied.body.error.code, 'not-found');
});

test('safe errors: hides sensitive stack traces, returns fixed safe messages on 500 and 503', async () => {
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db });

  // Missing required dates on water-quality -> 400
  const { req: r1, res: s1 } = createMockReqRes({
    url: '/api/integrations/v1/ponds/pond-a1/water-quality',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r1, s1);
  assert.equal(s1.statusCode, 400);
  assert.equal(s1.body.error.code, 'invalid-argument');
  assert.equal(s1.body.stack, undefined);

  // Pond not found -> 404
  const { req: r2, res: s2 } = createMockReqRes({
    url: '/api/integrations/v1/ponds/non-existent/summary',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(r2, s2);
  assert.equal(s2.statusCode, 404);
  assert.equal(s2.body.error.code, 'not-found');

  // Unexpected internal error -> 500 with fixed safe message
  const throwingFarmApi = {
    listPonds: async () => {
      const err = new Error('Database connection failed password=secret');
      err.code = 'internal';
      throw err;
    },
  };
  const throwingHandler = createReadOnlyApiHandler({ auth, farmApi: throwingFarmApi });
  const { req: r3, res: s3 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await throwingHandler(r3, s3);
  assert.equal(s3.statusCode, 500);
  assert.equal(s3.body.error.code, 'internal');
  assert.equal(s3.body.error.message, 'An unexpected internal error occurred.');
  assert.equal(s3.body.stack, undefined);

  // Unavailable -> 503 with fixed safe message
  const unavailableFarmApi = {
    listPonds: async () => {
      const err = new Error('GCP Firestore unavailable');
      err.code = 'unavailable';
      throw err;
    },
  };
  const unavailHandler = createReadOnlyApiHandler({ auth, farmApi: unavailableFarmApi });
  const { req: r4, res: s4 } = createMockReqRes({
    url: '/api/integrations/v1/ponds',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await unavailHandler(r4, s4);
  assert.equal(s4.statusCode, 503);
  assert.equal(s4.body.error.code, 'unavailable');
  assert.equal(s4.body.error.message, 'Service temporarily unavailable.');
});

// ==========================================
// REVERSED PAIRING & DELEGATION INTEGRATION TESTS
// ==========================================

test('management: Site HMAC obtains pair-challenge; Bearer tokens cannot create challenges', async () => {
  const secret = 'hmac-test-secret';
  const principal = `${FIXED_SITE_PROJECT_ID}:site-worker-1`;
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db, hmacSecret: secret });

  // 1. Firebase Bearer token cannot create Site challenge -> 403 permission-denied
  const { req: rBearer, res: sBearer } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair-challenge',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(rBearer, sBearer);
  assert.equal(sBearer.statusCode, 403);
  assert.equal(sBearer.body.error.code, 'permission-denied');
  assert.match(sBearer.body.error.message, /Firebase Bearer must never create a Site challenge/i);

  // 2. GET request rejected with 405 Method Not Allowed and Allow: POST
  const { req: rGet, res: sGet } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/site-delegation/pair-challenge',
    principal,
    secret,
  });
  await handler(rGet, sGet);
  assert.equal(sGet.statusCode, 405);
  assert.equal(sGet.getHeader('allow'), 'POST');

  // 3. Signed Site HMAC POST creates challenge for unlinked principal
  const { req: rPost, res: sPost } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/pair-challenge',
    principal,
    secret,
  });
  await handler(rPost, sPost);
  assert.equal(sPost.statusCode, 200);
  assert.equal(sPost.body.apiVersion, 'v1');
  assert.ok(sPost.body.data.pairCode);
  assert.ok(sPost.body.data.pairCode.length >= 48, 'Code must be at least 24 bytes');
  assert.equal(sPost.body.data.expiresInSeconds, 300, 'Challenge expiry must be 5 minutes');

  // Check Firestore stored state: hashed only, bound to principal
  const pairCode = sPost.body.data.pairCode;
  const codeHash = hashPairCode(pairCode);
  const storedDoc = db._store.siteMcpPairChallenges[codeHash];
  assert.ok(storedDoc);
  assert.equal(storedDoc.principal, principal);
  assert.equal(storedDoc.used, false);
  assert.equal(Object.values(storedDoc).includes(pairCode), false, 'Plaintext pair code must not be in Firestore');
});

test('management: Shrimply Settings submits code via Firebase Bearer to pair-complete; rejects HMAC and input spoofing', async () => {
  const secret = 'hmac-test-secret';
  const principal = `${FIXED_SITE_PROJECT_ID}:site-worker-1`;
  const auth = createMockAuth({
    validTokens: {
      'tok-owner': { uid: 'owner-uid' },
      'tok-tech': { uid: 'tech-a' },
    },
    revokedTokens: new Set(['tok-revoked']),
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db, hmacSecret: secret });

  // 1a. Site generates challenge code via HMAC
  const { req: rChallenge, res: sChallenge } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/pair-challenge',
    principal,
    secret,
  });
  await handler(rChallenge, sChallenge);
  assert.equal(sChallenge.statusCode, 200);
  const pairCode = sChallenge.body.data.pairCode;

  // 1b. HMAC pair-complete attempt by unlinked principal -> 403 permission-denied
  const { req: rHmacPairUnlinked, res: sHmacPairUnlinked } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/pair',
    body: { pairCode },
    principal,
    secret,
  });
  await handler(rHmacPairUnlinked, sHmacPairUnlinked);
  assert.equal(sHmacPairUnlinked.statusCode, 403);
  assert.equal(sHmacPairUnlinked.body.error.code, 'permission-denied');
  assert.equal(db._store.siteMcpPairChallenges[hashPairCode(pairCode)].used, false, 'Challenge must remain unused');
  assert.equal(db._store.sitePrincipalLinks[principal], undefined, 'No principal link should be created');
  assert.equal(db._store.userSitePrincipalLinks['owner-uid'], undefined, 'No user link should be created');

  // 2. Seed a second principal with valid active, unexpired farm:read link and reverse userSitePrincipalLinks record
  const linkedPrincipal = `${FIXED_SITE_PROJECT_ID}:site-worker-linked`;
  const linkedUid = 'tech-a';
  const now = Date.now();
  const initialLinkDoc = {
    principal: linkedPrincipal,
    uid: linkedUid,
    scope: ['farm:read'],
    audience: 'shrimply-admin',
    siteProjectId: FIXED_SITE_PROJECT_ID,
    firebaseAuthTime: Math.floor(now / 1000),
    createdAt: now - 5000,
    updatedAt: now - 5000,
    expiresAt: now + (365 * 24 * 60 * 60 * 1000),
    active: true,
  };
  db._store.sitePrincipalLinks[linkedPrincipal] = { ...initialLinkDoc };
  db._store.userSitePrincipalLinks[linkedUid] = { ...initialLinkDoc };

  // Generate valid unused challenge for that principal
  const { req: rLinkedChallenge, res: sLinkedChallenge } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/pair-challenge',
    principal: linkedPrincipal,
    secret,
  });
  await handler(rLinkedChallenge, sLinkedChallenge);
  assert.equal(sLinkedChallenge.statusCode, 200);
  const linkedPairCode = sLinkedChallenge.body.data.pairCode;
  assert.ok(linkedPairCode);

  // Snapshot both link documents before HMAC pair-complete attempt
  const siteLinkBefore = JSON.parse(JSON.stringify(db._store.sitePrincipalLinks[linkedPrincipal]));
  const userLinkBefore = JSON.parse(JSON.stringify(db._store.userSitePrincipalLinks[linkedUid]));

  // Attempt pair-complete via correctly signed HMAC for that linked principal
  const { req: rHmacPairLinked, res: sHmacPairLinked } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/pair',
    body: { pairCode: linkedPairCode },
    principal: linkedPrincipal,
    secret,
  });
  await handler(rHmacPairLinked, sHmacPairLinked);
  // Reaches Firebase-only guard and returns 403 permission-denied
  assert.equal(sHmacPairLinked.statusCode, 403);
  assert.equal(sHmacPairLinked.body.error.code, 'permission-denied');
  assert.match(sHmacPairLinked.body.error.message, /HMAC must never complete pairing/i);
  assert.equal(db._store.siteMcpPairChallenges[hashPairCode(linkedPairCode)].used, false, 'Linked challenge must remain unused');
  assert.deepEqual(db._store.sitePrincipalLinks[linkedPrincipal], siteLinkBefore, 'sitePrincipalLinks document must remain byte-for-byte unchanged');
  assert.deepEqual(db._store.userSitePrincipalLinks[linkedUid], userLinkBefore, 'userSitePrincipalLinks document must remain byte-for-byte unchanged');

  // 3. Submit that same linked challenge with revocation-checked Firebase Bearer for its already-linked UID
  const { req: rPairLinkedBearer, res: sPairLinkedBearer } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-tech' },
    body: { pairCode: linkedPairCode },
  });
  await handler(rPairLinkedBearer, sPairLinkedBearer);
  assert.equal(sPairLinkedBearer.statusCode, 200);
  assert.equal(sPairLinkedBearer.body.data.success, true);
  assert.equal(Object.hasOwn(sPairLinkedBearer.body.data, 'principal'), false);
  assert.equal(Object.hasOwn(sPairLinkedBearer.body.data, 'uid'), false);
  assert.equal(db._store.siteMcpPairChallenges[hashPairCode(linkedPairCode)].used, true, 'Linked challenge must now be used');
  assert.equal(db._store.sitePrincipalLinks[linkedPrincipal].uid, linkedUid);
  assert.equal(db._store.userSitePrincipalLinks[linkedUid].principal, linkedPrincipal);

  // 4. User attempts to inject uid in body -> rejected with 400
  const { req: rInjectUid, res: sInjectUid } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-owner' },
    body: { pairCode, uid: 'attacker-uid' },
  });
  await handler(rInjectUid, sInjectUid);
  assert.equal(sInjectUid.statusCode, 400);
  assert.equal(sInjectUid.body.error.code, 'invalid-argument');
  assert.match(sInjectUid.body.error.message, /must not contain uid, email, or principal/i);

  // 5. User attempts to inject principal in body -> rejected with 400
  const { req: rInjectPrincipal, res: sInjectPrincipal } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-owner' },
    body: { pairCode, principal: 'attacker-principal' },
  });
  await handler(rInjectPrincipal, sInjectPrincipal);
  assert.equal(sInjectPrincipal.statusCode, 400);
  assert.match(sInjectPrincipal.body.error.message, /must not contain uid, email, or principal/i);

  // 6. User attempts to inject email in query -> rejected with 400
  const { req: rInjectEmail, res: sInjectEmail } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair?email=attacker@example.com',
    query: { email: 'attacker@example.com' },
    headers: { authorization: 'Bearer tok-owner' },
    body: { pairCode },
  });
  await handler(rInjectEmail, sInjectEmail);
  assert.equal(sInjectEmail.statusCode, 400);

  // 7. Revoked token rejected with 401 unauthenticated
  const { req: rRevoked, res: sRevoked } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-revoked' },
    body: { pairCode },
  });
  await handler(rRevoked, sRevoked);
  assert.equal(sRevoked.statusCode, 401);

  // 8. Legitimate owner submits code via Bearer token -> 200 OK, 1:1 server-side link created
  const { req: rPair, res: sPair } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair-complete',
    headers: { authorization: 'Bearer tok-owner' },
    body: { pairCode },
  });
  await handler(rPair, sPair);
  assert.equal(sPair.statusCode, 200);
  assert.equal(sPair.body.data.success, true);
  assert.equal(Object.hasOwn(sPair.body.data, 'principal'), false);
  assert.equal(Object.hasOwn(sPair.body.data, 'uid'), false);

  // Verify bidirectional 1:1 server-side link in Firestore
  const siteLink = db._store.sitePrincipalLinks[principal];
  const userLink = db._store.userSitePrincipalLinks['owner-uid'];
  assert.ok(siteLink);
  assert.ok(userLink);
  assert.equal(siteLink.uid, 'owner-uid');
  assert.equal(userLink.principal, principal);
  assert.deepEqual(siteLink.scope, ['farm:read']);
  assert.equal(siteLink.audience, 'shrimply-admin');

  // 9. Replay attack: reusing used pair code -> 400 invalid-argument
  const { req: rReuse, res: sReuse } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-tech' },
    body: { pairCode },
  });
  await handler(rReuse, sReuse);
  assert.equal(sReuse.statusCode, 400);
  assert.match(sReuse.body.error.message, /already been used/i);

  // 10. 1:1 constraint: Attempt to link another principal to same user (owner-uid) -> Conflict 409
  const principal2 = `${FIXED_SITE_PROJECT_ID}:site-worker-2`;
  const { req: rCh2, res: sCh2 } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/pair-challenge',
    principal: principal2,
    secret,
  });
  await handler(rCh2, sCh2);
  const code2 = sCh2.body.data.pairCode;

  const { req: rConflictUser, res: sConflictUser } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-owner' },
    body: { pairCode: code2 },
  });
  await handler(rConflictUser, sConflictUser);
  assert.equal(sConflictUser.statusCode, 409);
  assert.equal(sConflictUser.body.error.code, 'already-exists');
  assert.match(sConflictUser.body.error.message, /User account is already linked/i);

  // 11. GET method rejected with 405 Method Not Allowed and Allow: POST
  const { req: rMethod, res: sMethod } = createMockReqRes({
    method: 'GET',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(rMethod, sMethod);
  assert.equal(sMethod.statusCode, 405);
  assert.equal(sMethod.getHeader('allow'), 'POST');
});

test('every deployed Shrimply account-linking rewrite resolves to an authenticated management route', async () => {
  const { rewrites } = require('../vercel.json');
  const routes = rewrites.filter(({ source }) => source.startsWith('/api/sites-mcp/'));
  assert.equal(routes.length, 3);
  const handler = createReadOnlyApiHandler({ auth: createMockAuth(), db: createMockDb(createTestFixture()) });
  for (const { source, destination } of routes) {
    const url = new URL(destination).pathname;
    const route = matchRoute(url);
    assert.ok(route?.isManagement, `${source} must resolve to a management route`);
    const { req, res } = createMockReqRes({ method: source.endsWith('/status') ? 'GET' : 'POST', url });
    await handler(req, res);
    assert.equal(res.statusCode, 401, `${source} requires authentication`);
    assert.equal(res.body.error.code, 'unauthenticated');
  }
});

test('delegated farm API: rechecks technician block scope with test fake in operator, rejects disabled/deleted users', async () => {
  const secret = 'hmac-test-secret';
  const principal = `${FIXED_SITE_PROJECT_ID}:tech-principal`;
  const auth = createMockAuth({
    validTokens: { 'tok-tech': { uid: 'tech-a' } },
    disabledUsers: new Set(['disabled-uid']),
    deletedUsers: new Set(['deleted-uid']),
  });
  const db = createMockDb(createTestFixture());

  // Link tech-principal to tech-a (enterprise technician with assigned block blk-a only)
  const now = Date.now();
  db._store.sitePrincipalLinks[principal] = {
    principal,
    uid: 'tech-a',
    scope: ['farm:read'],
    audience: 'shrimply-admin',
    siteProjectId: FIXED_SITE_PROJECT_ID,
    firebaseAuthTime: Math.floor(now / 1000),
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 100000,
    active: true,
  };
  db._store.userSitePrincipalLinks['tech-a'] = { ...db._store.sitePrincipalLinks[principal] };

  const handler = createReadOnlyApiHandler({ auth, db, hmacSecret: secret });

  // 1. GET /api/integrations/v1/ponds with valid Site delegation -> 200
  // Test fake Firestore 'in' operator correctly filters enterprise technician block assignments!
  const { req: rPonds, res: sPonds } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds',
    principal,
    secret,
  });
  await handler(rPonds, sPonds);
  assert.equal(sPonds.statusCode, 200);
  assert.equal(sPonds.body.apiVersion, 'v1');
  assert.ok(Array.isArray(sPonds.body.data));
  assert.equal(sPonds.body.data.length, 1, 'Technician block scope must return only assigned ponds');
  assert.equal(sPonds.body.data[0].id, 'pond-a1');

  // 2. Technician accessing assigned pond-a1 summary -> 200
  const { req: rPondA, res: sPondA } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds/pond-a1/summary',
    principal,
    secret,
  });
  await handler(rPondA, sPondA);
  assert.equal(sPondA.statusCode, 200);
  assert.equal(sPondA.body.data.id, 'pond-a1');

  // 3. Technician accessing unassigned pond-b1 summary -> 404 (prevents pond enumeration)
  const { req: rPondB, res: sPondB } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds/pond-b1/summary',
    principal,
    secret,
  });
  await handler(rPondB, sPondB);
  assert.equal(sPondB.statusCode, 404);

  // 4. Replay attack: reusing exact same nonce -> 409 already-exists
  const fixedNonce = 'nonce-fixed-replay';
  const { req: rOriginal, res: sOriginal } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds',
    principal,
    secret,
    nonce: fixedNonce,
  });
  await handler(rOriginal, sOriginal);
  assert.equal(sOriginal.statusCode, 200);

  const { req: rReplay, res: sReplay } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds',
    principal,
    secret,
    nonce: fixedNonce,
  });
  await handler(rReplay, sReplay);
  assert.equal(sReplay.statusCode, 409);
  assert.equal(sReplay.body.error.code, 'already-exists');
  assert.match(sReplay.body.error.message, /Nonce has already been used/i);

  // 5. Disabled Firebase Auth user -> rejected with 403 permission-denied
  const disabledPrincipal = `${FIXED_SITE_PROJECT_ID}:disabled-principal`;
  db._store.sitePrincipalLinks[disabledPrincipal] = {
    principal: disabledPrincipal,
    uid: 'disabled-uid',
    scope: ['farm:read'],
    audience: 'shrimply-admin',
    siteProjectId: FIXED_SITE_PROJECT_ID,
    firebaseAuthTime: Math.floor(now / 1000),
    createdAt: now,
    expiresAt: now + 100000,
    active: true,
  };
  const { req: rDis, res: sDis } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds',
    principal: disabledPrincipal,
    secret,
  });
  await handler(rDis, sDis);
  assert.equal(sDis.statusCode, 403);
  assert.equal(sDis.body.error.code, 'permission-denied');
  assert.match(sDis.body.error.message, /User account is disabled/i);

  // 6. Deleted Firebase Auth user -> rejected with 403 permission-denied
  const deletedPrincipal = `${FIXED_SITE_PROJECT_ID}:deleted-principal`;
  db._store.sitePrincipalLinks[deletedPrincipal] = {
    principal: deletedPrincipal,
    uid: 'deleted-uid',
    scope: ['farm:read'],
    audience: 'shrimply-admin',
    siteProjectId: FIXED_SITE_PROJECT_ID,
    firebaseAuthTime: Math.floor(now / 1000),
    createdAt: now,
    expiresAt: now + 100000,
    active: true,
  };
  const { req: rDel, res: sDel } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds',
    principal: deletedPrincipal,
    secret,
  });
  await handler(rDel, sDel);
  assert.equal(sDel.statusCode, 403);
  assert.equal(sDel.body.error.code, 'permission-denied');
  assert.match(sDel.body.error.message, /User account not found or has been deleted/i);
});

test('delegated farm API: Firebase refresh-token revocation disables an existing Site grant', async () => {
  const secret = 'hmac-test-secret';
  const principal = `${FIXED_SITE_PROJECT_ID}:revoked-session-user`;
  const authTime = Math.floor(Date.now() / 1000) - 60;
  const tokenValidity = { 'owner-uid': new Date(0).toISOString() };
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid', auth_time: authTime } },
    tokensValidAfterTimeByUid: tokenValidity,
  });
  const db = createMockDb(createTestFixture());
  const handler = createReadOnlyApiHandler({ auth, db, hmacSecret: secret });

  const { req: challengeReq, res: challengeRes } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/pair-challenge',
    principal,
    secret,
  });
  await handler(challengeReq, challengeRes);
  assert.equal(challengeRes.statusCode, 200);

  const pairCode = challengeRes.body.data.pairCode;
  const { req: pairReq, res: pairRes } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/pair',
    headers: { authorization: 'Bearer tok-owner' },
    body: { pairCode },
  });
  await handler(pairReq, pairRes);
  assert.equal(pairRes.statusCode, 200);
  assert.equal(db._store.sitePrincipalLinks[principal].firebaseAuthTime, authTime);

  // Simulate revokeRefreshTokens after pairing while the Auth account remains enabled.
  tokenValidity['owner-uid'] = new Date((authTime + 1) * 1000).toISOString();
  const { req: readReq, res: readRes } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/ponds',
    principal,
    secret,
  });
  await handler(readReq, readRes);
  assert.equal(readRes.statusCode, 403);
  assert.equal(readRes.body.error.code, 'permission-denied');
  assert.match(readRes.body.error.message, /Firebase session was revoked/i);
});

test('management: revocation and status verify link requirements and reject revoked tokens', async () => {
  const secret = 'hmac-test-secret';
  const principal = `${FIXED_SITE_PROJECT_ID}:site-p1`;
  const auth = createMockAuth({
    validTokens: { 'tok-owner': { uid: 'owner-uid' } },
    revokedTokens: new Set(['tok-revoked']),
  });
  const db = createMockDb(createTestFixture());
  const now = Date.now();
  db._store.sitePrincipalLinks[principal] = {
    principal,
    uid: 'owner-uid',
    scope: ['farm:read'],
    audience: 'shrimply-admin',
    siteProjectId: FIXED_SITE_PROJECT_ID,
    firebaseAuthTime: Math.floor(now / 1000),
    createdAt: now,
    expiresAt: now + 100000,
    active: true,
  };
  db._store.userSitePrincipalLinks['owner-uid'] = { ...db._store.sitePrincipalLinks[principal] };

  const handler = createReadOnlyApiHandler({ auth, db, hmacSecret: secret });

  // 1. Status via Bearer user
  const { req: rStatUser, res: sStatUser } = createMockReqRes({
    method: 'GET',
    url: '/api/integrations/v1/site-delegation/status',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(rStatUser, sStatUser);
  assert.equal(sStatUser.statusCode, 200);
  assert.equal(sStatUser.body.data.linked, true);
  assert.equal(Object.hasOwn(sStatUser.body.data, 'principal'), false);

  // 2. Status via Site delegation
  const { req: rStatSite, res: sStatSite } = createSignedSiteReq({
    method: 'GET',
    path: '/api/integrations/v1/site-delegation/status',
    principal,
    secret,
  });
  await handler(rStatSite, sStatSite);
  assert.equal(sStatSite.statusCode, 200);
  assert.equal(sStatSite.body.data.linked, true);

  // 3. Revoke via Site delegation
  const { req: rRevSite, res: sRevSite } = createSignedSiteReq({
    method: 'POST',
    path: '/api/integrations/v1/site-delegation/revoke',
    principal,
    secret,
  });
  await handler(rRevSite, sRevSite);
  assert.equal(sRevSite.statusCode, 200);
  assert.equal(sRevSite.body.data.revoked, true);

  // Status after revoke shows unlinked
  const { req: rStatAfter, res: sStatAfter } = createMockReqRes({
    method: 'GET',
    url: '/api/integrations/v1/site-delegation/status',
    headers: { authorization: 'Bearer tok-owner' },
  });
  await handler(rStatAfter, sStatAfter);
  assert.equal(sStatAfter.statusCode, 200);
  assert.equal(sStatAfter.body.data.linked, false);

  // Revocation/Status with revoked token -> 401 unauthenticated
  const { req: rRevRevoked, res: sRevRevoked } = createMockReqRes({
    method: 'POST',
    url: '/api/integrations/v1/site-delegation/revoke',
    headers: { authorization: 'Bearer tok-revoked' },
  });
  await handler(rRevRevoked, sRevRevoked);
  assert.equal(sRevRevoked.statusCode, 401);
});

test('index: exports readOnlyApi as a single v2 request handler', () => {
  const index = require('./index');
  assert.ok(typeof index.readOnlyApi === 'function');
});
