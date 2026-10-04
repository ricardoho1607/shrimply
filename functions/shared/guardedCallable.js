'use strict';
const { onCall: firebaseOnCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('../firebaseAdmin');

async function assertCurrentAccess(auth, db, request) {
  if (!request.auth?.uid) return; // Preserve each function's existing anonymous policy.
  let identity;
  try { identity = await auth.getUser(request.auth.uid); }
  catch { throw new HttpsError('unauthenticated', 'Sign in again to continue.'); }
  const profile = (await db.collection('users').doc(request.auth.uid).get()).data() || {};
  const authTime = request.auth.token?.auth_time;
  if (identity.disabled || profile.founderAccessSuspended === true) throw new HttpsError('permission-denied', 'Your Shrimply access has been disabled.');
  if (Number.isFinite(profile.founderSessionValidAfter) && (!Number.isFinite(authTime) || authTime <= profile.founderSessionValidAfter)) {
    throw new HttpsError('unauthenticated', 'Your session was revoked. Sign in again.');
  }
}
function onCall(options, handler) {
  const callback = typeof options === 'function' ? options : handler;
  const guarded = async (request, response) => {
    await assertCurrentAccess(admin.auth(), admin.firestore(), request);
    return callback(request, response);
  };
  return typeof options === 'function' ? firebaseOnCall(guarded) : firebaseOnCall(options, guarded);
}
module.exports = { onCall, assertCurrentAccess };
