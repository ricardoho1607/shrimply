'use strict';
const { HttpsError } = require('firebase-functions/v2/https');
const admin = require('../firebaseAdmin');
const { enforceFixedWindowLimits } = require('../abuseProtection');

// Operational safety ceilings across companies and AI routes, separate from
// subscription allowances. Server configuration can raise them for real usage.
const positiveLimit = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new HttpsError('failed-precondition', 'AI safety limits are misconfigured.');
  }
  return parsed;
};

async function reservePaidAiRequest(db, uid, companyId) {
  if (!uid || !companyId) throw new HttpsError('unauthenticated', 'Sign in to use AI.');
  if (process.env.AI_GENERATION_PAUSED === 'true') {
    throw new HttpsError('unavailable', 'AI generation is temporarily paused.');
  }
  let identity;
  try { identity = await admin.auth().getUser(uid); }
  catch { throw new HttpsError('unauthenticated', 'Sign in again before using AI.'); }
  if (identity.disabled || identity.emailVerified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email address before using AI.');
  }
  const profile = (await db.collection('users').doc(uid).get()).data();
  if (profile?.companyId !== companyId || profile.founderAccessSuspended === true) {
    throw new HttpsError('permission-denied', 'Finish setup for your current company before using AI.');
  }
  await enforceFixedWindowLimits({ db, admin, limits: [
    { namespace: 'paidAiUserDaily', scope: uid, limit: positiveLimit(process.env.AI_USER_DAILY_SAFETY_LIMIT, 100),
      windowMs: 86400000, message: 'Your daily AI safety limit has been reached. Try again later.' },
    { namespace: 'paidAiUserThirtyDays', scope: uid, limit: positiveLimit(process.env.AI_USER_30_DAY_SAFETY_LIMIT, 2000),
      windowMs: 30 * 86400000, message: 'Your AI safety limit for this period has been reached.' },
  ] });
}

module.exports = { reservePaidAiRequest };
