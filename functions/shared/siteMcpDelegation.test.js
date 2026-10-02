'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  DEFAULT_CHALLENGE_TTL_SECONDS,
  MAX_CHALLENGE_TTL_SECONDS,
  MAX_CLOCK_SKEW_MS,
  FIXED_SITE_PROJECT_ID,
  DEFAULT_SITE_AUDIENCE,
  REQUIRED_SCOPE,
  PAIR_CHALLENGES_COLLECTION,
  SITE_LINKS_COLLECTION,
  USER_LINKS_COLLECTION,
  NONCES_COLLECTION,
  hashPairCode,
  generatePairCode,
  computeBodyHash,
  canonicalizeQuery,
  canonicalizePath,
  buildCanonicalRequest,
  computeHmacSignature,
  timingSafeEqualHex,
  verifyHmacSignature,
  verifyAndRecordNonce,
  createPairChallenge,
  consumePairChallenge,
  revokeLinkByUid,
  revokeLinkByPrincipal,
  getLinkForPrincipal,
  getLinkForUid,
  hasCallerSuppliedUid,
  hasForbiddenPairCompleteInputs,
  isSiteDelegationRequest,
  extractDelegationHeaders,
  verifySiteDelegatedRequest,
  isValidSitePrincipal,
} = require('./siteMcpDelegation');

