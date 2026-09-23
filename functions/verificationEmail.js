const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("./firebaseAdmin");
const { enforceFixedWindowLimits, logCallableAppCheckStatus } = require("./abuseProtection");
const { createVerificationEmailHandler } = require("./verificationEmailHandler");

const resendApiKeySecret = defineSecret("VERIFICATION_RESEND_API_KEY");

const rateLimit = (uid) => enforceFixedWindowLimits({
    db: admin.firestore(),
    admin,
    limits: [
      { namespace: "verificationEmailMinute", scope: uid, limit: 1, windowMs: 60_000,
        message: "Please wait a minute before requesting another email." },
      { namespace: "verificationEmailDay", scope: uid, limit: 10, windowMs: 86_400_000,
        message: "Too many verification emails. Try again tomorrow." },
    ],
});

const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = resendApiKeySecret.value();
  if (!apiKey) throw new HttpsError("unavailable", "Verification email is temporarily unavailable.");
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Shrimply <noreply@shrimplytech.com>",
        to,
        reply_to: "shrimply.tech@gmail.com",
        subject,
        text,
        html,
      }),
    });
  } catch (error) {
    console.error("Verification email provider request failed", error);
    throw new HttpsError("unavailable", "Could not send a verification email. Please try again.");
  }
  if (!response.ok) {
    console.error("Verification email provider rejected request", { status: response.status });
    throw new HttpsError("unavailable", "Could not send a verification email. Please try again.");
  }
};

exports.sendVerificationEmail = onCall({
  secrets: [resendApiKeySecret],
  serviceAccount: "shrimply-verification@investashrimp-5d9e5.iam.gserviceaccount.com",
}, createVerificationEmailHandler({
  getUser: (uid) => admin.auth().getUser(uid),
  generateLink: (email) => admin.auth().generateEmailVerificationLink(email),
  rateLimit,
  sendEmail,
  logAppCheck: (request) => logCallableAppCheckStatus(request, "sendVerificationEmail"),
}));
