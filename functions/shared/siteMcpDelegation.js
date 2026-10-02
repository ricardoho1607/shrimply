'use strict';

const crypto = require('crypto');
const { Buffer } = require('node:buffer');

let HttpsError;
try {
  ({ HttpsError } = require('firebase-functions/v2/https'));
} catch (_) {
  HttpsError = class extends Error {
    constructor(code, message, details) {
      super(message);
      this.name = 'HttpsError';
      this.code = code;
      this.details = details;
    }
  };
}

const DEFAULT_CHALLENGE_TTL_SECONDS = 300; // 5 minutes
const DEFAULT_PAIR_CODE_TTL_SECONDS = 300; // alias for compatibility
const MAX_CHALLENGE_TTL_SECONDS = 300;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const FIXED_SITE_PROJECT_ID = 'appgprj_6abf1e24ec788191aa23baf12230025e';
const DEFAULT_SITE_AUDIENCE = 'shrimply-admin';
const REQUIRED_SCOPE = 'farm:read';

const PAIR_CHALLENGES_COLLECTION = 'siteMcpPairChallenges';
const SITE_LINKS_COLLECTION = 'sitePrincipalLinks';
const USER_LINKS_COLLECTION = 'userSitePrincipalLinks';
const NONCES_COLLECTION = 'siteMcpNonces';

/**
 * Computes a SHA-256 hex digest of a pair code.
 * Plaintext pair codes are never stored in Firestore.
 */
const hashPairCode = (code) => {
  if (typeof code !== 'string' || !code.trim()) {
    throw new HttpsError('invalid-argument', 'Invalid pair code.');
  }
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
};

/**
 * Generates a cryptographically random pair code (at least 24 bytes, prefer 32).
 */
const generatePairCode = (bytes = 32) => {
  const byteCount = Math.max(24, bytes);
  return crypto.randomBytes(byteCount).toString('hex');
};

/**
 * Computes SHA-256 hex hash of request body.
 */
const computeBodyHash = (body) => {
  if (body === null || body === undefined) {
    return crypto.createHash('sha256').update('').digest('hex');
  }
  if (typeof body === 'string') {
    return crypto.createHash('sha256').update(body).digest('hex');
  }
  if (Buffer.isBuffer(body)) {
    return crypto.createHash('sha256').update(body).digest('hex');
  }
  if (typeof body === 'object') {
    return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  }
  return crypto.createHash('sha256').update(String(body)).digest('hex');
};

/**
 * Deterministically sorts and serializes query parameters.
 */
const canonicalizeQuery = (query) => {
  if (!query) return '';
  let entries = [];
  if (typeof query === 'string') {
    const params = new URLSearchParams(query);
    entries = Array.from(params.entries());
  } else if (typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          entries.push([k, String(item)]);
        }
      } else {
        entries.push([k, String(v)]);
      }
    }
  }
  if (entries.length === 0) return '';
  entries.sort(([k1, v1], [k2, v2]) => {
    if (k1 < k2) return -1;
    if (k1 > k2) return 1;
    if (v1 < v2) return -1;
    if (v1 > v2) return 1;
    return 0;
  });
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
};

/**
 * Canonicalizes request pathname.
 */
const canonicalizePath = (path) => {
  if (!path || typeof path !== 'string') return '/';
  let p = path.split('?')[0].replace(/\/+/g, '/').replace(/\/+$/, '');
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/^\/readOnlyApi(?=\/|$)/i, '');
  if (!p) p = '/';
  return p;
};

/**
 * Builds canonical request string to sign:
 * Bound items: method, canonical path/query, timestamp, nonce, principal, body hash.
 */
