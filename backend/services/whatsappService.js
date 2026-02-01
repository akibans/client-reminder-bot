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
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  console.log(`[WHATSAPP] Attempting to send message to: ${formattedTo}`);
  
  try {
    if (!client) {
      console.log(`[WHATSAPP MOCK] No Twilio client. Logging message details:`);
      console.log(`[WHATSAPP MOCK] To: ${formattedTo}`);
      console.log(`[WHATSAPP MOCK] Body: ${body}`);
      return { sid: "mock_delivered_success" };
    }
    
    const message = await client.messages.create({
      from: process.env.TWILIO_PHONE,
      to: formattedTo,
      body: body,
    });
    
    console.log(`✅ [WHATSAPP] Sent successfully to ${formattedTo}. SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`❌ [WHATSAPP] Failed to send to ${formattedTo}:`, error.message);
    throw error;
  }
};

export default sendWhatsApp;
