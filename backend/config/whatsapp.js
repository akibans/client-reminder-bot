import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

let client = null;

try {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (sid && token && !sid.includes('your_')) {
    client = twilio(sid, token);
    console.log("✅ Twilio WhatsApp client initialized.");
  } else {
    console.warn("⚠️ Twilio credentials missing or placeholder. WhatsApp will be in LOG ONLY mode.");
  }
} catch (error) {
  console.error("❌ Failed to initialize Twilio client:", error.message);
}

const sendWhatsApp = async (to, body) => {
  try {
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    if (!client) {
      console.log(`\n[WHATSAPP MOCK DELIVERED]`);
      console.log(`To: ${formattedTo}`);
      console.log(`Message: ${body}\n`);
      return { sid: "mock_delivered_success" };
    }
    
    const message = await client.messages.create({
      from: process.env.TWILIO_PHONE,
      to: formattedTo,
      body: body,
    });
    
    console.log(`✅ WhatsApp message sent to ${formattedTo}. SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`❌ Error sending WhatsApp to ${to}:`, error.message);
    throw error;
  }
};

export default sendWhatsApp;
