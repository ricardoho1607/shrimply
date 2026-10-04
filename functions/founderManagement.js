'use strict';
const { createHash, randomUUID } = require('node:crypto');
const { hasLifetimeGrant, NINETY_DAYS_MS } = require('./shared/companyEntitlements');
const FOUNDER_UID = 'fxksp6HpzgVxPwPJHfqiRZp3b482';
const FOUNDER_EMAIL = 'ricardofransiskusho@gmail.com';
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 300 && !value.includes('/');
const reasonText = value => {
  if (typeof value !== 'string' || value.trim().length < 5 || value.trim().length > 2000) fail(400, 'A reason between 5 and 2,000 characters is required.');
  return value.trim();
};
const protectedIdentity = identity => identity.uid === FOUNDER_UID || identity.email?.toLowerCase() === FOUNDER_EMAIL || identity.customClaims?.platformOwner === true || identity.customClaims?.platformRole === 'owner';

function parseMutation(path, body, now) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'A JSON change is required.');
  if (typeof body.operationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.operationId)) fail(400, 'A mutation identifier is required.');
  let match;
  let action, targetType, targetId, request;
  if ((match = /^\/companies\/([^/]+)\/notes$/.exec(path))) {
    action = 'customer_note'; targetType = 'company'; targetId = decodeURIComponent(match[1]); request = { text: reasonText(body.text) };
  } else if ((match = /^\/companies\/([^/]+)\/access-override(\/revoke)?$/.exec(path))) {
    action = match[2] ? 'revoke_access_grant' : 'grant_access'; targetType = 'company'; targetId = decodeURIComponent(match[1]);
    request = { expectedRevision: body.expectedRevision, reason: reasonText(body.reason) };
    if (!match[2]) {
      if (!['plus', 'pro'].includes(body.planId)) fail(400, 'Choose Plus or Pro.');
      const expires = typeof body.expiresAt === 'string' ? Date.parse(body.expiresAt) : NaN;
      // Absolute expiry remains part of the same request during retries.
      if (!Number.isFinite(expires)) fail(400, 'A valid expiry is required.');
      request.planId = body.planId; request.expiresAt = new Date(expires).toISOString();
    }
  } else if ((match = /^\/users\/([^/]+)\/delete$/.exec(path))) {
    if (typeof body.expectedDisabled !== 'boolean' || typeof body.confirmation !== 'string') fail(400, 'The current account status and confirmation are required.');
    action = 'delete_user'; targetType = 'user'; targetId = decodeURIComponent(match[1]);
    request = { expectedRevision: body.expectedRevision, expectedDisabled: body.expectedDisabled, confirmation: body.confirmation, reason: reasonText(body.reason) };
  } else if ((match = /^\/users\/([^/]+)\/access$/.exec(path))) {
    if (!['disable', 'restore'].includes(body.action) || typeof body.expectedDisabled !== 'boolean') fail(400, 'The current account status and action are required.');
    action = body.action === 'disable' ? 'disable_user' : 'restore_user'; targetType = 'user'; targetId = decodeURIComponent(match[1]);
    request = { expectedRevision: body.expectedRevision, expectedDisabled: body.expectedDisabled, reason: reasonText(body.reason) };
  } else if ((match = /^\/attention\/([^/]+)\/triage$/.exec(path))) {
    if (!['acknowledged', 'snoozed'].includes(body.status)) fail(400, 'Choose acknowledge or snooze.');
    const until = body.status === 'snoozed' ? Date.parse(body.snoozedUntil) : null;
    if (body.status === 'snoozed' && !Number.isFinite(until)) fail(400, 'Choose a valid snooze date.');
    action = 'triage_attention'; targetType = 'attention'; targetId = decodeURIComponent(match[1]);
    request = { expectedRevision: body.expectedRevision, reason: reasonText(body.reason), status: body.status, snoozedUntil: until == null ? null : new Date(until).toISOString() };
  } else fail(404, 'Management action not found.');
  if (!identifier(targetId)) fail(400, 'Invalid target.');
  if (action !== 'customer_note' && (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0)) fail(400, 'The current revision is required.');
  const mutation = { operationId: body.operationId, action, targetType, targetId, request };
  return { ...mutation, hash: createHash('sha256').update(JSON.stringify(mutation)).digest('hex') };
}
function checkOperation(operation, mutation, actorUid) {
  if (operation && (operation.hash !== mutation.hash || operation.actorUid !== actorUid)) fail(409, 'This mutation identifier was already used for a different change.');
}

