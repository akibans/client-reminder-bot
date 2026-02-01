import { Reminder, Client, sequelize } from './models/index.js';

async function testDelete() {
    try {
        await sequelize.authenticate();
        console.log("Connected.");
        
        // Find a reminder that has clients
        const reminder = await Reminder.findOne({
            include: Client
        });
        
        if (!reminder) {
            console.log("No reminders found to test delete.");
            return;
        }
        
        console.log(`Attempting to delete reminder: ${reminder.id}`);
        // Clear associations first to avoid FK constraint issues in SQLite
        await reminder.setClients([]);
        await reminder.destroy();
        console.log("Deleted successfully.");
        
    } catch (error) {
        console.error("--- DELETION ERROR CAUGHT ---");
        console.error(error);
        console.error("-----------------------------");
    } finally {
        await sequelize.close();
    }
}

testDelete();
