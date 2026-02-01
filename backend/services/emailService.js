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
  console.log(`[EMAIL] Attempting to send message to: ${to}`);
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
