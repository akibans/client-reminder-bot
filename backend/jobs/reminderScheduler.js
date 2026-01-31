import cron from "node-cron";
import { Op } from "sequelize";
import Reminder from "../models/Reminder.js";
import Client from "../models/Client.js";
import sendEmail from "../config/mail.js";
import sendWhatsApp from "../config/whatsapp.js";

cron.schedule("* * * * *", async () => {
    console.log("Checking for due reminders...");
    try {
        const reminders = await Reminder.findAll({
            where: {
                scheduleAt: { [Op.lte]: new Date() },
                sent: false
            },
            include: Client
        });

        for (let r of reminders) {
            console.log(`Processing reminder ${r.id}: "${r.message}"`);
            const clients = r.Clients || []; 
            
            if (clients.length === 0) {
                console.warn(`No clients associated with reminder ${r.id}`);
                r.status = 'failed';
                r.failureReason = 'No clients associated';
                r.sent = true;
                await r.save();
                continue;
            }

            let successCount = 0;
            let lastError = null;

            for (let client of clients) {
                try {
                    if (r.sendVia === "email" && client.email) {
                        console.log(`Attempting to send email to ${client.email}...`);
                        await sendEmail(client.email, r.message);
                        console.log(`✅ Sent email to ${client.email} for reminder ${r.id}`);
                        successCount++;
                    } else if (r.sendVia === "whatsapp" && client.phone) {
                        console.log(`Attempting to send WhatsApp message to ${client.phone}...`);
                        await sendWhatsApp(client.phone, r.message);
                        console.log(`✅ Sent WhatsApp to ${client.phone} for reminder ${r.id}`);
                        successCount++;
                    }
                } catch (sendError) {
                    console.error(`❌ Failed to send reminder to ${client.email || client.phone || client.name}:`, sendError);
                    lastError = sendError.message;
                }
            }
            
            // Update status based on delivery success
            r.sentAt = new Date(); // Professional Audit Timestamp

            if (successCount === clients.length) {
                r.sent = true;
                r.status = 'sent';
                r.failureReason = null;
            } else if (successCount > 0) {
                r.sent = true;
                r.status = 'sent'; // Partial success is still 'sent'
                r.failureReason = `Partial failure: ${lastError}`;
            } else {
                // If every client failed, increment retryCount
                r.retryCount += 1;
                
                if (r.retryCount >= 3) {
                    r.sent = true; // Give up after 3 attempts
                    r.status = 'failed';
                    r.failureReason = `Failed after 3 attempts. Last error: ${lastError}`;
                } else {
                    r.status = 'failed'; // Mark as failed but keep 'sent=false' to retry
                    r.failureReason = `Attempt ${r.retryCount} failed: ${lastError}. Retrying later...`;
                }
            }

            await r.save();
            console.log(`Processed reminder ${r.id}. Status: ${r.status}, RetryCount: ${r.retryCount}`);
        }
    } catch (error) {
        console.error("Scheduler Error:", error);
    }
});
