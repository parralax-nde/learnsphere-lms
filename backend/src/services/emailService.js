import nodemailer from 'nodemailer';

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
  return null;
}

async function sendMail(options) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email - DEV] To: ${options.to} | Subject: ${options.subject}`);
    if (options.text) console.log(`[Email - DEV] Body: ${options.text}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"LearnSphere" <noreply@learnsphere.com>',
    ...options,
  });
}

/**
 * Notify all admins that a course has been submitted for review.
 */
export async function sendCourseSubmittedEmail({ adminEmails, courseName, instructorName, courseId }) {
  const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/review/${courseId}`;
  await sendMail({
    to: adminEmails.join(', '),
    subject: `[LearnSphere] New course submitted for review: "${courseName}"`,
    text: `Hello,\n\nInstructor "${instructorName}" has submitted the course "${courseName}" for review.\n\nReview it here: ${reviewUrl}\n\n— LearnSphere`,
    html: `
      <p>Hello,</p>
      <p>Instructor <strong>${instructorName}</strong> has submitted the course <strong>"${courseName}"</strong> for review.</p>
      <p><a href="${reviewUrl}">Click here to review the course</a></p>
      <p>— LearnSphere</p>
    `,
  });
}

/**
 * Notify instructor that their course was approved.
 */
export async function sendCourseApprovedEmail({ instructorEmail, courseName }) {
  await sendMail({
    to: instructorEmail,
    subject: `[LearnSphere] Your course "${courseName}" has been approved!`,
    text: `Congratulations!\n\nYour course "${courseName}" has been reviewed and approved. It is now published on LearnSphere.\n\n— LearnSphere`,
    html: `
      <p>Congratulations!</p>
      <p>Your course <strong>"${courseName}"</strong> has been reviewed and <strong>approved</strong>. It is now published on LearnSphere.</p>
      <p>— LearnSphere</p>
    `,
  });
}

/**
 * Notify instructor that their course was rejected with a reason.
 */
export async function sendCourseRejectedEmail({ instructorEmail, courseName, rejectionNote }) {
  await sendMail({
    to: instructorEmail,
    subject: `[LearnSphere] Your course "${courseName}" requires revisions`,
    text: `Hello,\n\nUnfortunately, your course "${courseName}" was not approved at this time.\n\nFeedback from the reviewer:\n${rejectionNote}\n\nPlease address the feedback and resubmit.\n\n— LearnSphere`,
    html: `
      <p>Hello,</p>
      <p>Unfortunately, your course <strong>"${courseName}"</strong> was not approved at this time.</p>
      <p><strong>Feedback from the reviewer:</strong></p>
      <blockquote>${rejectionNote}</blockquote>
      <p>Please address the feedback and resubmit your course.</p>
      <p>— LearnSphere</p>
    `,
  });
}