const buildCanonicalRequest = ({
  method,
  path,
  pathname,
  query,
  timestamp,
  nonce,
  principal,
  bodyHash,
}) => {
  const m = String(method || '').toUpperCase().trim();
  const rawPath = pathname || path || '/';
  const cleanPath = canonicalizePath(rawPath);
  const cleanQuery = canonicalizeQuery(query);
  const canonicalPathQuery = cleanQuery ? `${cleanPath}?${cleanQuery}` : cleanPath;
  const ts = String(timestamp ?? '').trim();
  const n = String(nonce ?? '').trim();
  const pr = String(principal ?? '').trim();
  const bh = String(bodyHash ?? '').trim();

  return [m, canonicalPathQuery, ts, n, pr, bh].join('\n');
};

/**
 * Computes HMAC-SHA256 signature in hex.
 */
const computeHmacSignature = ({ secret, stringToSign }) => {
  if (!secret || typeof secret !== 'string') {
    throw new HttpsError('internal', 'HMAC secret is required to compute signature.');
  }
  return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
};

/**
 * Timing-safe comparison of strings.
 */
const timingSafeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Verifies HMAC signature using timing-safe comparison.
 */
const verifyHmacSignature = ({ signature, secret, stringToSign }) => {
  if (!signature || !secret || !stringToSign) return false;
  const expected = computeHmacSignature({ secret, stringToSign });
  return timingSafeEqualHex(signature, expected);
};

const runInTransaction = async (db, txFn) => {
  if (!db) throw new HttpsError('internal', 'Firestore db instance is required.');
  if (typeof db.runTransaction === 'function') {
    return db.runTransaction(txFn);
  }
  const tx = {
    get: async (ref) => ref.get(),
    set: (ref, data, opts) => ref.set(data, opts),
    update: (ref, data) => ref.update(data),
    delete: (ref) => ref.delete(),
  };
  return txFn(tx);
};

const isValidSitePrincipal = (principal) => {
  if (typeof principal !== 'string') return false;
  const clean = principal.trim();
  const prefix = `${FIXED_SITE_PROJECT_ID}:`;
  if (!clean.startsWith(prefix)) return false;
  const siteUserId = clean.slice(prefix.length);
  return siteUserId.length > 0 && siteUserId.length <= 256 &&
    !siteUserId.includes('/') && !/[\u0000-\u001f\u007f]/.test(siteUserId);
};

/**
 * Verifies timestamp window and ensures nonce uniqueness using atomic Firestore state.
 */
const verifyAndRecordNonce = async ({
  db,
  principal,
  nonce,
  timestamp,
  maxClockSkewMs = MAX_CLOCK_SKEW_MS,
}) => {
  if (!principal || typeof principal !== 'string' || !principal.trim()) {
    throw new HttpsError('unauthenticated', 'Missing or invalid principal.');
  }
  if (!nonce || typeof nonce !== 'string' || !nonce.trim()) {
    throw new HttpsError('unauthenticated', 'Missing or invalid nonce.');
  }

  const ts = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  if (!Number.isFinite(ts)) {
    throw new HttpsError('unauthenticated', 'Invalid timestamp.');
  }

  const now = Date.now();
  if (Math.abs(now - ts) > maxClockSkewMs) {
    throw new HttpsError('unauthenticated', 'Timestamp out of acceptable window.');
  }

  const cleanPrincipal = principal.trim();
  const cleanNonce = nonce.trim();
  const nonceKey = `${encodeURIComponent(cleanPrincipal)}_${encodeURIComponent(cleanNonce)}`;
  const nonceRef = db.collection(NONCES_COLLECTION).doc(nonceKey);

  await runInTransaction(db, async (tx) => {
    const nonceSnap = await tx.get(nonceRef);
    if (nonceSnap?.exists) {
      throw new HttpsError('already-exists', 'Nonce has already been used.');
    }
    tx.set(nonceRef, {
      principal: cleanPrincipal,
      nonce: cleanNonce,
      timestamp: ts,
      createdAt: now,
      expiresAt: ts + maxClockSkewMs,
    });
  });

  return true;
};

/**
 * Creates a short-lived pairing challenge initiated by a signed Site Worker request.
 * Generates at least 24 (prefer 32) cryptographically random bytes.
 * Binds challenge to the exact Site principal and 5-minute expiry.
 * Plaintext code is returned only to Site caller; only SHA-256(code) is stored in Firestore.
 */
