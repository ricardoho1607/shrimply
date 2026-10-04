const { HttpsError } = require("firebase-functions/v2/https");
const { onCall } = require('./shared/guardedCallable');
const { defineSecret } = require("firebase-functions/params");
const admin = require("./firebaseAdmin");
const {
  enforceFixedWindowLimits,
  logCallableAppCheckStatus,
} = require("./abuseProtection");

const DAY_MS = 1000 * 60 * 60 * 24;
const resendApiKeySecret = defineSecret("RESEND_API_KEY");
const TESTER_REQUEST_ADMIN_EMAIL = "ricardofransiskusho@gmail.com";

const sanitizeTesterText = (value, maxLength = 400) => (
  typeof value === "string" ? value.trim().slice(0, maxLength) : ""
);

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const sendTesterRequestEmail = async (requestData) => {
  let apiKey = "";
  try {
    apiKey = resendApiKeySecret.value() || process.env.RESEND_API_KEY || "";
  } catch (_error) {
    apiKey = process.env.RESEND_API_KEY || "";
  }
  if (!apiKey) {
    return {
      status: "skipped",
      reason: "RESEND_API_KEY is not configured for Cloud Functions.",
    };
  }

  const to = process.env.TESTER_REQUEST_EMAIL_TO || TESTER_REQUEST_ADMIN_EMAIL;
  const from = process.env.TESTER_REQUEST_EMAIL_FROM || "Shrimply <onboarding@shrimplytech.com>";
  const html = `
    <h2>New Shrimply Android tester request</h2>
    <p><strong>Name:</strong> ${escapeHtml(requestData.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(requestData.email)}</p>
    <p><strong>Company/Farm:</strong> ${escapeHtml(requestData.company || "Not provided")}</p>
    <p><strong>Role:</strong> ${escapeHtml(requestData.role || "Not provided")}</p>
    <p><strong>Country:</strong> ${escapeHtml(requestData.country || "Not provided")}</p>
    <p><strong>Android device:</strong> ${escapeHtml(requestData.androidDevice || "Not provided")}</p>
    <p><strong>Reason:</strong><br />${escapeHtml(requestData.reason || "Not provided")}</p>
    <p>This request was submitted from shrimplytech.com/download.</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Shrimply tester request: ${requestData.name}`,
      html,
      reply_to: requestData.email,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      status: "failed",
      reason: `Resend returned ${response.status}: ${body.slice(0, 300)}`,
    };
  }

  return {
    status: "sent",
    provider: "resend",
  };
};

exports.requestAndroidTesterAccess = onCall({ secrets: [resendApiKeySecret] }, async (request) => {
  const name = sanitizeTesterText(request.data?.name, 120);
  const email = sanitizeTesterText(request.data?.email, 200).toLowerCase();
  const company = sanitizeTesterText(request.data?.company, 160);
  const role = sanitizeTesterText(request.data?.role, 120);
  const country = sanitizeTesterText(request.data?.country, 120);
  const androidDevice = sanitizeTesterText(request.data?.androidDevice, 160);
  const reason = sanitizeTesterText(request.data?.reason, 1200);

  if (!name) {
    throw new HttpsError("invalid-argument", "Name is required.");
  }
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }

  const db = admin.firestore();
  const clientIp = sanitizeTesterText(
    request.rawRequest?.ip || request.rawRequest?.socket?.remoteAddress,
    120,
  );
  await enforceFixedWindowLimits({
    db,
    admin,
    limits: [
      {
        namespace: "testerEmailDaily",
        scope: `email:${email}`,
        limit: 3,
        windowMs: DAY_MS,
        message: "Too many tester requests for this email. Try again tomorrow.",
      },
      {
        namespace: "testerIpDaily",
        scope: clientIp ? `ip:${clientIp}` : null,
        limit: 10,
        windowMs: DAY_MS,
        message: "Too many tester requests from this network. Try again tomorrow.",
      },
    ],
  });
  logCallableAppCheckStatus(request, "requestAndroidTesterAccess");
  const requestRef = db.collection("testerRequests").doc(encodeURIComponent(email));
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    name,
    email,
    company,
    role,
    country,
    androidDevice,
    reason,
    platform: "android",
    releaseTrack: "closed_testing",
    status: "pending",
    source: "download_page",
    userAgent: sanitizeTesterText(request.rawRequest?.headers?.["user-agent"], 300),
    updatedAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    transaction.set(requestRef, {
      ...payload,
      createdAt: snapshot.exists ? snapshot.data().createdAt || now : now,
      requestCount: admin.firestore.FieldValue.increment(1),
      lastRequestedAt: now,
    }, { merge: true });
  });

  const emailDelivery = await sendTesterRequestEmail(payload).catch((error) => ({
    status: "failed",
    reason: error instanceof Error ? error.message : String(error),
  }));

  await requestRef.set({
    emailDelivery,
    emailDeliveryUpdatedAt: now,
  }, { merge: true });

  return {
    success: true,
    status: "pending",
    emailDelivery,
  };
});
