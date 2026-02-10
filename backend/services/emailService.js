import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter on startup
transporter.verify()
  .then(() => console.log('✅ Email service ready'))
  .catch((err) => console.error('❌ Email service error:', err.message));

/**
 * Send an email reminder to a client
 * @param {string} to - Recipient email address
 * @param {string} message - The reminder message body
 * @returns {Promise<object>} - Nodemailer send result
 */
const sendEmail = async (to, message) => {
  if (!to || !message) {
    throw new Error('Email address and message are required');
  }

  const mailOptions = {
    from: `"RemindPro" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reminder Notification',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Reminder</h1>
        </div>
        <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated reminder sent via RemindPro.
          </p>
        </div>
      </div>
    `,
    text: `Reminder: ${message}\n\n---\nThis is an automated reminder sent via RemindPro.`
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} — MessageID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error.message);
    throw error;
  }
};

export default sendEmail;