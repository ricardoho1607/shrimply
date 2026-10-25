const { HttpsError } = require("firebase-functions/v2/https");
const { onCall } = require('./shared/guardedCallable');
const admin = require("./firebaseAdmin");
const {
  STAFF_ROLES,
  buildSecureInvite,
  evaluateInviteAcceptance,
  evaluateJoinApproval,
  evaluateDeletionRequest,
  evaluateDeletionApproval,
  evaluateDeletionCancellation,
  hashInviteToken,
  normalizeEmail,
  toMillis: policyToMillis,
} = require("./teamAccessPolicy");
const { hasUserPermission } = require("./shared/permissions");

const DAY_MS = 1000 * 60 * 60 * 24;
const LEGACY_INVITE_TTL_MS = 30 * DAY_MS;
const MAX_INVITE_TOKEN_LENGTH = 256;
const TEAM_ACCESS_OPERATIONS = Object.freeze({
  createCompanyInvite: "createCompanyInvite",
  revokeCompanyInvite: "revokeCompanyInvite",
  listCompanyInvites: "listCompanyInvites",
  createCompanyJoinRequest: "createCompanyJoinRequest",
  processCompanyJoinRequest: "processCompanyJoinRequest",
  removeCompanyMember: "removeCompanyMember",
  requestCompanyDeletion: "requestCompanyDeletion",
  approveCompanyDeletion: "approveCompanyDeletion",
  cancelCompanyDeletion: "cancelCompanyDeletion",
});
const isVerifiedAuth = (request) => request.auth?.token?.email_verified === true;

const canManageTeam = (company, user, uid) => hasUserPermission({ company, user, uid, permission: "manageTeam" });
const canManageCompanyDeletion = (company, user, uid) => hasUserPermission({ company, user, uid, permission: "manageCompanyDeletion" });

const publicMemberCountFor = (company, additionalMemberId = null, removedMemberId = null) => new Set([
  ...(Array.isArray(company?.teamMembers) ? company.teamMembers : []),
  company?.ownerId,
  additionalMemberId,
].filter((memberId) => (
  typeof memberId === "string"
  && memberId.trim()
  && memberId !== removedMemberId
))).size;

const inviteAcceptanceError = (reason) => {
  if (reason === "email-unverified") {
    return new HttpsError("failed-precondition", "Verify your email address before accepting this invitation.");
  }
  if (reason === "already-in-another-company") {
    return new HttpsError("failed-precondition", "Leave your current company before joining another company.");
  }
  return new HttpsError("permission-denied", "This invitation cannot be accepted.");
};

