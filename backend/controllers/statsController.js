import db from "../models/index.js";
const { Client, Reminder } = db;

export const getStats = async (req, res, next) => {
  try {
    // Scope all counts to the current user only
    const totalClients = await Client.count({ where: { userId: req.user.id } });
    const activeReminders = await Reminder.count({ where: { sent: false, userId: req.user.id } });
    const messagesSent = await Reminder.count({ where: { sent: true, userId: req.user.id } });

    res.json({
      totalClients,
      activeReminders,
      messagesSent
    });
  } catch (error) {
    next(error);
  }
};