import nodemailer from 'nodemailer';

/**
 * Creates a nodemailer transporter based on environment configuration.
 * When EMAIL_ENABLED is false (default for development), a test/ethereal
 * transporter is simulated and tokens are logged to the console instead.
 */
function createTransporter() {
  if (process.env.EMAIL_ENABLED === 'true') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  // Development stub — no real emails sent
  return null;
}

/**
 * Sends an email verification link to a newly registered user.
 *
 * @param {string} email - Recipient email address
 * @param {string} token - Verification token
 */
export async function sendVerificationEmail(email, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  if (process.env.EMAIL_ENABLED !== 'true') {
    console.log(`[DEV] Email verification link for ${email}: ${verifyUrl}`);
    return;
  }

  const transporter = createTransporter();
  const fromAddress = process.env.EMAIL_FROM || 'LearnSphere <noreply@example.com>';

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: 'Verify your LearnSphere account',
    text: `Welcome to LearnSphere!\n\nPlease verify your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create an account, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to LearnSphere!</h1>
        <p>Thanks for signing up. Please verify your email address to activate your account.</p>
        <a href="${verifyUrl}"
           style="display: inline-block; padding: 12px 24px; background-color: #3b82f6;
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email Address
        </a>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #6b7280; font-size: 14px;">
          If you did not create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
