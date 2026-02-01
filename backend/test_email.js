import sendEmail from './services/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

async function testImmediateEmail() {
    console.log("Testing email delivery to clientreminder.bot@gmail.com...");
    try {
        await sendEmail('clientreminder.bot@gmail.com', 'This is a real-time test reminder.');
        console.log("Test execution finished.");
    } catch (err) {
        console.error("Test failed with error:", err.message);
    }
}

testImmediateEmail();
