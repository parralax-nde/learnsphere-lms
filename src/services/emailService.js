'use strict';

const nodemailer = require('nodemailer');

/**
 * Returns a configured Nodemailer transporter.
 * In test mode, messages are silently swallowed unless SMTP_HOST is set
 * to a real test server (e.g. Mailhog / Ethereal).
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
}

/**
 * Sends a password-reset email.
 *
 * @param {string} to        Recipient email address
 * @param {string} resetUrl  Full URL containing the reset token
 */
async function sendPasswordResetEmail(to, resetUrl) {
  const transporter = createTransporter();

  const expiryMinutes =
    Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MIN) || 60;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'LearnSphere <no-reply@example.com>',
    to,
    subject: 'Reset your LearnSphere password',
    text: [
      'You (or someone else) requested a password reset for your LearnSphere account.',
      '',
      `Click the link below to set a new password. This link expires in ${expiryMinutes} minute(s).`,
      '',
      resetUrl,
      '',
      "If you did not request a password reset, you can safely ignore this email – your password will not change.",
    ].join('\n'),
    html: `
      <p>You (or someone else) requested a password reset for your LearnSphere account.</p>
      <p>Click the button below to set a new password. This link expires in <strong>${expiryMinutes} minute(s)</strong>.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request a password reset, you can safely ignore this email – your password will not change.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail };
