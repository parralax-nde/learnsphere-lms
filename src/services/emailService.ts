import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface VerificationEmailOptions {
  to: string;
  verificationUrl: string;
}

function createTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If SMTP credentials are not configured, use a test/stub transporter
  if (!host || !user || !pass) {
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export const transporter = createTransporter();

/**
 * Sends a verification email with a unique time-limited link to the user.
 */
export async function sendVerificationEmail(
  options: VerificationEmailOptions,
): Promise<void> {
  const from =
    process.env.EMAIL_FROM ?? 'LearnSphere LMS <noreply@learnsphere.example.com>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Verify Your Email Address</h2>
      <p>Thank you for signing up for LearnSphere LMS! Please verify your email address to activate your account.</p>
      <p>Click the button below to verify your email. This link will expire in <strong>24 hours</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${options.verificationUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #4b5563;">${options.verificationUrl}</p>
      <p style="color: #6b7280; font-size: 14px;">
        If you did not create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  const text = `
Verify Your Email Address

Thank you for signing up for LearnSphere LMS! Please verify your email address to activate your account.

Click the link below to verify your email. This link will expire in 24 hours:
${options.verificationUrl}

If you did not create an account, you can safely ignore this email.
  `.trim();

  await transporter.sendMail({
    from,
    to: options.to,
    subject: 'Verify your LearnSphere LMS account',
    text,
    html,
  });
}
