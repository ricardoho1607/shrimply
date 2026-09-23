const { HttpsError } = require("firebase-functions/v2/https");
const { renderVerificationEmail } = require("./verificationEmailCore");

const createVerificationEmailHandler = ({ getUser, generateLink, rateLimit, sendEmail, logAppCheck = () => {} }) => async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in to request a verification email.");

  logAppCheck(request);
  const user = await getUser(uid);
  if (!user.email) throw new HttpsError("failed-precondition", "This account has no email address.");
  if (user.emailVerified) throw new HttpsError("failed-precondition", "This email address is already verified.");

  await rateLimit(uid);
  const link = await generateLink(user.email);
  const { subject, text, html } = renderVerificationEmail(request.data?.locale, link);
  await sendEmail({ to: user.email, subject, text, html });
  return { sent: true };
};

module.exports = { createVerificationEmailHandler };
