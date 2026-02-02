import cron from "node-cron";
import { Op } from "sequelize";
import Reminder from "../models/Reminder.js";
import Client from "../models/Client.js";
import ReminderEvent from "../models/ReminderEvent.js";
import sendEmail from "../services/emailService.js";
import sendWhatsApp from "../services/whatsappService.js";
import crypto from "crypto";

cron.schedule("* * * * *", async () => {
    console.log("Checking for due reminders...");
    try {
        const reminders = await Reminder.findAll({
            where: {
                scheduleAt: { [Op.lte]: new Date() },
                sent: false,
                isProcessing: false // Idempotency check
            },
            include: Client
        });

        for (let r of reminders) {
            const correlationId = crypto.randomUUID();
            // Lock the reminder
            r.isProcessing = true;
            await r.save();
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
                
                if (r.retryCount >= r.maxRetries) {
                    r.sent = true; 
                    r.status = 'failed';
                    r.failureReason = `Permanently failed after ${r.maxRetries} attempts. Last error: ${lastError}`;
                } else {
                    r.status = 'failed'; 
                    r.failureReason = `Attempt ${r.retryCount} failed: ${lastError}. Retrying later...`;
                }

                await ReminderEvent.create({
                    reminderId: r.id,
                    eventType: 'FAILED',
                    message: r.failureReason,
                    correlationId
                });
            }

            if (r.status === 'sent') {
                await ReminderEvent.create({
                    reminderId: r.id,
                    eventType: 'SENT',
                    message: successCount === clients.length ? 'Successfully delivered to all clients' : `Delivered to ${successCount}/${clients.length} clients`,
                    correlationId
                });
            }

            r.isProcessing = false; // Release lock
            await r.save();
            console.log(`Processed reminder ${r.id}. Status: ${r.status}, RetryCount: ${r.retryCount}`);
        }
    } catch (error) {
        console.error("Scheduler Error:", error);
    }
});