const enforceInviteAttemptLimit = async (db, uid) => {
  const rateRef = db.collection("securityRateLimits").doc(`inviteAccept_${uid}`);
  const nowMs = Date.now();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const data = snapshot.exists ? snapshot.data() : {};
    const windowStartedAtMs = policyToMillis(data.windowStartedAt) || 0;
    const currentCount = typeof data.count === "number" ? data.count : 0;
    const inCurrentWindow = nowMs - windowStartedAtMs < 15 * 60 * 1000;
    if (inCurrentWindow && currentCount >= 20) {
      throw new HttpsError("resource-exhausted", "Too many invitation attempts. Try again later.");
    }
    transaction.set(rateRef, {
      count: inCurrentWindow ? currentCount + 1 : 1,
      windowStartedAt: inCurrentWindow && windowStartedAtMs
        ? admin.firestore.Timestamp.fromMillis(windowStartedAtMs)
        : admin.firestore.Timestamp.fromMillis(nowMs),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};

exports.createCompanyInvite = onCall(async (request) => {
  const uid = request.auth?.uid;
  const authEmail = request.auth?.token?.email;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
  const email = normalizeEmail(request.data?.email);
  const role = typeof request.data?.role === "string" ? request.data.role.trim() : "";
  const message = typeof request.data?.message === "string" ? request.data.message.trim().slice(0, 500) : "";

  if (!uid || !authEmail) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before creating invitations.");
  if (!companyId || companyId.length > 160 || !isValidEmail(email) || !STAFF_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "A valid company, email, and role are required.");
  }

  const db = admin.firestore();
  const companyRef = db.collection("companies").doc(companyId);
  const userRef = db.collection("users").doc(uid);
  const generated = buildSecureInvite({ companyId, email, role, createdBy: uid, message });
  const { createdAtMs, expiresAtMs, ...record } = generated.record;
  const inviteRef = db.collection("companyInvites").doc(generated.inviteId);
  await db.runTransaction(async (transaction) => {
    const [companySnap, userSnap, existingInvites] = await Promise.all([
      transaction.get(companyRef),
      transaction.get(userRef),
      transaction.get(db.collection("companyInvites").where("companyId", "==", companyId)),
    ]);
    if (!companySnap.exists) throw new HttpsError("not-found", "Company not found.");

    const company = { ...companySnap.data(), id: companySnap.id };
    const user = userSnap.exists ? userSnap.data() : null;
    if (!canManageTeam(company, user, uid)) {
      throw new HttpsError("permission-denied", "Only company owners and co-owners can create invitations.");
    }

    const pendingSecureInvites = existingInvites.docs.filter((document) => document.data().status === "pending");
    const pendingLegacyInvites = Array.isArray(company.pendingInvites)
      ? company.pendingInvites.filter((invite) => invite.status === "pending")
      : [];
    if (pendingSecureInvites.some((document) => normalizeEmail(document.data().emailNormalized) === email)) {
      throw new HttpsError("already-exists", "This email already has a pending invitation.");
    }
    if (pendingSecureInvites.length + pendingLegacyInvites.length >= 50) {
      throw new HttpsError("resource-exhausted", "Revoke unused invitations before creating more.");
    }
    const recentInviteCount = existingInvites.docs.filter((document) => (
      Date.now() - (policyToMillis(document.data().createdAt) || 0) < 60 * 60 * 1000
    )).length;
    if (recentInviteCount >= 20) {
      throw new HttpsError("resource-exhausted", "Invitation creation is temporarily limited. Try again later.");
    }

    transaction.create(inviteRef, {
      ...record,
      createdAt: admin.firestore.Timestamp.fromMillis(createdAtMs),
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMs),
    });
  });

  return {
    inviteId: generated.inviteId,
    inviteToken: generated.token,
    inviteLink: `shrimply://auth?token=${encodeURIComponent(generated.token)}`,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
});

exports.revokeCompanyInvite = onCall(async (request) => {
  const uid = request.auth?.uid;
  const inviteId = typeof request.data?.inviteId === "string" ? request.data.inviteId.trim() : "";
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before revoking invitations.");
  if (!/^[a-f0-9]{64}$/.test(inviteId)) throw new HttpsError("invalid-argument", "A valid invite ID is required.");

  const db = admin.firestore();
  const inviteRef = db.collection("companyInvites").doc(inviteId);
  await db.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);
    if (!inviteSnap.exists) throw new HttpsError("not-found", "Invitation not found.");
    const invite = inviteSnap.data();
    const companyRef = db.collection("companies").doc(invite.companyId);
    const userRef = db.collection("users").doc(uid);
    const [companySnap, userSnap] = await Promise.all([
      transaction.get(companyRef),
      transaction.get(userRef),
    ]);
    const company = companySnap.exists ? { ...companySnap.data(), id: companySnap.id } : null;
    const user = userSnap.exists ? userSnap.data() : null;
    if (!company || !canManageTeam(company, user, uid)) {
      throw new HttpsError("permission-denied", "You cannot revoke this invitation.");
    }
    if (invite.status !== "pending") throw new HttpsError("failed-precondition", "Invitation is no longer pending.");
    transaction.update(inviteRef, {
      status: "revoked",
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      revokedBy: uid,
    });
  });
  return { success: true };
});