async function atomicMutation(db, actorUid, mutation, now, issues) {
  const { operationId, action, targetId, request } = mutation;
  const operationRef = db.collection('founderOperations').doc(operationId);
  const auditRef = db.collection('founderAudit').doc(operationId);
  const timestamp = new Date(now).toISOString();
  return db.runTransaction(async transaction => {
    const operation = (await transaction.get(operationRef)).data();
    checkOperation(operation, mutation, actorUid);
    if (operation?.status === 'completed') return operation.result;
    const companyRef = mutation.targetType === 'company' ? db.collection('companies').doc(targetId) : null;
    if (companyRef && !(await transaction.get(companyRef)).exists) fail(404, 'Company not found.');
    let targetRef, before = null, after;
    if (action === 'customer_note') {
      targetRef = companyRef.collection('founderNotes').doc(operationId);
      after = { text: request.text, actorUid, createdAt: timestamp };
    } else if (action === 'grant_access' || action === 'revoke_access_grant') {
      const lifetime = (await transaction.get(companyRef.collection('subscriptionGrants').doc('current'))).data();
      targetRef = companyRef.collection('accessOverrides').doc('current');
      before = (await transaction.get(targetRef)).data() || null;
      if ((before?.revision || 0) !== request.expectedRevision) fail(409, 'Access changed. Refresh the company and try again.');
      if (action === 'grant_access') {
        if (hasLifetimeGrant(lifetime)) fail(409, 'Lifetime benefits are already permanent and cannot be replaced.');
        const expires = Date.parse(request.expiresAt);
        if (expires <= now || expires > now + NINETY_DAYS_MS) fail(400, 'Temporary access must expire within 90 days.');
        after = { planId: request.planId, status: 'active', startsAt: timestamp, expiresAt: request.expiresAt, reason: request.reason, actorUid, revision: request.expectedRevision + 1, updatedAt: timestamp };
      } else {
        if (!before || before.status !== 'active') fail(409, 'No active temporary grant exists.');
        after = { ...before, status: 'revoked', revokedAt: timestamp, reason: request.reason, actorUid, revision: request.expectedRevision + 1, updatedAt: timestamp };
      }
    } else {
      if (request.status === 'snoozed' && (Date.parse(request.snoozedUntil) <= now || Date.parse(request.snoozedUntil) > now + NINETY_DAYS_MS)) fail(400, 'Choose a snooze date within 90 days.');
      const evidence = issues.find(issue => issue.id === targetId);
      if (!evidence) fail(404, 'This attention item has been resolved. Refresh the queue.');
      targetRef = db.collection('founderAttention').doc(targetId);
      before = (await transaction.get(targetRef)).data() || null;
      if ((before?.revision || 0) !== request.expectedRevision) fail(409, 'Follow-up changed. Refresh the queue and try again.');
      after = { status: request.status, snoozedUntil: request.snoozedUntil, reason: request.reason, actorUid, revision: request.expectedRevision + 1, updatedAt: timestamp, companyId: evidence.companyId, evidence: { source: evidence.source, evidenceAt: evidence.evidenceAt } };
    }
    const result = { operationId, status: 'completed', revision: after.revision ?? null };
    transaction.set(targetRef, after);
    transaction.create(operationRef, { ...mutation, actorUid, status: 'completed', createdAt: timestamp, completedAt: timestamp, result });
    transaction.create(auditRef, { id: operationId, operationId, actorUid, action, targetType: mutation.targetType, targetId, reason: request.reason || 'Private customer note', before, after, status: 'completed', createdAt: timestamp, completedAt: timestamp });
    return result;
  });
}

