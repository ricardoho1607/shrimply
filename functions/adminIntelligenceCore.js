const PLATFORM_OWNER_CLAIM = "platformOwner";

const hasPlatformOwnerClaim = (auth) => Boolean(
  auth?.uid
  && (
    auth.token?.[PLATFORM_OWNER_CLAIM] === true
    || auth.token?.platformRole === "owner"
  )
);

const maskEmail = (email) => {
  const normalized = String(email || "").trim();
  const at = normalized.indexOf("@");
  if (at <= 0) return "Unavailable";
  const local = normalized.slice(0, at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(4, Math.min(8, local.length - visible.length)))}${normalized.slice(at)}`;
};

const maskPhone = (phone) => {
  const normalized = String(phone || "").trim();
  if (!normalized) return "Unavailable";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `${normalized.startsWith("+") ? "+" : ""}•• ••• ••• ${digits.slice(-4)}`;
};

const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0][0] || ""}${parts.length > 1 ? parts[parts.length - 1][0] || "" : ""}`.toUpperCase();
};

const getLatestIsoTimestamp = (values) => {
  let latest = null;
  values.forEach((value) => {
    if (!value) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed;
  });
  return latest?.toISOString() || null;
};

const normalizeText = (value, max = 160) => String(value || "").trim().slice(0, max);

const isValidDeleteUserRequest = ({ reason, confirmation, expectedConfirmation }) => (
  String(reason || "").trim().length >= 10
  && String(confirmation || "").trim().toLowerCase() === String(expectedConfirmation || "").trim().toLowerCase()
);

const deriveAccountStatus = ({ explicitStatus, lastActiveAt, billingStatus }) => {
  if (["suspended", "disabled", "blocked"].includes(String(explicitStatus || "").toLowerCase())) return "Suspended";
  const lastActive = lastActiveAt ? new Date(lastActiveAt) : null;
  const inactiveDays = lastActive && !Number.isNaN(lastActive.getTime())
    ? (Date.now() - lastActive.getTime()) / 86_400_000
    : Number.POSITIVE_INFINITY;
  if (inactiveDays > 90) return "Inactive";
  if (inactiveDays > 30 || ["past_due", "unpaid", "canceled"].includes(String(billingStatus || "").toLowerCase())) return "At Risk";
  return "Healthy";
};

const adoptionPercentage = (eventCount, healthyTarget) => Math.max(0, Math.min(100, Math.round((eventCount / healthyTarget) * 100)));

module.exports = {
  PLATFORM_OWNER_CLAIM,
  adoptionPercentage,
  deriveAccountStatus,
  getInitials,
  getLatestIsoTimestamp,
  hasPlatformOwnerClaim,
  isValidDeleteUserRequest,
  maskEmail,
  maskPhone,
  normalizeText,
};
