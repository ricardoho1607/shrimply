const crypto = require("node:crypto");

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STAFF_ROLES = new Set(["co-owner", "manager", "technician", "admin", "mechanic"]);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const hashInviteToken = (token) => crypto
  .createHash("sha256")
  .update(String(token || ""), "utf8")
  .digest("hex");

const toMillis = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(parsed) ? null : parsed;
};

const buildSecureInvite = ({
  companyId,
  email,
  role,
  createdBy,
  message,
  nowMs = Date.now(),
  randomBytes = crypto.randomBytes,
}) => {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(token);
  return {
    token,
    inviteId: tokenHash,
    record: {
      companyId,
      emailNormalized: normalizeEmail(email),
      role,
      tokenHash,
      status: "pending",
      createdBy,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + INVITE_TTL_MS,
      ...(message ? { message } : {}),
    },
  };
};

const evaluateInviteAcceptance = ({
  invite,
  authEmail,
  emailVerified,
  currentCompanyId,
  nowMs = Date.now(),
}) => {
  if (!invite || invite.status !== "pending") return { allowed: false, reason: "invite-not-pending" };
  const expiresAtMs = toMillis(invite.expiresAtMs ?? invite.expiresAt);
  if (expiresAtMs !== null && expiresAtMs <= nowMs) return { allowed: false, reason: "invite-expired" };
  if (!emailVerified) return { allowed: false, reason: "email-unverified" };
  if (normalizeEmail(invite.emailNormalized ?? invite.email) !== normalizeEmail(authEmail)) {
    return { allowed: false, reason: "email-mismatch" };
  }
  if (!STAFF_ROLES.has(invite.role)) return { allowed: false, reason: "role-not-allowed" };
  if (currentCompanyId && currentCompanyId !== invite.companyId) {
    return { allowed: false, reason: "already-in-another-company" };
  }
  return { allowed: true, role: invite.role };
};

const evaluateJoinApproval = ({ request, currentCompanyId }) => {
  if (!request || request.status !== "pending") return { allowed: false, reason: "request-not-pending" };
  if (!STAFF_ROLES.has(request.requestedRole)) return { allowed: false, reason: "role-not-allowed" };
  if (currentCompanyId && currentCompanyId !== request.companyId) {
    return { allowed: false, reason: "already-in-another-company" };
  }
  return { allowed: true, role: request.requestedRole };
};

const evaluateDeletionRequest = ({
  company,
  requesterUid,
  requesterName,
  ownerAndCoOwnerUids,
  nowMs = Date.now(),
}) => {
  if (!company) return { allowed: false, reason: "company-not-found" };
  if (!ownerAndCoOwnerUids || !ownerAndCoOwnerUids.includes(requesterUid)) {
    return { allowed: false, reason: "not-an-owner-or-co-owner" };
  }
  const existing = company.deletionRequest;
  if (existing && existing.status === "pending") {
    return { allowed: false, reason: "deletion-already-requested" };
  }
  const requiredApproverIds = Array.from(new Set(ownerAndCoOwnerUids));
  const approvedByIds = [requesterUid];
  const isFullyApproved = requiredApproverIds.every((id) => approvedByIds.includes(id));
  return {
    allowed: true,
    isFullyApproved,
    record: {
      requestedBy: requesterUid,
      requestedByName: requesterName || null,
      requestedAtMs: nowMs,
      status: isFullyApproved ? "approved" : "pending",
      requiredApproverIds,
      approvedByIds,
    },
  };
};

const evaluateDeletionApproval = ({
  company,
  approverUid,
  ownerAndCoOwnerUids,
}) => {
  if (!company) return { allowed: false, reason: "company-not-found" };
  const deletionRequest = company.deletionRequest;
  if (!deletionRequest || deletionRequest.status !== "pending") {
    return { allowed: false, reason: "no-pending-deletion-request" };
  }
  const requiredApproverIds = Array.isArray(ownerAndCoOwnerUids)
    ? Array.from(new Set(ownerAndCoOwnerUids))
    : [];
  if (!requiredApproverIds.includes(approverUid)) {
    return { allowed: false, reason: "not-an-owner-or-co-owner" };
  }
  const approvedByIds = Array.isArray(deletionRequest.approvedByIds)
    ? Array.from(new Set(deletionRequest.approvedByIds)).filter(id => requiredApproverIds.includes(id))
    : [];
  if (approvedByIds.includes(approverUid)) {
    return { allowed: false, reason: "already-approved" };
  }
  const nextApprovedByIds = [...approvedByIds, approverUid];
  const isFullyApproved = requiredApproverIds.every((id) => nextApprovedByIds.includes(id));
  return {
    allowed: true,
    isFullyApproved,
    requiredApproverIds,
    approvedByIds: nextApprovedByIds,
    totalRequired: requiredApproverIds.length,
    approvedCount: nextApprovedByIds.length,
  };
};

const evaluateDeletionCancellation = ({
  company,
  cancellerUid,
  ownerAndCoOwnerUids,
}) => {
  if (!company) return { allowed: false, reason: "company-not-found" };
  const deletionRequest = company.deletionRequest;
  if (!deletionRequest || deletionRequest.status !== "pending") {
    return { allowed: false, reason: "no-pending-deletion-request" };
  }
  if (!ownerAndCoOwnerUids || !ownerAndCoOwnerUids.includes(cancellerUid)) {
    return { allowed: false, reason: "not-an-owner-or-co-owner" };
  }
  return { allowed: true };
};

module.exports = {
  INVITE_TTL_MS,
  STAFF_ROLES,
  buildSecureInvite,
  evaluateInviteAcceptance,
  evaluateJoinApproval,
  evaluateDeletionRequest,
  evaluateDeletionApproval,
  evaluateDeletionCancellation,
  hashInviteToken,
  normalizeEmail,
  toMillis,
};

