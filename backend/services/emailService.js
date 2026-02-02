import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, text) => {
  const isMock = process.env.EMAIL_MODE === 'mock';
  console.log(`[EMAIL] ${isMock ? 'MOCK' : 'LIVE'} Attempting to send message to: ${to}`);
  
  if (isMock) {
    console.log(`[EMAIL MOCK PAYLOAD] To: ${to}, Body: ${text}`);
    return { messageId: 'mock-id-' + Date.now() };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "New Reminder",
      text,
    });
    console.log(`✅ [EMAIL] Sent successfully to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send to ${to}:`, error.message);
    throw error; // Re-throw to allow scheduler to handle failure
  }
};

export default sendEmail;
