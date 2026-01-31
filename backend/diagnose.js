import { connectDB } from './config/database.js';
import Client from './models/Client.js';
import Reminder from './models/Reminder.js';
import './models/index.js';

const checkData = async () => {
    try {
        await connectDB();
        const clients = await Client.count();
        const active = await Reminder.count({ where: { sent: false } });
        const sent = await Reminder.count({ where: { sent: true } });
        
        console.log('--- DATABASE DIAGNOSIS ---');
        console.log('Total Clients:', clients);
        console.log('Active Reminders:', active);
        console.log('Messages Sent:', sent);
        console.log('--------------------------');
        process.exit(0);
    } catch (err) {
        console.error('Diagnosis Failed:', err);
        process.exit(1);
    }
};

checkData();
