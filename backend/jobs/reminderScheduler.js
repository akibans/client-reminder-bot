import cron from "node-cron";
import { Op } from "sequelize";
import db from "../models/index.js";
import sendEmail from "../services/emailService.js";
import whatsappService from "../services/whatsappService.js";
import crypto from "crypto";

const { Reminder, Client, ReminderEvent } = db;

cron.schedule("* * * * *", async () => {
    console.log("Checking for due reminders...");
    try {
        const reminders = await Reminder.findAll({
            where: {
                scheduleAt: { [Op.lte]: new Date() },
                sent: false,
                isProcessing: false
            },
            include: [{
                model: Client,
                as: 'clients',
                through: { attributes: [] }
            }]
        });

        for (let r of reminders) {
            const correlationId = crypto.randomUUID();
            // Lock the reminder
            r.isProcessing = true;
            await r.save();
            console.log(`Processing reminder ${r.id}: "${r.message}"`);
            const clients = r.clients || []; 
            
            if (clients.length === 0) {
                console.warn(`No clients associated with reminder ${r.id}`);
                r.status = 'failed';
                r.failureReason = 'No clients associated';
                r.sent = true;
                r.isProcessing = false;
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
                        // Check if WhatsApp is connected
                        const status = whatsappService.getStatus();
                        if (status.status !== 'connected') {
                            console.warn(`⚠️ WhatsApp disconnected. Skipping send for ${client.phone}`);
                            lastError = 'WhatsApp service disconnected';
                            continue; 
                        }

                        console.log(`Attempting to send WhatsApp message to ${client.phone}...`);
                        const result = await whatsappService.sendMessage(client.phone, r.message);
                        if (result.success) {
                            console.log(`✅ Sent WhatsApp to ${client.phone} for reminder ${r.id}`);
                            successCount++;
                        } else {
                            console.error(`❌ WhatsApp send failed: ${result.error}`);
                            lastError = result.error;
                        }
                    } else {
                        console.warn(`⚠️ No valid contact for ${client.name} via ${r.sendVia}`);
                        lastError = `No ${r.sendVia} contact for ${client.name}`;
                    }
                } catch (sendError) {
                    console.error(`❌ Failed to send reminder to ${client.email || client.phone || client.name}:`, sendError);
                    lastError = sendError.message;
                }
            }
            
            // Update status based on delivery success
            r.sentAt = new Date();

            if (successCount === clients.length) {
                r.sent = true;
                r.status = 'sent';
                r.failureReason = null;
            } else if (successCount > 0) {
                r.sent = true;
                r.status = 'sent';
                r.failureReason = `Partial failure: ${successCount}/${clients.length} delivered. Error: ${lastError}`;
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

            r.isProcessing = false;
            await r.save();
            console.log(`Processed reminder ${r.id}. Status: ${r.status}, RetryCount: ${r.retryCount}`);
        }
    } catch (error) {
        console.error("Scheduler Error:", error);
    }
});
