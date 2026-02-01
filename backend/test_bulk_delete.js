import { Reminder, Client, sequelize } from './models/index.js';
import { Op } from 'sequelize';

async function testBulkDelete() {
    try {
        await sequelize.authenticate();
        console.log("Connected.");
        
        // Find reminders that have clients
        const reminders = await Reminder.findAll({
            limit: 2,
            include: Client
        });
        
        if (reminders.length === 0) {
            console.log("No reminders found to test bulk delete.");
            return;
        }
        
        const ids = reminders.map(r => r.id);
        console.log(`Attempting to bulk delete reminders: ${ids}`);
        
        const junctionTable = sequelize.models.ClientReminders;
        if (!junctionTable) {
            console.error("ClientReminders model not found");
            return;
        }

        console.log(`Clearing associations...`);
        await junctionTable.destroy({
            where: {
                ReminderId: { [Op.in]: ids }
            }
        });

        console.log(`Deleting records...`);
        const deletedCount = await Reminder.destroy({
            where: {
                id: { [Op.in]: ids }
            }
        });
        
        console.log(`Successfully deleted ${deletedCount} reminders.`);
        
    } catch (error) {
        console.error("--- BULK DELETION ERROR CAUGHT ---");
        console.error(error);
        console.error("-----------------------------");
    } finally {
        await sequelize.close();
    }
}

testBulkDelete();
