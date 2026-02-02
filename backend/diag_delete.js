import { Reminder, Client, sequelize } from './models/index.js';

async function testDelete() {
    try {
        console.log("Checking models registered in sequelize:");
        console.log(Object.keys(sequelize.models));
        
        const junctionTable = sequelize.models.ClientReminders;
        if (!junctionTable) {
            console.log("Junction table ClientReminders NOT found in sequelize.models!");
        } else {
            console.log("Junction table ClientReminders found.");
        }

        console.log("Fetching a reminder to delete...");
        const reminder = await Reminder.findOne();
        if (!reminder) {
            console.log("No reminders found to test.");
            return;
        }
        console.log(`Found reminder: ${reminder.id}. Attempting to delete...`);
        
        // Manual clearing as in controller
        console.log("Clearing clients...");
        await reminder.setClients([]);
        
        console.log("Destroying reminder...");
        await reminder.destroy();
        
        console.log("Successfully deleted.");
    } catch (err) {
        console.error("Deletion failed with error:");
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

testDelete();