async function userAccessMutation(db, auth, actorUid, mutation, now = Date.now()) {
  const { operationId, targetId: uid, request, action } = mutation;
  const operationRef = db.collection('founderOperations').doc(operationId);
  const accessRef = db.collection('founderUserAccess').doc(uid);
  const profileRef = db.collection('users').doc(uid);
  const auditRef = db.collection('founderAudit').doc(operationId);
  const existing = (await operationRef.get()).data();
  checkOperation(existing, mutation, actorUid);
  if (existing?.status === 'completed') return existing.result;
  const deleting = action === 'delete_user';
  const lookup = async () => {
    try { return await auth.getUser(uid); }
    catch (error) {
      // Only a durable deletion receipt permits resuming after Auth was removed.
      if (deleting && existing?.status === 'pending' && error.code === 'auth/user-not-found') return null;
      throw error;
    }
  };
  const identity = await lookup();
  if (uid === actorUid || (identity && protectedIdentity(identity))) fail(403, 'Founder accounts cannot be suspended or deleted here.');
  const lease = randomUUID();
  const prepared = await db.runTransaction(async transaction => {
    const [op, state, profile] = await Promise.all([transaction.get(operationRef), transaction.get(accessRef), transaction.get(profileRef)]);
    const operation = op.data(); const current = state.data() || {};
    checkOperation(operation, mutation, actorUid);
    if (operation?.status === 'completed') return operation.result;
    if (operation && operation.leaseUntil > now) fail(423, 'This change is still running. Retry this same change shortly.');
    if (!operation) {
      if (current.pendingOperationId) fail(423, 'An earlier access change is being reconciled. Refresh shortly.');
      if ((current.revision || 0) !== request.expectedRevision || identity.disabled !== request.expectedDisabled) fail(409, 'Account access changed. Refresh the user and try again.');
      if (!deleting && identity.disabled === (action === 'disable_user')) fail(409, 'This account already has the requested access status.');
      if (deleting) {
        if (request.confirmation !== (identity.email || uid)) fail(400, 'Type the target email (or account ID when no email exists) exactly to confirm permanent deletion.');
        const owned = await transaction.get(db.collection('companies').where('ownerId', '==', uid));
        const linked = profile.data()?.companyId ? await transaction.get(db.collection('companies').doc(profile.data().companyId)) : null;
        if (!owned.empty || (linked?.exists && ['owner', 'co-owner'].includes(profile.data()?.role))) fail(409, 'Transfer company ownership before permanently deleting this user.');
      }
      const timestamp = new Date(now).toISOString();
      const before = { disabled: identity.disabled, revision: current.revision || 0 };
      transaction.create(operationRef, { ...mutation, actorUid, before, status: 'pending', createdAt: timestamp, lease, leaseUntil: now + 240000 });
      transaction.create(auditRef, { operationId, actorUid, action, targetType: 'user', targetId: uid, reason: request.reason, before, after: null, status: 'pending', createdAt: timestamp });
    } else transaction.update(operationRef, { lease, leaseUntil: now + 240000 });
    transaction.set(accessRef, { ...current, revision: current.revision || 0, pendingOperationId: operationId });
    // Both disable and restore remain blocked until Authentication has reconciled.
    transaction.set(profileRef, { ...(!profile.exists ? { uid, id: uid, email: identity.email || '', name: identity.displayName || '', companyId: null, role: null, hasCompletedSetup: false } : {}), founderAccessSuspended: true }, { merge: true });
    return null;
  });
  if (prepared) return prepared;
  try {
    const freshIdentity = await lookup();
    if (freshIdentity && protectedIdentity(freshIdentity)) fail(403, 'Founder accounts cannot be changed here.');
    if (deleting) {
      // Recheck ownership before irreversible Auth deletion, including on recovery.
      if (!(await db.collection('companies').where('ownerId', '==', uid).get()).empty) fail(409, 'Transfer company ownership before permanently deleting this user.');
      if (freshIdentity) {
        await auth.updateUser(uid, { disabled: true });
        await auth.revokeRefreshTokens(uid);
        try { await auth.deleteUser(uid); }
        catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
      }
      const memberships = await db.collection('companies').where('teamMembers', 'array-contains', uid).get();
      for (const company of memberships.docs) {
        await db.runTransaction(async transaction => {
          const current = (await transaction.get(company.ref)).data();
          if (current?.ownerId === uid) fail(409, 'Transfer company ownership before deleting this user.');
          if (current) transaction.update(company.ref, { teamMembers: (current.teamMembers || []).filter(member => member !== uid) });
        });
      }
      const joins = await db.collection('joinRequests').where('userId', '==', uid).get();
      for (const join of joins.docs) await db.recursiveDelete(join.ref);
      // Retain only a non-personal access tombstone: cached tokens must stay blocked.
      for (const collection of await profileRef.listCollections()) await db.recursiveDelete(collection);
      const completedAt = new Date().toISOString();
      return await db.runTransaction(async transaction => {
        const [op, state] = await Promise.all([transaction.get(operationRef), transaction.get(accessRef)]);
        const operation = op.data(); const current = state.data();
        if (operation?.status === 'completed') return operation.result;
        if (operation?.lease !== lease || current?.pendingOperationId !== operationId) fail(423, 'This deletion is being reconciled by another request.');
        const after = { deleted: true, revision: request.expectedRevision + 1 };
        const result = { operationId, status: 'completed', revision: after.revision };
        transaction.set(profileRef, { founderAccessSuspended: true, founderAccountDeleted: true });
        transaction.set(accessRef, { ...after, disabled: true, pendingOperationId: null, updatedAt: completedAt });
        transaction.update(operationRef, { status: 'completed', completedAt, leaseUntil: 0, result });
        transaction.update(auditRef, { status: 'completed', completedAt, after });
        return result;
      });
    }
    await auth.updateUser(uid, { disabled: action === 'disable_user' });
    await auth.revokeRefreshTokens(uid);
    const updated = await auth.getUser(uid);
    const revokedAt = Date.parse(updated.tokensValidAfterTime);
    if (!Number.isFinite(revokedAt) || updated.disabled !== (action === 'disable_user')) fail(503, 'Authentication reconciliation is incomplete. Retry this change.');
    const completedAt = new Date().toISOString();
    return await db.runTransaction(async transaction => {
      const [op, state] = await Promise.all([transaction.get(operationRef), transaction.get(accessRef)]);
      const operation = op.data(); const current = state.data();
      if (operation?.status === 'completed') return operation.result;
      if (operation?.lease !== lease || current?.pendingOperationId !== operationId) fail(423, 'This change is being reconciled by another request.');
      const after = { disabled: updated.disabled, revision: request.expectedRevision + 1 };
      const result = { operationId, status: 'completed', revision: after.revision };
      transaction.set(profileRef, { founderAccessSuspended: updated.disabled, founderSessionValidAfter: Math.floor(revokedAt / 1000) }, { merge: true });
      transaction.set(accessRef, { revision: after.revision, disabled: updated.disabled, pendingOperationId: null, updatedAt: completedAt });
      transaction.update(operationRef, { status: 'completed', completedAt, leaseUntil: 0, result });
      transaction.update(auditRef, { status: 'completed', completedAt, after });
      return result;
    });
  } catch (error) {
    console.error('founder_management_reconciliation_pending', { operationId, action, code: error.code || error.status || 'unknown' });
    // Durable receipt and guard survive a crash, Auth failure, or Firestore failure.
    await db.runTransaction(async transaction => {
      const op = (await transaction.get(operationRef)).data();
      if (op?.status !== 'pending' || op.lease !== lease) return;
      transaction.update(operationRef, { leaseUntil: 0, lastFailureCode: String(error.code || error.status || 'unknown').slice(0, 100), lastAttemptAt: new Date().toISOString() });
      transaction.update(auditRef, { outcome: 'reconciliation_required' });
    }).catch(() => {});
    fail(503, deleting ? 'Deletion is pending reconciliation. Retry the same deletion; access remains blocked.' : 'The access change is pending reconciliation. Retry the same change; existing sessions remain blocked.');
  }
}

async function mutate(db, auth, actorUid, path, body, issues = [], now = Date.now()) {
  const mutation = parseMutation(path, body, now);
  return mutation.targetType === 'user' ? userAccessMutation(db, auth, actorUid, mutation, now) : atomicMutation(db, actorUid, mutation, now, issues);
}
async function reconcile(db, auth) {
  const pending = await db.collection('founderOperations').where('status', '==', 'pending').limit(25).get();
  for (const doc of pending.docs) {
    const mutation = doc.data();
    if (mutation.targetType !== 'user' || mutation.leaseUntil > Date.now()) continue;
    try { await userAccessMutation(db, auth, mutation.actorUid, mutation); }
    catch (error) { console.error('founder_access_reconcile_failed', { operationId: doc.id, code: error.status || error.code || 'unknown' }); }
  }
}
module.exports = { mutate, parseMutation, userAccessMutation, reconcile, protectedIdentity };
