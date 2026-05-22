// Mailer — sends transactional email via SMTP.
//
// Configuration (all via env vars; .env.example documents these):
//   SMTP_HOST       e.g. "smtp.gmail.com"
//   SMTP_PORT       587 (TLS) or 465 (SSL)
//   SMTP_SECURE     "true" for port 465, "false" for 587
//   SMTP_USER       full sender email
//   SMTP_PASS       app password (NOT your account password — for Gmail use App Passwords)
//   MAIL_FROM       optional friendly From header, e.g. '"SAM Assessment" <noreply@sam.local>'
//
// If SMTP_HOST is not set, we automatically provision an Ethereal test inbox
// (free, no signup) — every email gets a preview URL logged to the server
// console. That's perfect for local development; in production you set real
// SMTP creds.

const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedSource = null; // 'real' | 'ethereal'
let etherealAccount = null;

async function getTransporter() {
  if (cachedTransporter) return { transporter: cachedTransporter, source: cachedSource };

  // Real SMTP if configured
  if (process.env.SMTP_HOST) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    cachedSource = 'real';
    // eslint-disable-next-line no-console
    console.log(`[mailer] Real SMTP configured: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
    return { transporter: cachedTransporter, source: cachedSource };
  }

  // Otherwise fall back to Ethereal (dev only)
  if (!etherealAccount) {
    etherealAccount = await nodemailer.createTestAccount();
    // eslint-disable-next-line no-console
    console.log(`[mailer] No SMTP env vars set — using Ethereal test inbox: ${etherealAccount.user}`);
  }
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: etherealAccount.user, pass: etherealAccount.pass },
  });
  cachedSource = 'ethereal';
  return { transporter: cachedTransporter, source: cachedSource };
}

/**
 * Send the 6-digit password reset code.
 * @returns {{ source: 'real'|'ethereal', previewUrl?: string }}
 */
async function sendResetCode(toEmail, code) {
  const { transporter, source } = await getTransporter();
  const from = process.env.MAIL_FROM
    || `"SAM Assessment" <${process.env.SMTP_USER || 'noreply@sam-assessment.local'}>`;

  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Your SAM Assessment password reset code',
    text:
      `Hi,\n\n` +
      `You requested a password reset on the SAM Assessment Platform.\n\n` +
      `Your verification code is: ${code}\n\n` +
      `This code expires in 10 minutes.\n\n` +
      `If you didn't request this, ignore this email.\n\n` +
      `— SAM Assessment Platform`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="display:inline-block;width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#1e6ee2);color:white;font-weight:700;font-size:24px;line-height:48px;">S</div>
        </div>
        <h2 style="margin:0 0 8px;">Password reset code</h2>
        <p style="color:#475569;margin:0 0 24px;">You requested a password reset on the SAM Assessment Platform. Enter this code in the app to continue.</p>
        <div style="background:#f1f5f9;border-radius:10px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#1e6ee2;">
          ${code}
        </div>
        <p style="color:#64748b;font-size:13px;margin-top:24px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore the email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">
          SAM Assessment Application provides indicative sustainability and certification readiness intelligence. This platform does not replace official certification audits.
        </p>
      </div>
    `,
  });

  const out = { source };
  if (source === 'ethereal') {
    const url = nodemailer.getTestMessageUrl(info);
    out.previewUrl = url;
    // eslint-disable-next-line no-console
    console.log(`[mailer] Ethereal preview URL for ${toEmail}: ${url}`);
  }
  return out;
}

module.exports = { sendResetCode };
