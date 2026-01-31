import Client from "../models/Client.js";
import Reminder from "../models/Reminder.js";

export const getStats = async (req, res, next) => {
    try {
        const totalClients = await Client.count();
        const activeReminders = await Reminder.count({ where: { sent: false } });
        const messagesSent = await Reminder.count({ where: { sent: true } });

        res.json({
            totalClients,
            activeReminders,
            messagesSent
        });
    } catch (error) {
        next(error);
    }
};