exports.listCompanyInvites = onCall(async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before viewing invitations.");
  if (!companyId || companyId.length > 160) throw new HttpsError("invalid-argument", "A valid company is required.");

  const db = admin.firestore();
  const [companySnap, userSnap, invitesSnap] = await Promise.all([
    db.collection("companies").doc(companyId).get(),
    db.collection("users").doc(uid).get(),
    db.collection("companyInvites").where("companyId", "==", companyId).get(),
  ]);
  const company = companySnap.exists ? { ...companySnap.data(), id: companySnap.id } : null;
  const user = userSnap.exists ? userSnap.data() : null;
  if (!company || !canManageTeam(company, user, uid)) {
    throw new HttpsError("permission-denied", "You cannot view these invitations.");
  }

  return {
    invites: invitesSnap.docs.map((document) => {
      const invite = document.data();
      return {
        id: document.id,
        email: invite.emailNormalized,
        role: invite.role,
        message: invite.message || null,
        status: invite.status,
        createdAt: policyToMillis(invite.createdAt),
        expiresAt: policyToMillis(invite.expiresAt),
        acceptedAt: policyToMillis(invite.acceptedAt),
        acceptedBy: invite.acceptedBy || null,
      };
    }),
  };
});

exports.acceptCompanyInvite = onCall(async (request) => {
  const operation = typeof request.data?.operation === "string" ? request.data.operation : "";
  if (operation) {
    const handlerName = TEAM_ACCESS_OPERATIONS[operation];
    const handler = handlerName ? exports[handlerName] : null;
    if (!handler?.run) throw new HttpsError("invalid-argument", "Unsupported team access operation.");
    const { operation: _operation, ...operationData } = request.data;
    return handler.run({ ...request, data: operationData });
  }

  const uid = request.auth?.uid;
  const authEmail = request.auth?.token?.email;
  const inviteToken = typeof request.data?.inviteToken === "string" ? request.data.inviteToken.trim() : "";

  if (!uid || !authEmail) throw new HttpsError("unauthenticated", "You must be signed in to accept an invite.");
  if (!isVerifiedAuth(request)) throw inviteAcceptanceError("email-unverified");
  if (!inviteToken || inviteToken.length > MAX_INVITE_TOKEN_LENGTH) {
    throw new HttpsError("invalid-argument", "A valid invite token is required.");
  }

  const db = admin.firestore();
  await enforceInviteAttemptLimit(db, uid);
  const secureInviteRef = db.collection("companyInvites").doc(hashInviteToken(inviteToken));
  const secureInviteSnap = await secureInviteRef.get();
  let inviteMode = secureInviteSnap.exists ? "secure" : "legacy";
  let targetCompanyRef = secureInviteSnap.exists
    ? db.collection("companies").doc(secureInviteSnap.data().companyId)
    : null;

  if (!targetCompanyRef) {
    const companiesSnapshot = await db.collection("companies").get();
    for (const companyDoc of companiesSnapshot.docs) {
      const companyData = companyDoc.data();
      const invite = Array.isArray(companyData.pendingInvites)
        ? companyData.pendingInvites.find((item) => item.inviteToken === inviteToken && item.status === "pending")
        : null;
      if (invite) {
        targetCompanyRef = companyDoc.ref;
        break;
      }
    }
  }

  if (!targetCompanyRef) throw inviteAcceptanceError("invite-not-pending");

  const result = await db.runTransaction(async (transaction) => {
    const companyRef = targetCompanyRef;
    const userRef = db.collection("users").doc(uid);
    const publicProfileRef = db.collection("publicCompanyProfiles").doc(companyRef.id);
    const reads = [
      transaction.get(companyRef),
      transaction.get(userRef),
      transaction.get(publicProfileRef),
      transaction.get(db.collection("companies").where("ownerId", "==", uid)),
    ];
    if (inviteMode === "secure") reads.push(transaction.get(secureInviteRef));
    const [companySnap, userSnap, publicProfileSnap, ownedCompaniesSnap, secureSnap] = await Promise.all(reads);
    if (!companySnap.exists) throw inviteAcceptanceError("invite-not-pending");

    const company = companySnap.data();
    const user = userSnap.exists ? userSnap.data() : {};
    let invite;
    let updatedInvites = null;

    if (inviteMode === "secure") {
      invite = secureSnap?.exists ? secureSnap.data() : null;
    } else {
      const pendingInvites = Array.isArray(company.pendingInvites) ? company.pendingInvites : [];
      const inviteIndex = pendingInvites.findIndex((item) => item.inviteToken === inviteToken && item.status === "pending");
      const legacyInvite = inviteIndex >= 0 ? pendingInvites[inviteIndex] : null;
      const inviteDateMs = legacyInvite ? policyToMillis(legacyInvite.expiresAt) ?? policyToMillis(legacyInvite.inviteDate) : null;
      invite = legacyInvite ? {
        ...legacyInvite,
        companyId: companyRef.id,
        emailNormalized: normalizeEmail(legacyInvite.email),
        expiresAtMs: policyToMillis(legacyInvite.expiresAt)
          ?? (inviteDateMs === null ? 0 : inviteDateMs + LEGACY_INVITE_TTL_MS),
      } : null;
      if (legacyInvite) {
        updatedInvites = pendingInvites.map((item, index) => (
          index === inviteIndex ? {
            ...item,
            status: "accepted",
            acceptedAt: admin.firestore.Timestamp.now(),
            acceptedBy: uid,
          } : item
        ));
      }
    }

    const evaluation = evaluateInviteAcceptance({
      invite,
      authEmail,
      emailVerified: true,
      currentCompanyId: user.companyId
        || ownedCompaniesSnap.docs.find((document) => document.id !== companyRef.id)?.id
        || null,
    });
    if (!evaluation.allowed) throw inviteAcceptanceError(evaluation.reason);

    transaction.update(companyRef, {
      teamMembers: admin.firestore.FieldValue.arrayUnion(uid),
      ...(updatedInvites ? { pendingInvites: updatedInvites } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.set(userRef, {
      ...(!userSnap.exists ? {
        id: uid,
        uid,
        email: normalizeEmail(authEmail),
        joinedDate: new Date().toISOString(),
      } : {}),
      companyId: companyRef.id,
      role: evaluation.role,
      invitedBy: invite.createdBy || invite.invitedBy || null,
      hasCompletedSetup: true,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (inviteMode === "secure") {
      transaction.update(secureInviteRef, {
        status: "accepted",
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedBy: uid,
      });
    }
    if (publicProfileSnap.exists && publicProfileSnap.data()?.isPublicProfile === true) {
      transaction.set(publicProfileRef, {
        publicMemberCount: publicMemberCountFor(company, uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return { companyId: companyRef.id, role: evaluation.role };
  });

  return result;
});

exports.createCompanyJoinRequest = onCall(async (request) => {
  const uid = request.auth?.uid;
  const authEmail = request.auth?.token?.email;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
  const requestedRole = typeof request.data?.requestedRole === "string" ? request.data.requestedRole.trim() : "";
  const message = typeof request.data?.message === "string" ? request.data.message.trim().slice(0, 1000) : "";

  if (!uid || !authEmail) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before requesting company access.");
  if (!companyId || companyId.length > 160 || !STAFF_ROLES.has(requestedRole)) {
    throw new HttpsError("invalid-argument", "A valid company and staff role are required.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const companyRef = db.collection("companies").doc(companyId);
  const requestRef = db.collection("joinRequests").doc(uid);
  await db.runTransaction(async (transaction) => {
    const [userSnap, companySnap, existingRequests, ownedCompanies, requestSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(companyRef),
      transaction.get(db.collection("joinRequests").where("userId", "==", uid)),
      transaction.get(db.collection("companies").where("ownerId", "==", uid)),
      transaction.get(requestRef),
    ]);
    if (!userSnap.exists) throw new HttpsError("failed-precondition", "Complete account setup before requesting company access.");
    if (!companySnap.exists) throw new HttpsError("not-found", "Company not found.");

    const user = userSnap.data();
    if (user.companyId || !ownedCompanies.empty) throw new HttpsError("failed-precondition", "You already belong to a company.");
    const pendingRequest = existingRequests.docs.find((document) => document.data().status === "pending");
    if (pendingRequest) throw new HttpsError("already-exists", "You already have a pending company request.");
    const latestRequestAt = existingRequests.docs.reduce((latest, document) => (
      Math.max(latest, policyToMillis(document.data().requestedAt) || 0)
    ), 0);
    if (latestRequestAt && Date.now() - latestRequestAt < 60_000) {
      throw new HttpsError("resource-exhausted", "Wait before submitting another company request.");
    }

    const now = admin.firestore.Timestamp.now();
    transaction.set(requestRef, {
      companyId,
      userId: uid,
      userName: typeof user.name === "string" && user.name.trim()
        ? user.name.trim().slice(0, 120)
        : normalizeEmail(authEmail).split("@")[0],
      userEmail: normalizeEmail(authEmail),
      requestedRole,
      requestedAt: now,
      createdAt: requestSnap.exists ? requestSnap.data().createdAt || now : now,
      status: "pending",
      ...(message ? { message } : {}),
    });
  });
  return { requestId: requestRef.id, status: "pending" };
});

exports.processCompanyJoinRequest = onCall(async (request) => {
  const uid = request.auth?.uid;
  const requestId = typeof request.data?.requestId === "string" ? request.data.requestId.trim() : "";
  const decision = request.data?.decision;
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before managing company access.");
  if (!requestId || requestId.length > 160 || !["approve", "reject"].includes(decision)) {
    throw new HttpsError("invalid-argument", "A valid request and decision are required.");
  }

  const db = admin.firestore();
  const requestRef = db.collection("joinRequests").doc(requestId);
  return db.runTransaction(async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists) throw new HttpsError("not-found", "Join request not found.");
    const joinRequest = requestSnap.data();
    if (joinRequest.status !== "pending") throw new HttpsError("failed-precondition", "Join request has already been processed.");

    const companyRef = db.collection("companies").doc(joinRequest.companyId);
    const actorRef = db.collection("users").doc(uid);
    const targetUserRef = db.collection("users").doc(joinRequest.userId);
    const publicProfileRef = db.collection("publicCompanyProfiles").doc(joinRequest.companyId);
    const [companySnap, actorSnap, targetUserSnap, publicProfileSnap, targetOwnedCompaniesSnap] = await Promise.all([
      transaction.get(companyRef),
      transaction.get(actorRef),
      transaction.get(targetUserRef),
      transaction.get(publicProfileRef),
      transaction.get(db.collection("companies").where("ownerId", "==", joinRequest.userId)),
    ]);
    if (!companySnap.exists || !targetUserSnap.exists) throw new HttpsError("not-found", "Company or user not found.");

    const company = { ...companySnap.data(), id: companySnap.id };
    const actor = actorSnap.exists ? actorSnap.data() : null;
    if (!canManageTeam(company, actor, uid)) {
      throw new HttpsError("permission-denied", "Only company owners and co-owners can process join requests.");
    }

    const processedAt = admin.firestore.FieldValue.serverTimestamp();
    if (decision === "reject") {
      transaction.update(requestRef, {
        status: "rejected",
        processedBy: uid,
        processedAt,
      });
      return { status: "rejected" };
    }

    const targetUser = targetUserSnap.data();
    const evaluation = evaluateJoinApproval({
      request: joinRequest,
      currentCompanyId: targetUser.companyId
        || targetOwnedCompaniesSnap.docs.find((document) => document.id !== joinRequest.companyId)?.id
        || null,
    });
    if (!evaluation.allowed) {
      const code = evaluation.reason === "already-in-another-company" ? "failed-precondition" : "permission-denied";
      throw new HttpsError(code, "This join request cannot be approved.");
    }

    transaction.update(requestRef, {
      status: "approved",
      processedBy: uid,
      processedAt,
    });
    transaction.update(companyRef, {
      teamMembers: admin.firestore.FieldValue.arrayUnion(joinRequest.userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(targetUserRef, {
      companyId: joinRequest.companyId,
      role: evaluation.role,
      hasCompletedSetup: true,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (publicProfileSnap.exists && publicProfileSnap.data()?.isPublicProfile === true) {
      transaction.set(publicProfileRef, {
        publicMemberCount: publicMemberCountFor(company, joinRequest.userId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return { status: "approved", companyId: joinRequest.companyId, role: evaluation.role };
  });
});

exports.removeCompanyMember = onCall(async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
  const memberId = typeof request.data?.memberId === "string" ? request.data.memberId.trim() : "";
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before managing company access.");
  if (!companyId || !memberId || companyId.length > 160 || memberId.length > 160) {
    throw new HttpsError("invalid-argument", "A valid company and member are required.");
  }
  if (memberId === uid) throw new HttpsError("failed-precondition", "You cannot remove yourself.");

  const db = admin.firestore();
  const companyRef = db.collection("companies").doc(companyId);
  const actorRef = db.collection("users").doc(uid);
  const targetUserRef = db.collection("users").doc(memberId);
  const publicProfileRef = db.collection("publicCompanyProfiles").doc(companyId);
  const targetAuthUser = await admin.auth().getUser(memberId).catch(() => null);

  await db.runTransaction(async (transaction) => {
    const [companySnap, actorSnap, targetUserSnap, publicProfileSnap] = await Promise.all([
      transaction.get(companyRef),
      transaction.get(actorRef),
      transaction.get(targetUserRef),
      transaction.get(publicProfileRef),
    ]);
    if (!companySnap.exists || !targetUserSnap.exists) throw new HttpsError("not-found", "Company or member not found.");

    const company = { ...companySnap.data(), id: companySnap.id };
    const actor = actorSnap.exists ? actorSnap.data() : null;
    const targetUser = targetUserSnap.data();
    if (!canManageTeam(company, actor, uid)) {
      throw new HttpsError("permission-denied", "Only company owners and co-owners can remove members.");
    }
    if (company.ownerId === memberId || ["owner", "co-owner"].includes(targetUser.role)) {
      throw new HttpsError("failed-precondition", "Owners and co-owners cannot be removed.");
    }
    if (!Array.isArray(company.teamMembers) || !company.teamMembers.includes(memberId)) {
      throw new HttpsError("not-found", "Member is not part of this company.");
    }

    const secureInviteQuery = db.collection("companyInvites").where("companyId", "==", companyId);
    const joinRequestQuery = db.collection("joinRequests").where("userId", "==", memberId);
    const [secureInviteSnap, joinRequestSnap] = await Promise.all([
      transaction.get(secureInviteQuery),
      transaction.get(joinRequestQuery),
    ]);
    const targetEmail = normalizeEmail(targetAuthUser?.email || targetUser.email);
    const revokedAt = admin.firestore.FieldValue.serverTimestamp();
    secureInviteSnap.docs.forEach((inviteDoc) => {
      const invite = inviteDoc.data();
      if (invite.status === "pending" && normalizeEmail(invite.emailNormalized) === targetEmail) {
        transaction.update(inviteDoc.ref, { status: "revoked", revokedAt, revokedBy: uid });
      }
    });
    joinRequestSnap.docs.forEach((joinRequestDoc) => {
      const joinRequest = joinRequestDoc.data();
      if (joinRequest.companyId === companyId && joinRequest.status === "pending") {
        transaction.update(joinRequestDoc.ref, {
          status: "rejected",
          processedAt: revokedAt,
          processedBy: uid,
          rejectionReason: "member-removed",
        });
      }
    });

    const pendingInvites = Array.isArray(company.pendingInvites) ? company.pendingInvites : [];
    const updatedInvites = pendingInvites.map((invite) => (
      invite.status === "pending" && normalizeEmail(invite.email) === targetEmail
        ? { ...invite, status: "revoked", revokedAt: admin.firestore.Timestamp.now(), revokedBy: uid }
        : invite
    ));
    transaction.update(companyRef, {
      teamMembers: admin.firestore.FieldValue.arrayRemove(memberId),
      pendingInvites: updatedInvites,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (targetUser.companyId === companyId) {
      transaction.update(targetUserRef, {
        companyId: null,
        role: null,
        hasCompletedSetup: false,
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    if (publicProfileSnap.exists && publicProfileSnap.data()?.isPublicProfile === true) {
      transaction.set(publicProfileRef, {
        publicMemberCount: publicMemberCountFor(company, null, memberId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });
  return { success: true };
});

const getCompanyOwnerAndCoOwnerUids = async (db, company, transaction) => {
  const memberIds = Array.isArray(company?.teamMembers) ? company.teamMembers : [];
  const uids = new Set([company?.ownerId].filter((id) => typeof id === "string" && id.trim()));
  if (memberIds.length > 0) {
    const userDocs = await Promise.all(
      memberIds.map((memberId) => {
        const ref = db.collection("users").doc(memberId);
        return transaction ? transaction.get(ref) : ref.get();
      })
    );
    for (const userDoc of userDocs) {
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.companyId === company.id && (userData.role === "co-owner" || userData.role === "owner")) {
          uids.add(userDoc.id);
        }
      }
    }
  }
  return Array.from(uids);
};

const deleteCompanyAndAssociatedData = async (db, companyId, company) => {
  const memberIds = Array.isArray(company?.teamMembers) ? company.teamMembers : [];
  const allMemberUids = new Set([company?.ownerId, ...memberIds].filter((id) => typeof id === "string" && id.trim()));

  const userQuery = await db.collection("users").where("companyId", "==", companyId).get();
  userQuery.docs.forEach((docSnap) => allMemberUids.add(docSnap.id));

  const uidsArray = Array.from(allMemberUids);
  for (let i = 0; i < uidsArray.length; i += 400) {
    await db.runTransaction(async transaction => {
      const references = uidsArray.slice(i, i + 400).map(uid => db.collection("users").doc(uid));
      const users = await transaction.getAll(...references);
      for (const user of users) {
        // A stale or malicious member list must never unlink another company.
        if (!user.exists || user.data().companyId !== companyId) continue;
        transaction.update(user.ref, {
          companyId: null,
          role: null,
          hasCompletedSetup: false,
          lastActive: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });
  }

  const topLevelCollections = [
    "joinRequests",
    "companyInvites",
    "notifications",
    "marketplace_listings",
    "marketplace_responses",
    "diseaseReports",
    "assets",
  ];
  for (const collectionName of topLevelCollections) {
    const snapshot = await db.collection(collectionName).where("companyId", "==", companyId).get();
    if (!snapshot.empty) {
      const deletePromises = [];
      for (let i = 0; i < snapshot.docs.length; i += 400) {
        const batch = db.batch();
        snapshot.docs.slice(i, i + 400).forEach((docSnap) => batch.delete(docSnap.ref));
        deletePromises.push(batch.commit());
      }
      await Promise.all(deletePromises);
    }
  }

  await db.collection("publicCompanyProfiles").doc(companyId).delete().catch(() => null);

  const companyRef = db.collection("companies").doc(companyId);
  await db.recursiveDelete(companyRef);
};

// The company field is a UI projection. Old client-writable records cannot
// establish consent; only this private, server-owned record can do that.
const transitionCompanyDeletion = async (db, companyId, uid, action) => db.runTransaction(async transaction => {
  const companyRef = db.collection("companies").doc(companyId);
  const requestRef = companyRef.collection("deletionRequests").doc("current");
  const [companySnap, userSnap, requestSnap] = await Promise.all([
    transaction.get(companyRef), transaction.get(db.collection("users").doc(uid)), transaction.get(requestRef),
  ]);
  if (!companySnap.exists) throw new HttpsError("not-found", "Company not found.");
  const company = { ...companySnap.data(), id: companyId, deletionRequest: requestSnap.data() || null };
  const user = userSnap.data() || null;
  if (!canManageCompanyDeletion(company, user, uid)) {
    throw new HttpsError("permission-denied", "Only company owners and co-owners can manage company deletion.");
  }
  const ownerAndCoOwnerUids = await getCompanyOwnerAndCoOwnerUids(db, company, transaction);
  if (action === "cancel" && !requestSnap.exists && companySnap.data().deletionRequest?.status === "pending") {
    // Let existing clients dismiss a legacy pending display and start again.
    // Its old approver lists are never accepted as consent or recipients.
    company.deletionRequest = { status: "pending", requiredApproverIds: ownerAndCoOwnerUids, approvedByIds: [] };
  }
  let evaluation, record;
  if (action === "request") {
    evaluation = evaluateDeletionRequest({ company, requesterUid: uid,
      requesterName: typeof user?.name === "string" && user.name.trim() ? user.name.trim() : user?.email || "Owner", ownerAndCoOwnerUids });
    if (!evaluation.allowed) throw new HttpsError("already-exists", "Cannot request company deletion.");
    record = { ...evaluation.record, requestedAt: admin.firestore.Timestamp.fromMillis(evaluation.record.requestedAtMs) };
    delete record.requestedAtMs;
  } else if (action === "approve") {
    evaluation = evaluateDeletionApproval({ company, approverUid: uid, ownerAndCoOwnerUids });
    if (!evaluation.allowed) throw new HttpsError(evaluation.reason === "already-approved" ? "already-exists" : "failed-precondition", "Cannot approve company deletion. Start a new request if needed.");
    record = { ...company.deletionRequest, requiredApproverIds: evaluation.requiredApproverIds,
      approvedByIds: evaluation.approvedByIds, status: evaluation.isFullyApproved ? "approved" : "pending" };
  } else {
    evaluation = evaluateDeletionCancellation({ company, cancellerUid: uid, ownerAndCoOwnerUids });
    if (!evaluation.allowed) throw new HttpsError("failed-precondition", "No pending deletion request to cancel.");
    record = { ...company.deletionRequest, status: "cancelled", cancelledBy: uid,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp() };
  }
  transaction.set(requestRef, record);
  transaction.update(companyRef, { deletionRequest: record, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { company, user, evaluation, record };
});

exports.requestCompanyDeletion = onCall(async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before managing company deletion.");
  if (!companyId || companyId.length > 160) throw new HttpsError("invalid-argument", "A valid company ID is required.");

  const db = admin.firestore();
  const { company, evaluation, record } = await transitionCompanyDeletion(db, companyId, uid, "request");

  if (evaluation.isFullyApproved) {
    await deleteCompanyAndAssociatedData(db, companyId, company);
    return { success: true, status: "deleted" };
  }

  const otherApprovers = record.requiredApproverIds.filter((id) => id !== uid);
  const notificationPromises = otherApprovers.map((targetUid) => (
    db.collection("notifications").add({
      companyId,
      userId: targetUid,
      type: "team",
      title: "Company Deletion Approval Required",
      message: `${evaluation.record.requestedByName} requested to delete the company. Your approval is required.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      priority: "high",
      icon: "warning",
      color: "#e74c3c",
    })
  ));
  await Promise.all(notificationPromises);

  return {
    success: true,
    status: "pending",
    approvedCount: evaluation.record.approvedByIds.length,
    totalRequired: evaluation.record.requiredApproverIds.length,
    approvedByIds: evaluation.record.approvedByIds,
    requiredApproverIds: evaluation.record.requiredApproverIds,
  };
});

exports.approveCompanyDeletion = onCall(async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before approving company deletion.");
  if (!companyId || companyId.length > 160) throw new HttpsError("invalid-argument", "A valid company ID is required.");

  const db = admin.firestore();
  const { company, evaluation } = await transitionCompanyDeletion(db, companyId, uid, "approve");

  if (evaluation.isFullyApproved) {
    await deleteCompanyAndAssociatedData(db, companyId, company);
    return { success: true, status: "deleted" };
  }

  return {
    success: true,
    status: "pending",
    approvedCount: evaluation.approvedCount,
    totalRequired: evaluation.totalRequired,
    approvedByIds: evaluation.approvedByIds,
  };
});

exports.cancelCompanyDeletion = onCall(async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId.trim() : "";
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isVerifiedAuth(request)) throw new HttpsError("failed-precondition", "Verify your email address before cancelling company deletion.");
  if (!companyId || companyId.length > 160) throw new HttpsError("invalid-argument", "A valid company ID is required.");

  const db = admin.firestore();
  const { user, record } = await transitionCompanyDeletion(db, companyId, uid, "cancel");
  const approvers = record.requiredApproverIds;
  const otherApprovers = approvers.filter((id) => id !== uid);
  const notificationPromises = otherApprovers.map((targetUid) => (
    db.collection("notifications").add({
      companyId,
      userId: targetUid,
      type: "team",
      title: "Company Deletion Cancelled",
      message: `${typeof user?.name === "string" ? user.name : "An owner"} cancelled the company deletion request.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      priority: "medium",
      icon: "information-circle",
      color: "#0F4C75",
    })
  ));
  await Promise.all(notificationPromises);

  return { success: true, status: "cancelled" };
});