const createPairChallenge = async ({
  db,
  principal,
  ttlSeconds = DEFAULT_CHALLENGE_TTL_SECONDS,
}) => {
  if (!isValidSitePrincipal(principal)) {
    throw new HttpsError('unauthenticated', 'Valid Site principal is required to create a challenge.');
  }
  const cleanPrincipal = principal.trim();
  const ttl = Number.isInteger(ttlSeconds) && ttlSeconds >= 60 && ttlSeconds <= MAX_CHALLENGE_TTL_SECONDS
    ? ttlSeconds
    : DEFAULT_CHALLENGE_TTL_SECONDS;

  // Generate 32 cryptographically random bytes (64 hex characters)
  const pairCode = generatePairCode(32);
  const codeHash = hashPairCode(pairCode);
  const now = Date.now();
  const expiresAt = now + ttl * 1000;

  const challengeRef = db.collection(PAIR_CHALLENGES_COLLECTION).doc(codeHash);
  await challengeRef.set({
    codeHash,
    principal: cleanPrincipal,
    createdAt: now,
    expiresAt,
    used: false,
  });

  return {
    pairCode,
    expiresAt,
    expiresInSeconds: ttl,
  };
};

/**
 * Transactionally consumes a pair code submitted by a Firebase Bearer user in Shrimply Settings.
 * Derives UID only from decoded token and principal only from the stored challenge record.
 * Atomically creates the 1:1 server-side link mapping with farm:read scope, Site audience, and expiry.
 */
const consumePairChallenge = async ({
  db,
  pairCode,
  uid,
  firebaseAuthTime,
}) => {
  if (!pairCode || typeof pairCode !== 'string' || !pairCode.trim()) {
    throw new HttpsError('invalid-argument', 'Missing or invalid pair code.');
  }
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new HttpsError('unauthenticated', 'Authenticated user ID is required to complete pairing.');
  }
  if (!Number.isSafeInteger(firebaseAuthTime) || firebaseAuthTime <= 0 ||
      firebaseAuthTime > Math.floor(Date.now() / 1000) + (MAX_CLOCK_SKEW_MS / 1000)) {
    throw new HttpsError('unauthenticated', 'Verified Firebase authentication time is required to complete pairing.');
  }

  const cleanUid = uid.trim();
  const codeHash = hashPairCode(pairCode);

  return runInTransaction(db, async (tx) => {
    const challengeRef = db.collection(PAIR_CHALLENGES_COLLECTION).doc(codeHash);
    const challengeSnap = await tx.get(challengeRef);

    if (!challengeSnap?.exists) {
      throw new HttpsError('invalid-argument', 'Invalid pair code.');
    }

    const challenge = challengeSnap.data() || {};
    if (challenge.used) {
      throw new HttpsError('invalid-argument', 'Pair code has already been used.');
    }

    const now = Date.now();
    if (!Number.isFinite(challenge.expiresAt) || challenge.expiresAt <= now) {
      throw new HttpsError('invalid-argument', 'Pair code has expired.');
    }

    const targetPrincipal = challenge.principal;
    if (!targetPrincipal || typeof targetPrincipal !== 'string' || !targetPrincipal.trim()) {
      throw new HttpsError('internal', 'Pair challenge record corrupted: missing principal.');
    }

    const cleanPrincipal = targetPrincipal.trim();
    const principalLinkRef = db.collection(SITE_LINKS_COLLECTION).doc(cleanPrincipal);
    const userLinkRef = db.collection(USER_LINKS_COLLECTION).doc(cleanUid);

    const principalLinkSnap = await tx.get(principalLinkRef);
    const userLinkSnap = await tx.get(userLinkRef);

    // Link mapping is one Site principal to one Firebase UID and a Firebase UID to at most one Site principal
    if (principalLinkSnap?.exists) {
      const existing = principalLinkSnap.data() || {};
      if (existing.uid && existing.uid !== cleanUid) {
        throw new HttpsError('already-exists', 'Site principal is already linked to another Shrimply user.');
      }
    }

    if (userLinkSnap?.exists) {
      const existing = userLinkSnap.data() || {};
      if (existing.principal && existing.principal !== cleanPrincipal) {
        throw new HttpsError('already-exists', 'User account is already linked to another Site principal.');
      }
    }

    // Mark challenge as used (single use)
    tx.update(challengeRef, {
      used: true,
      usedAt: now,
      consumedByUid: cleanUid,
    });

    const linkPayload = {
      principal: cleanPrincipal,
      uid: cleanUid,
      scope: [REQUIRED_SCOPE],
      audience: DEFAULT_SITE_AUDIENCE,
      siteProjectId: FIXED_SITE_PROJECT_ID,
      firebaseAuthTime,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + (365 * 24 * 60 * 60 * 1000), // 1 year link expiry
      active: true,
    };

    tx.set(principalLinkRef, linkPayload);
    tx.set(userLinkRef, linkPayload);

    return {
      success: true,
      linkedAt: now,
    };
  });
};

