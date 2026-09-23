const SUPPORTED_LOCALES = new Set(["en", "id", "th", "vi", "zh"]);
const SUPPORT_EMAIL = "shrimply.tech@gmail.com";

const copy = {
  en: {
    subject: "Verify your email for Shrimply",
    greeting: "Hi there,",
    intro: "Thanks for joining Shrimply! Please verify your email address so we know it's yours.",
    action: "Verify my email",
    ignore: "Didn't create a Shrimply account? You can safely ignore this email.",
    help: "Need a hand? Email us at",
    signoff: "The Shrimply team",
  },
  id: {
    subject: "Verifikasi email Anda untuk Shrimply",
    greeting: "Halo,",
    intro: "Terima kasih telah bergabung dengan Shrimply! Verifikasi alamat email Anda agar kami tahu bahwa email ini milik Anda.",
    action: "Verifikasi email saya",
    ignore: "Tidak membuat akun Shrimply? Anda dapat mengabaikan email ini.",
    help: "Butuh bantuan? Hubungi kami di",
    signoff: "Tim Shrimply",
  },
  th: {
    subject: "ยืนยันอีเมลของคุณสำหรับ Shrimply",
    greeting: "สวัสดี,",
    intro: "ขอบคุณที่เข้าร่วม Shrimply! โปรดยืนยันที่อยู่อีเมลเพื่อให้เราทราบว่าเป็นอีเมลของคุณ",
    action: "ยืนยันอีเมลของฉัน",
    ignore: "ไม่ได้สร้างบัญชี Shrimply ใช่ไหม? คุณสามารถละเลยอีเมลนี้ได้",
    help: "ต้องการความช่วยเหลือ? ส่งอีเมลถึงเราที่",
    signoff: "ทีม Shrimply",
  },
  vi: {
    subject: "Xác minh email của bạn cho Shrimply",
    greeting: "Xin chào,",
    intro: "Cảm ơn bạn đã tham gia Shrimply! Vui lòng xác minh địa chỉ email để chúng tôi biết đây là email của bạn.",
    action: "Xác minh email của tôi",
    ignore: "Bạn không tạo tài khoản Shrimply? Bạn có thể bỏ qua email này.",
    help: "Cần giúp đỡ? Hãy gửi email cho chúng tôi tại",
    signoff: "Đội ngũ Shrimply",
  },
  zh: {
    subject: "验证您的 Shrimply 邮箱",
    greeting: "您好，",
    intro: "感谢您加入 Shrimply！请验证您的邮箱地址，以确认这是您的邮箱。",
    action: "验证我的邮箱",
    ignore: "没有注册 Shrimply 账号？您可以忽略这封邮件。",
    help: "需要帮助？请发送邮件至",
    signoff: "Shrimply 团队",
  },
};

const normalizeLocale = (value) => {
  const base = typeof value === "string" ? value.trim().toLowerCase().split(/[-_]/)[0] : "";
  return SUPPORTED_LOCALES.has(base) ? base : "en";
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

const renderVerificationEmail = (locale, link) => {
  const language = normalizeLocale(locale);
  const message = copy[language];
  const safeLink = escapeHtml(link);
  const text = [
    message.greeting,
    message.intro,
    `${message.action}: ${link}`,
    message.ignore,
    `${message.help} ${SUPPORT_EMAIL}`,
    message.signoff,
  ].join("\n\n");
  const html = `<!doctype html><html lang="${language}"><body style="margin:0;background:#f5f8fb;font-family:Arial,sans-serif;color:#163047"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:12px"><h1 style="font-size:24px;color:#0F4C75">Shrimply</h1><p>${escapeHtml(message.greeting)}</p><p>${escapeHtml(message.intro)}</p><p style="margin:32px 0"><a href="${safeLink}" style="background:#0F4C75;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(message.action)}</a></p><p style="font-size:13px;word-break:break-all"><a href="${safeLink}">${safeLink}</a></p><p>${escapeHtml(message.ignore)}</p><p>${escapeHtml(message.help)} <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p><p>${escapeHtml(message.signoff)}</p></main></body></html>`;
  return { language, subject: message.subject, text, html };
};

module.exports = { normalizeLocale, renderVerificationEmail };
