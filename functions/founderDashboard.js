'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('./firebaseAdmin');
const { randomUUID } = require('node:crypto');
const { loadData, responseFor, attention } = require('./founderDashboardData');
const { mutate, reconcile } = require('./founderManagement');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const FOUNDER_UID = 'fxksp6HpzgVxPwPJHfqiRZp3b482';
const FOUNDER_EMAIL = 'ricardofransiskusho@gmail.com';
// This existing Firebase Admin identity has Auth write permissions. The default
// Compute identity is intentionally read-only for Authentication.
const FOUNDER_SERVICE_ACCOUNT = 'firebase-adminsdk-fbsvc@investashrimp-5d9e5.iam.gserviceaccount.com';
const ORIGINS = new Set(['http://127.0.0.1:5173', 'http://localhost:5173', 'https://founder.ricardofransiskusho.chatgpt.site', 'https://shrimply-founder.ricardofransiskusho.chatgpt.site']);
let cached;
let pending;
let generation = 0;

async function snapshot(force = false) {
  if (force) { generation++; cached = undefined; }
  while (!cached || Date.now() - Date.parse(cached.asOf) >= 60000) {
    const version = generation;
    if (!pending) {
      const loading = loadData(admin.firestore(), admin.auth()).then(data => {
        if (version === generation) cached = data;
      }).finally(() => { if (pending === loading) pending = null; });
      pending = loading;
    }
    await pending;
  }
  return cached;
}

async function assertFounder(auth, authorization) {
  const match = /^Bearer (\S+)$/.exec(authorization || '');
  if (!match) throw Object.assign(new Error('Sign in to Shrimply.'), { status: 401 });
  let decoded;
  try { decoded = await auth.verifyIdToken(match[1], true); }
  catch { throw Object.assign(new Error('Your session has expired. Sign in again.'), { status: 401 }); }
  const user = await auth.getUser(decoded.uid);
  const claims = user.customClaims || {};
  if (user.disabled || user.uid !== FOUNDER_UID || user.email?.toLowerCase() !== FOUNDER_EMAIL || !(claims.platformOwner === true || claims.platformRole === 'owner')) {
    throw Object.assign(new Error('This dashboard requires the founder account and current platform-owner access.'), { status: 403 });
  }
  return user.uid;
}

async function handler(request, response) {
  const requestId = randomUUID();
  const origin = request.get('Origin');
  response.set('Cache-Control', 'no-store');
  response.set('Vary', 'Origin');
  if (origin && !ORIGINS.has(origin)) return response.status(403).json({ error: { code: 'forbidden', message: 'This origin is not allowed.', requestId } });
  if (origin) response.set('Access-Control-Allow-Origin', origin);
  response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (request.method === 'OPTIONS') return response.status(204).send('');
  try {
    const actorUid = await assertFounder(admin.auth(), request.get('Authorization'));
    const path = request.path.replace(/\/$/, '') || '/';
    if (request.method === 'POST') {
      if (!request.is('application/json') || !request.rawBody || request.rawBody.length > 16000) return response.status(400).json({ error: { code: 'invalid-argument', message: 'A JSON change of at most 16 KB is required.', requestId } });
      const issues = path.startsWith('/attention/') ? attention(await snapshot()) : [];
      try {
        const data = await mutate(admin.firestore(), admin.auth(), actorUid, path, request.body, issues);
        return response.status(200).json({ data, meta: { asOf: new Date().toISOString(), coverage: 'complete' } });
      } finally { generation++; cached = undefined; }
    }
    if (request.method !== 'GET') return response.status(405).json({ error: { code: 'method-not-allowed', message: 'Use GET or POST.', requestId } });
    const result = responseFor(await snapshot(request.query.refresh === 'true'), path, request.query);
    if (!result) return response.status(404).json({ error: { code: 'not-found', message: 'Dashboard resource not found.', requestId } });
    return response.status(200).json(result);
  } catch (error) {
    const status = error.status || 503;
    if (status >= 500) console.error('founder_dashboard_failed', { requestId, code: error.code || 'unknown', message: error.message });
    return response.status(status).json({ error: { code: status === 401 ? 'unauthenticated' : status === 403 ? 'permission-denied' : 'unavailable', message: error.status ? error.message : 'Live data could not be loaded. Please retry.', requestId } });
  }
}

exports.founderDashboardApi = onRequest({ serviceAccount: FOUNDER_SERVICE_ACCOUNT, region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', maxInstances: 2, invoker: 'public' }, handler);
exports.reconcileFounderAccess = onSchedule({ serviceAccount: FOUNDER_SERVICE_ACCOUNT, schedule: 'every 5 minutes', region: 'us-central1', timeoutSeconds: 120, maxInstances: 1 }, async () => {
  await reconcile(admin.firestore(), admin.auth());
  generation++; cached = undefined;
});
exports.__test = { assertFounder, handler };