/**
 * Revokes link mapping for a given Firebase UID.
 */
const revokeLinkByUid = async ({ db, uid }) => {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new HttpsError('invalid-argument', 'Valid UID is required to revoke link.');
  }
  const cleanUid = uid.trim();

  return runInTransaction(db, async (tx) => {
    const userLinkRef = db.collection(USER_LINKS_COLLECTION).doc(cleanUid);
    const userLinkSnap = await tx.get(userLinkRef);

    if (!userLinkSnap?.exists) {
      return { success: true, revoked: false };
    }

    const data = userLinkSnap.data() || {};
    const principal = data.principal;
    tx.delete(userLinkRef);

    if (principal && typeof principal === 'string') {
      const principalLinkRef = db.collection(SITE_LINKS_COLLECTION).doc(principal.trim());
      tx.delete(principalLinkRef);
    }

    return { success: true, revoked: true };
  });
};

/**
 * Revokes link mapping for a given Site principal.
 */
const revokeLinkByPrincipal = async ({ db, principal }) => {
  if (!principal || typeof principal !== 'string' || !principal.trim()) {
    throw new HttpsError('invalid-argument', 'Valid principal is required to revoke link.');
  }
  const cleanPrincipal = principal.trim();

  return runInTransaction(db, async (tx) => {
    const principalLinkRef = db.collection(SITE_LINKS_COLLECTION).doc(cleanPrincipal);
    const principalLinkSnap = await tx.get(principalLinkRef);

    if (!principalLinkSnap?.exists) {
      return { success: true, revoked: false };
    }

    const data = principalLinkSnap.data() || {};
    const uid = data.uid;
    tx.delete(principalLinkRef);

    if (uid && typeof uid === 'string') {
      const userLinkRef = db.collection(USER_LINKS_COLLECTION).doc(uid.trim());
      tx.delete(userLinkRef);
    }

    return { success: true, revoked: true };
  });
};

const getLinkForPrincipal = async ({ db, principal }) => {
  if (!principal || typeof principal !== 'string') return null;
  const snap = await db.collection(SITE_LINKS_COLLECTION).doc(principal.trim()).get();
  return snap?.exists ? snap.data() : null;
};

const getLinkForUid = async ({ db, uid }) => {
  if (!uid || typeof uid !== 'string') return null;
  const snap = await db.collection(USER_LINKS_COLLECTION).doc(uid.trim()).get();
  return snap?.exists ? snap.data() : null;
};

/**
 * Checks whether caller attempted to supply a Firebase UID or email in query, body, or headers.
 */