const createMockMemoryDb = (initialData = {}) => {
  const store = {};
  for (const [coll, docs] of Object.entries(initialData)) {
    store[coll] = { ...docs };
  }

  const getDoc = (coll, id) => {
    const val = store[coll]?.[id];
    return {
      id,
      _collName: coll,
      exists: val !== undefined && val !== null,
      data: () => (val !== undefined && val !== null ? JSON.parse(JSON.stringify(val)) : undefined),
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

  return {
    _store: store,
    collection: (collName) => ({
      doc: (docId) => ({
        id: docId,
        _collName: collName,
        get: async () => getDoc(collName, docId),
        set: async (val, opts) => setDoc(collName, docId, val, opts),
        update: async (val) => updateDoc(collName, docId, val),
        delete: async () => deleteDoc(collName, docId),
      }),
    }),
    runTransaction: async (updateFunction) => {
      const tx = {
        get: async (ref) => getDoc(ref._collName, ref.id),
        set: (ref, val, opts) => setDoc(ref._collName, ref.id, val, opts),
        update: (ref, val) => updateDoc(ref._collName, ref.id, val),
        delete: (ref) => deleteDoc(ref._collName, ref.id),
      };
      return updateFunction(tx);
    },
  };
};

test('pair codes: Site obtains challenge with 32 cryptographically random bytes, 5-minute expiry, hashed storage', async () => {
  const db = createMockMemoryDb();
  const principal = `${FIXED_SITE_PROJECT_ID}:site-user-123`;

  const challenge = await createPairChallenge({ db, principal, ttlSeconds: 300 });
  assert.ok(challenge.pairCode);
  assert.equal(typeof challenge.pairCode, 'string');
  assert.ok(challenge.pairCode.length >= 48, 'Pair code must have at least 24 bytes (48 hex characters)');
  assert.equal(challenge.expiresInSeconds, 300);
  assert.ok(challenge.expiresAt > Date.now());

  const expectedHash = hashPairCode(challenge.pairCode);
  const doc = db._store[PAIR_CHALLENGES_COLLECTION]?.[expectedHash];
  assert.ok(doc, 'Challenge document must be stored using SHA-256 hash as key');
  assert.equal(doc.codeHash, expectedHash);
  assert.equal(doc.principal, principal, 'Challenge must be bound to the exact requesting principal');
  assert.equal(doc.used, false);
  assert.equal(Object.values(doc).includes(challenge.pairCode), false, 'Plaintext pair code must not be in Firestore');

  const overlong = await createPairChallenge({ db, principal, ttlSeconds: 600 });
  assert.equal(overlong.expiresInSeconds, MAX_CHALLENGE_TTL_SECONDS, 'Challenge lifetime must never exceed five minutes');
  await assert.rejects(
    createPairChallenge({ db, principal: 'not-a-site-principal' }),
    (err) => err.code === 'unauthenticated',
  );
  assert.equal(isValidSitePrincipal(principal), true);
});

test('pair codes: Shrimply user completes pairing, deriving principal from stored challenge', async () => {
  const db = createMockMemoryDb();
  const principal = `${FIXED_SITE_PROJECT_ID}:user-alice`;
  const uid = 'shrimply-user-alice';

  // 1. Site creates challenge bound to principal
  const { pairCode } = await createPairChallenge({ db, principal });

  // 2. User completes pairing with their authenticated UID
  const res = await consumePairChallenge({ db, pairCode, uid, firebaseAuthTime: Math.floor(Date.now() / 1000) });
  assert.equal(res.success, true);
  assert.equal(Object.hasOwn(res, 'principal'), false);
  assert.equal(Object.hasOwn(res, 'uid'), false);

  // Challenge marked used
  const hash = hashPairCode(pairCode);
  assert.equal(db._store[PAIR_CHALLENGES_COLLECTION][hash].used, true);

  // Link documents created with scope, audience, and expiry
  const siteLink = db._store[SITE_LINKS_COLLECTION][principal];
  const userLink = db._store[USER_LINKS_COLLECTION][uid];
  assert.ok(siteLink);
  assert.ok(userLink);
  assert.deepEqual(siteLink.scope, [REQUIRED_SCOPE]);
  assert.equal(siteLink.audience, DEFAULT_SITE_AUDIENCE);
  assert.equal(siteLink.siteProjectId, FIXED_SITE_PROJECT_ID);
  assert.ok(siteLink.expiresAt > Date.now());

  // 3. Consume second time -> rejects as single-use
  await assert.rejects(
    consumePairChallenge({ db, pairCode, uid, firebaseAuthTime: Math.floor(Date.now() / 1000) }),
    (err) => err.code === 'invalid-argument' && /already been used/i.test(err.message),
  );

  // 4. Expired code -> rejects
  const expiredCode = generatePairCode(32);
  const expiredHash = hashPairCode(expiredCode);
  db._store[PAIR_CHALLENGES_COLLECTION][expiredHash] = {
    codeHash: expiredHash,
    principal: `${FIXED_SITE_PROJECT_ID}:user-bob`,
    createdAt: Date.now() - 20000,
    expiresAt: Date.now() - 1000,
    used: false,
  };

  await assert.rejects(
    consumePairChallenge({ db, pairCode: expiredCode, uid: 'user-bob', firebaseAuthTime: Math.floor(Date.now() / 1000) }),
    (err) => err.code === 'invalid-argument' && /expired/i.test(err.message),
  );

  const noExpiryCode = generatePairCode(32);
  const noExpiryHash = hashPairCode(noExpiryCode);
  db._store[PAIR_CHALLENGES_COLLECTION][noExpiryHash] = {
    codeHash: noExpiryHash,
    principal,
    createdAt: Date.now(),
    used: false,
  };
  await assert.rejects(
    consumePairChallenge({ db, pairCode: noExpiryCode, uid, firebaseAuthTime: Math.floor(Date.now() / 1000) }),
    (err) => err.code === 'invalid-argument' && /expired/i.test(err.message),
    'Missing challenge expiry must fail closed',
  );
});

test('link mapping: enforces 1:1 mapping between Site principal and Firebase UID', async () => {
  const db = createMockMemoryDb();

  const principal1 = `${FIXED_SITE_PROJECT_ID}:principal-1`;
  const principal2 = `${FIXED_SITE_PROJECT_ID}:principal-2`;
  // Site creates challenge for principal-1, user-1 completes pairing
  const code1 = (await createPairChallenge({ db, principal: principal1 })).pairCode;
  await consumePairChallenge({ db, pairCode: code1, uid: 'uid-1', firebaseAuthTime: Math.floor(Date.now() / 1000) });

  // Check Firestore mappings exist
  assert.equal(db._store[SITE_LINKS_COLLECTION][principal1].uid, 'uid-1');
  assert.equal(db._store[USER_LINKS_COLLECTION]['uid-1'].principal, principal1);

  // Attempt to link principal-1 with user-2 -> ALREADY_EXISTS 409
  const code2 = (await createPairChallenge({ db, principal: principal1 })).pairCode;
  await assert.rejects(
    consumePairChallenge({ db, pairCode: code2, uid: 'uid-2', firebaseAuthTime: Math.floor(Date.now() / 1000) }),
    (err) => err.code === 'already-exists' && /Site principal is already linked/i.test(err.message),
  );

  // Attempt to link user-1 with principal-2 -> ALREADY_EXISTS 409
  const code3 = (await createPairChallenge({ db, principal: principal2 })).pairCode;
  await assert.rejects(
    consumePairChallenge({ db, pairCode: code3, uid: 'uid-1', firebaseAuthTime: Math.floor(Date.now() / 1000) }),
    (err) => err.code === 'already-exists' && /User account is already linked/i.test(err.message),
  );
});

test('revocation: atomically deletes both links', async () => {
  const db = createMockMemoryDb();

  const principal = `${FIXED_SITE_PROJECT_ID}:principal-alice`;
  const { pairCode } = await createPairChallenge({ db, principal });
  await consumePairChallenge({ db, pairCode, uid: 'uid-alice', firebaseAuthTime: Math.floor(Date.now() / 1000) });

  assert.ok(await getLinkForPrincipal({ db, principal }));
  assert.ok(await getLinkForUid({ db, uid: 'uid-alice' }));

  // Revoke by UID
  const rev1 = await revokeLinkByUid({ db, uid: 'uid-alice' });
  assert.equal(rev1.revoked, true);
  assert.equal(await getLinkForPrincipal({ db, principal }), null);
  assert.equal(await getLinkForUid({ db, uid: 'uid-alice' }), null);

  // Idempotent second revoke
  const rev2 = await revokeLinkByUid({ db, uid: 'uid-alice' });
  assert.equal(rev2.revoked, false);

  // Re-link and revoke by principal
  const { pairCode: codeNew } = await createPairChallenge({ db, principal });
  await consumePairChallenge({ db, pairCode: codeNew, uid: 'uid-alice', firebaseAuthTime: Math.floor(Date.now() / 1000) });
  const rev3 = await revokeLinkByPrincipal({ db, principal });
  assert.equal(rev3.revoked, true);
  assert.equal(await getLinkForPrincipal({ db, principal }), null);
  assert.equal(await getLinkForUid({ db, uid: 'uid-alice' }), null);
});

test('HMAC: canonical request binds method, path/query, timestamp, nonce, principal, bodyHash', () => {
  const req1 = buildCanonicalRequest({
    method: 'get',
    path: '/readOnlyApi/api/integrations/v1/ponds/',
    query: { limit: 20, block_id: 'blk-1' },
    timestamp: 1775195294000,
    nonce: 'nonce-123',
    principal: `${FIXED_SITE_PROJECT_ID}:site-user-1`,
    bodyHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });

  const expected = [
    'GET',
    '/api/integrations/v1/ponds?block_id=blk-1&limit=20',
    '1775195294000',
    'nonce-123',
    `${FIXED_SITE_PROJECT_ID}:site-user-1`,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ].join('\n');

  assert.equal(req1, expected);
});

test('HMAC: signature generation and timing-safe verification', () => {
  const secret = 'super-secret-hmac-key';
  const stringToSign = 'GET\n/api/integrations/v1/ponds\n1775195294000\nnonce-1\nsite-user-1\nhash123';

  const sig = computeHmacSignature({ secret, stringToSign });
  assert.ok(sig);
  assert.equal(typeof sig, 'string');

  // Valid verification
  assert.equal(verifyHmacSignature({ signature: sig, secret, stringToSign }), true);

  // Tampered signature
  const tamperedSig = sig.slice(0, -1) + (sig.endsWith('a') ? 'b' : 'a');
  assert.equal(verifyHmacSignature({ signature: tamperedSig, secret, stringToSign }), false);

  // Tampered message
  assert.equal(verifyHmacSignature({ signature: sig, secret, stringToSign: stringToSign + 'x' }), false);

  // Wrong secret
  assert.equal(verifyHmacSignature({ signature: sig, secret: 'wrong-key', stringToSign }), false);

  // Timing safe comparison handles length mismatch safely
  assert.equal(timingSafeEqualHex(sig, 'short'), false);
  assert.equal(timingSafeEqualHex(null, sig), false);
});

test('nonce uniqueness: atomic Firestore state prevents replay attacks', async () => {
  const db = createMockMemoryDb();
  const principal = `${FIXED_SITE_PROJECT_ID}:site-principal-1`;
  const nonce = 'unique-nonce-xyz';
  const timestamp = Date.now();

  // First use -> succeeds
  await verifyAndRecordNonce({ db, principal, nonce, timestamp });

  // Nonce recorded
  const nonceKey = `${encodeURIComponent(principal)}_${encodeURIComponent(nonce)}`;
  assert.ok(db._store[NONCES_COLLECTION][nonceKey]);

  // Second use with same nonce -> fails with already-exists
  await assert.rejects(
    verifyAndRecordNonce({ db, principal, nonce, timestamp }),
    (err) => err.code === 'already-exists' && /already been used/i.test(err.message),
  );

  // Stale timestamp (> 5 min) -> rejected as unauthenticated
  await assert.rejects(
    verifyAndRecordNonce({ db, principal, nonce: 'nonce-new', timestamp: Date.now() - 6 * 60 * 1000 }),
    (err) => err.code === 'unauthenticated' && /window/i.test(err.message),
  );
});

test('security: caller-supplied UID/email and pair-complete inputs are strictly rejected', () => {
  assert.equal(hasCallerSuppliedUid({ query: { uid: 'attacker-uid' } }), true);
  assert.equal(hasCallerSuppliedUid({ query: { userId: 'attacker-uid' } }), true);
  assert.equal(hasCallerSuppliedUid({ query: { email: 'attacker@example.com' } }), true);
  assert.equal(hasCallerSuppliedUid({ headers: { 'x-user-id': 'attacker-uid' } }), true);
  assert.equal(hasCallerSuppliedUid({ headers: { 'x-firebase-uid': 'attacker-uid' } }), true);
  assert.equal(hasCallerSuppliedUid({ body: { uid: 'attacker-uid' } }), true);

  // Valid inputs without UID
  assert.equal(hasCallerSuppliedUid({ query: { limit: '20' }, headers: {}, body: {} }), false);

  // hasForbiddenPairCompleteInputs rejects uid, email, principal
  assert.equal(hasForbiddenPairCompleteInputs({ body: { uid: 'user-1' } }), true);
  assert.equal(hasForbiddenPairCompleteInputs({ body: { email: 'user@example.com' } }), true);
  assert.equal(hasForbiddenPairCompleteInputs({ body: { principal: 'principal-1' } }), true);
  assert.equal(hasForbiddenPairCompleteInputs({ query: { principal: 'principal-1' } }), true);
  assert.equal(hasForbiddenPairCompleteInputs({ body: { pairCode: 'some-code' } }), false);
});

test('verifySiteDelegatedRequest: verifies link, expiry, farm:read scope, and audience', async () => {
  const db = createMockMemoryDb();
  const secret = 'test-secret-456';
  const principal = `${FIXED_SITE_PROJECT_ID}:site-user-test`;
  const uid = 'shrimply-firebase-uid-1';

  // 1. Allow unlinked principal ONLY when requireLinkedPrincipal is false (pair-challenge)
  const timestamp = Date.now();
  const nonce1 = 'nonce-test-challenge';
  const path = '/api/integrations/v1/site-delegation/pair-challenge';
  const bodyHash1 = computeBodyHash(null);
  const sig1 = computeHmacSignature({
    secret,
    stringToSign: buildCanonicalRequest({
      method: 'POST',
      path,
      query: {},
      timestamp,
      nonce: nonce1,
      principal,
      bodyHash: bodyHash1,
    }),
  });

  const unlinkedReq = {
    method: 'POST',
    url: path,
    path,
    query: {},
    headers: {
      'x-mcp-signature': sig1,
      'x-mcp-timestamp': String(timestamp),
      'x-mcp-nonce': nonce1,
      'x-mcp-principal': principal,
    },
    body: null,
  };

  const challengeAuthRes = await verifySiteDelegatedRequest({
    req: unlinkedReq,
    db,
    hmacSecret: secret,
    rawBody: null,
    pathname: path,
    query: {},
    requireLinkedPrincipal: false, // allowed for pair-challenge!
  });
  assert.equal(challengeAuthRes.principal, principal);
  assert.equal(challengeAuthRes.uid, null);

  // 2. Reject unlinked principal when requireLinkedPrincipal is true (farm reads)
  const nonce2 = 'nonce-test-read';
  const readPath = '/api/integrations/v1/ponds';
  const bodyHash2 = computeBodyHash(null);
  const sig2 = computeHmacSignature({
    secret,
    stringToSign: buildCanonicalRequest({
      method: 'GET',
      path: readPath,
      query: {},
      timestamp,
      nonce: nonce2,
      principal,
      bodyHash: bodyHash2,
    }),
  });

  const readReq = {
    method: 'GET',
    url: readPath,
    path: readPath,
    query: {},
    headers: {
      'x-mcp-signature': sig2,
      'x-mcp-timestamp': String(timestamp),
      'x-mcp-nonce': nonce2,
      'x-mcp-principal': principal,
    },
    body: null,
  };

  await assert.rejects(
    verifySiteDelegatedRequest({
      req: readReq,
      db,
      hmacSecret: secret,
      rawBody: null,
      pathname: readPath,
      query: {},
      requireLinkedPrincipal: true,
    }),
    (err) => err.code === 'permission-denied' && /not linked/i.test(err.message),
  );

  // 3. Active link with farm:read scope and audience succeeds
  db._store[SITE_LINKS_COLLECTION] = {
    [principal]: {
      principal,
      uid,
      scope: ['farm:read'],
      audience: 'shrimply-admin',
      siteProjectId: FIXED_SITE_PROJECT_ID,
      firebaseAuthTime: Math.floor(Date.now() / 1000),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 100000,
      active: true,
    },
  };

  const nonce3 = 'nonce-test-read-active';
  const sig3 = computeHmacSignature({
    secret,
    stringToSign: buildCanonicalRequest({
      method: 'GET',
      path: readPath,
      query: {},
      timestamp,
      nonce: nonce3,
      principal,
      bodyHash: bodyHash2,
    }),
  });

  const activeReq = {
    ...readReq,
    headers: {
      ...readReq.headers,
      'x-mcp-signature': sig3,
      'x-mcp-nonce': nonce3,
    },
  };

  const activeRes = await verifySiteDelegatedRequest({
    req: activeReq,
    db,
    hmacSecret: secret,
    rawBody: null,
    pathname: readPath,
    query: {},
    requireLinkedPrincipal: true,
  });
  assert.equal(activeRes.principal, principal);
  assert.equal(activeRes.uid, uid);

  // 4. Expired link -> rejected with permission-denied
  db._store[SITE_LINKS_COLLECTION][principal].expiresAt = Date.now() - 1000;
  const nonce4 = 'nonce-test-read-expired';
  const sig4 = computeHmacSignature({
    secret,
    stringToSign: buildCanonicalRequest({
      method: 'GET',
      path: readPath,
      query: {},
      timestamp,
      nonce: nonce4,
      principal,
      bodyHash: bodyHash2,
    }),
  });

  await assert.rejects(
    verifySiteDelegatedRequest({
      req: { ...readReq, headers: { ...readReq.headers, 'x-mcp-signature': sig4, 'x-mcp-nonce': nonce4 } },
      db,
      hmacSecret: secret,
      rawBody: null,
      pathname: readPath,
      query: {},
      requireLinkedPrincipal: true,
    }),
    (err) => err.code === 'permission-denied' && /expired/i.test(err.message),
  );

  // 5. Missing farm:read scope -> rejected with permission-denied
  db._store[SITE_LINKS_COLLECTION][principal].expiresAt = Date.now() + 100000;
  db._store[SITE_LINKS_COLLECTION][principal].scope = ['other:scope'];
  const nonce5 = 'nonce-test-read-noscope';
  const sig5 = computeHmacSignature({
    secret,
    stringToSign: buildCanonicalRequest({
      method: 'GET',
      path: readPath,
      query: {},
      timestamp,
      nonce: nonce5,
      principal,
      bodyHash: bodyHash2,
    }),
  });

  await assert.rejects(
    verifySiteDelegatedRequest({
      req: { ...readReq, headers: { ...readReq.headers, 'x-mcp-signature': sig5, 'x-mcp-nonce': nonce5 } },
      db,
      hmacSecret: secret,
      rawBody: null,
      pathname: readPath,
      query: {},
      requireLinkedPrincipal: true,
    }),
    (err) => err.code === 'permission-denied' && /farm:read/i.test(err.message),
  );

  // 6. Audience mismatch -> rejected with permission-denied
  db._store[SITE_LINKS_COLLECTION][principal].scope = ['farm:read'];
  db._store[SITE_LINKS_COLLECTION][principal].audience = 'malicious-site';
  const nonce6 = 'nonce-test-read-bad-aud';
  const sig6 = computeHmacSignature({
    secret,
    stringToSign: buildCanonicalRequest({
      method: 'GET',
      path: readPath,
      query: {},
      timestamp,
      nonce: nonce6,
      principal,
      bodyHash: bodyHash2,
    }),
  });

  await assert.rejects(
    verifySiteDelegatedRequest({
      req: { ...readReq, headers: { ...readReq.headers, 'x-mcp-signature': sig6, 'x-mcp-nonce': nonce6 } },
      db,
      hmacSecret: secret,
      rawBody: null,
      pathname: readPath,
      query: {},
      requireLinkedPrincipal: true,
    }),
    (err) => err.code === 'permission-denied' && /audience/i.test(err.message),
  );
});

test('verifySiteDelegatedRequest: rejects missing or mismatched grant metadata', async () => {
  const db = createMockMemoryDb();
  const secret = 'test-secret-link-metadata';
  const principal = `${FIXED_SITE_PROJECT_ID}:metadata-user`;
  const uid = 'metadata-firebase-user';
  const path = '/api/integrations/v1/ponds';
  const timestamp = Date.now();
  let nonceIndex = 0;
  const call = () => {
    const nonce = `metadata-nonce-${++nonceIndex}`;
    const signature = computeHmacSignature({
      secret,
      stringToSign: buildCanonicalRequest({
        method: 'GET', path, query: {}, timestamp, nonce, principal,
        bodyHash: computeBodyHash(null),
      }),
    });
    return verifySiteDelegatedRequest({
      req: {
        method: 'GET', url: path, path, query: {}, body: null,
        headers: {
          'x-mcp-signature': signature,
          'x-mcp-timestamp': String(timestamp),
          'x-mcp-nonce': nonce,
          'x-mcp-principal': principal,
        },
      },
      db,
      hmacSecret: secret,
      rawBody: null,
      pathname: path,
      query: {},
      requireLinkedPrincipal: true,
    });
  };
  const validLink = () => ({
    principal,
    uid,
    scope: [REQUIRED_SCOPE],
    audience: DEFAULT_SITE_AUDIENCE,
    siteProjectId: FIXED_SITE_PROJECT_ID,
    expiresAt: Date.now() + 60_000,
    active: true,
  });

  db._store[SITE_LINKS_COLLECTION] = { [principal]: { ...validLink(), expiresAt: undefined } };
  await assert.rejects(call(), (err) => err.code === 'permission-denied');

  db._store[SITE_LINKS_COLLECTION][principal] = { ...validLink(), audience: undefined };
  await assert.rejects(call(), (err) => err.code === 'permission-denied');

  db._store[SITE_LINKS_COLLECTION][principal] = { ...validLink(), siteProjectId: 'another-site' };
  await assert.rejects(call(), (err) => err.code === 'permission-denied');

  db._store[SITE_LINKS_COLLECTION][principal] = { ...validLink(), active: false };
  await assert.rejects(call(), (err) => err.code === 'permission-denied');
});