const hasCallerSuppliedUid = (req) => {
  if (!req) return false;
  const checkKeys = ['uid', 'userid', 'user_id', 'firebaseuid', 'firebase_uid', 'email'];

  // 1. Query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const normalized = key.toLowerCase().replace(/[-_]/g, '');
      if (checkKeys.includes(normalized) || checkKeys.includes(key.toLowerCase())) {
        return true;
      }
    }
  }

  // 2. Headers
  if (req.headers && typeof req.headers === 'object') {
    for (const [key, value] of Object.entries(req.headers)) {
      if (['x-user-id', 'x-firebase-uid', 'x-shrimply-uid', 'uid', 'userid', 'x-user-email'].includes(key.toLowerCase())) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return true;
      }
    }
  }

  // 3. Body
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    for (const key of Object.keys(req.body)) {
      const normalized = key.toLowerCase().replace(/[-_]/g, '');
      if (checkKeys.includes(normalized) || checkKeys.includes(key.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Checks whether pair-complete request contains forbidden uid, email, or principal in body or query.
 */
const hasForbiddenPairCompleteInputs = (req) => {
  if (!req) return false;
  const forbidden = [
    'uid',
    'userid',
    'user_id',
    'firebaseuid',
    'firebase_uid',
    'email',
    'useremail',
    'user_email',
    'principal',
    'siteprincipal',
    'site_principal',
  ];

  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const norm = key.toLowerCase().replace(/[-_]/g, '');
      if (forbidden.includes(norm) || forbidden.includes(key.toLowerCase())) return true;
    }
  }

  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    for (const key of Object.keys(req.body)) {
      const norm = key.toLowerCase().replace(/[-_]/g, '');
      if (forbidden.includes(norm) || forbidden.includes(key.toLowerCase())) return true;
    }
  }

  return false;
};

/**
 * Checks whether request carries Site delegation HMAC headers.
 */
const isSiteDelegationRequest = (req) => {
  if (!req?.headers) return false;
  return Boolean(
    req.headers['x-mcp-signature'] ||
    req.headers['x-site-signature'] ||
    req.headers['x-signature'] ||
    (typeof req.headers['authorization'] === 'string' &&
     (req.headers['authorization'].startsWith('HMAC-SHA256 ') || req.headers['authorization'].startsWith('Signature ')))
  );
};

const extractDelegationHeaders = (req) => {
  const headers = req?.headers || {};
  let signature =
    headers['x-mcp-signature'] ||
    headers['x-site-signature'] ||
    headers['x-signature'] ||
    null;

  if (!signature && typeof headers['authorization'] === 'string') {
    const auth = headers['authorization'];
    if (auth.startsWith('HMAC-SHA256 ')) {
      signature = auth.slice('HMAC-SHA256 '.length).trim();
    } else if (auth.startsWith('Signature ')) {
      signature = auth.slice('Signature '.length).trim();
    }
  }

  const timestamp =
    headers['x-mcp-timestamp'] ||
    headers['x-site-timestamp'] ||
    headers['x-timestamp'] ||
    headers['x-signature-timestamp'] ||
    null;

  const nonce =
    headers['x-mcp-nonce'] ||
    headers['x-site-nonce'] ||
    headers['x-nonce'] ||
    headers['x-signature-nonce'] ||
    null;

  const principal =
    headers['x-mcp-principal'] ||
    headers['x-site-principal'] ||
    headers['oai-authenticated-user-id'] ||
    headers['x-principal'] ||
    null;

  const headerBodyHash =
    headers['x-mcp-body-hash'] ||
    headers['x-site-body-hash'] ||
    headers['x-body-hash'] ||
    null;

  return {
    signature: signature ? String(signature).trim() : null,
    timestamp: timestamp ? String(timestamp).trim() : null,
    nonce: nonce ? String(nonce).trim() : null,
    principal: principal ? String(principal).trim() : null,
    headerBodyHash: headerBodyHash ? String(headerBodyHash).trim() : null,
  };
};

/**
 * Fully verifies a Site delegated request:
 * 1. Strictly rejects caller-supplied Firebase UIDs.
 * 2. Extracts HMAC timestamp, nonce, principal, signature, body hash.
 * 3. Verifies timestamp freshness and HMAC signature with timing-safe comparison.
 * 4. Atomically checks and records nonce uniqueness.
 * 5. If requireLinkedPrincipal (all data/status/revoke paths):
 *    - Resolves link from Firestore
 *    - Verifies link expiry, farm:read scope, and Site audience
 *    - Resolves linked Firebase UID
 */
const verifySiteDelegatedRequest = async ({
  req,
  db,
  hmacSecret,
  rawBody,
  pathname,
  query,
  requireLinkedPrincipal = true,
  expectedAudience = DEFAULT_SITE_AUDIENCE,
  requiredScope = REQUIRED_SCOPE,
}) => {
  if (hasCallerSuppliedUid(req)) {
    throw new HttpsError(
      'invalid-argument',
      'A Firebase UID is never accepted from Site request inputs; user identity is derived from verified delegation link.',
    );
  }

  const { signature, timestamp, nonce, principal, headerBodyHash } = extractDelegationHeaders(req);

  if (!signature || !timestamp || !nonce || !principal || !isValidSitePrincipal(principal)) {
    throw new HttpsError(
      'unauthenticated',
      'Missing required delegation headers (signature, timestamp, nonce, principal).',
    );
  }

  if (!hmacSecret || typeof hmacSecret !== 'string') {
    throw new HttpsError('internal', 'HMAC authentication is not configured.');
  }

  const effectiveBody = rawBody !== undefined ? rawBody : req.body;
  const computedBodyHash = computeBodyHash(effectiveBody);
  if (headerBodyHash && !timingSafeEqualHex(headerBodyHash, computedBodyHash)) {
    throw new HttpsError('unauthenticated', 'Body hash does not match request payload.');
  }

  const stringToSign = buildCanonicalRequest({
    method: req.method,
    pathname: pathname || req.path || req.url,
    query: query !== undefined ? query : req.query,
    timestamp,
    nonce,
    principal,
    bodyHash: computedBodyHash,
  });

  const isValidSig = verifyHmacSignature({
    signature,
    secret: hmacSecret,
    stringToSign,
  });

  if (!isValidSig) {
    throw new HttpsError('unauthenticated', 'Invalid HMAC signature.');
  }

  await verifyAndRecordNonce({
    db,
    principal,
    nonce,
    timestamp,
  });

  let linkedUid = null;
  let link = null;

  if (requireLinkedPrincipal) {
    link = await getLinkForPrincipal({ db, principal });
    if (!link?.uid || link.active !== true) {
      throw new HttpsError(
        'permission-denied',
        'Site principal is not linked to a Shrimply user account.',
      );
    }

    // Verify expiry
    if (!Number.isFinite(link.expiresAt) || Date.now() >= link.expiresAt) {
      throw new HttpsError(
        'permission-denied',
        'Delegation link has expired.',
      );
    }

    // Verify scope
    if (requiredScope) {
      const scopes = Array.isArray(link.scope)
        ? link.scope
        : (Array.isArray(link.scopes) ? link.scopes : (link.scope ? [link.scope] : []));
      if (!scopes.includes(requiredScope)) {
        throw new HttpsError(
          'permission-denied',
          `Delegation link lacks required ${requiredScope} scope.`,
        );
      }
    }

    // Verify audience
    if ((expectedAudience && link.audience !== expectedAudience) || link.siteProjectId !== FIXED_SITE_PROJECT_ID) {
      throw new HttpsError(
        'permission-denied',
        'Delegation link audience mismatch.',
      );
    }

    if (!Number.isSafeInteger(link.firebaseAuthTime) || link.firebaseAuthTime <= 0) {
      throw new HttpsError(
        'permission-denied',
        'Delegation link authentication time is invalid.',
      );
    }

    linkedUid = link.uid;
  }

  return {
    principal,
    uid: linkedUid,
    link,
    stringToSign,
  };
};

module.exports = {
  DEFAULT_CHALLENGE_TTL_SECONDS,
  DEFAULT_PAIR_CODE_TTL_SECONDS,
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
};
