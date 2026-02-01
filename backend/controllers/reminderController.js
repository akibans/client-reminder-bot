import { Reminder, Client, sequelize } from "../models/index.js";
import Joi from "joi";
import { Op } from "sequelize";

const reminderSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required(),
  sendVia: Joi.string().valid('email', 'whatsapp').required(),
  scheduleAt: Joi.date().greater('now').required(),
  clients: Joi.array().items(Joi.string().uuid()).min(1).required()
});

// Get reminders (with pagination and tab filtering)
export const getReminders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sent = req.query.sent; // Optional filter
    const offset = (page - 1) * limit;

    const where = {};
    if (sent !== undefined) {
      where.sent = sent === 'true';
    }

    const { count, rows } = await Reminder.findAndCountAll({
      where,
      include: {
        model: Client,
        through: { attributes: [] }
      },
      order: [['scheduleAt', 'ASC']],
      limit,
      offset,
      distinct: true
    });

    res.json({
      reminders: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Create a new reminder
export const createReminder = async (req, res, next) => {
  try {
    const { error, value } = reminderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { clients, ...reminderData } = value;
    
    console.log('Attempting to create reminder with data:', reminderData);
    // Create the reminder
    const reminder = await Reminder.create(reminderData);

    // Associate clients
    const clientInstances = await Client.findAll({
      where: { id: clients }
    });
    await reminder.setClients(clientInstances);

    res.status(201).json(reminder);
  } catch (error) {
    console.error('Reminder Creation Error:', error);
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
    }
    next(error);
  }
};

// Update a reminder (Reschedule)
export const updateReminder = async (req, res, next) => {
    console.log(`Updating reminder ${req.params.id} with data:`, req.body);
    try {
        const { id } = req.params;
        const { scheduleAt } = req.body;
        
        const reminder = await Reminder.findByPk(id);
        if (!reminder) {
            console.warn(`Reminder ${id} not found`);
            return res.status(404).json({ message: "Reminder not found" });
        }

        if (scheduleAt) {
            const date = new Date(scheduleAt);
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date provided: ${scheduleAt}`);
                return res.status(400).json({ message: "Invalid date format" });
            }
            reminder.scheduleAt = date;
        }

        await reminder.save();
        console.log(`Reminder ${id} updated successfully`);
        res.json(reminder);
    } catch (error) {
        console.error(`Error updating reminder ${req.params.id}:`, error);
        next(error);
    }
};

// Bulk Delete Reminders
export const deleteRemindersBulk = async (req, res, next) => {
    console.log(`Bulk deleting reminders: ${JSON.stringify(req.body.ids)}`);
    try {
        const { ids } = req.body; // Expecting array of UUIDs
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            console.warn("Bulk delete called with no IDs or invalid format");
            return res.status(400).json({ message: "No IDs provided" });
        }

        const junctionTable = sequelize.models.ClientReminders;
        if (!junctionTable) {
            console.error("ClientReminders model not found in sequelize.models");
            throw new Error("Internal configuration error: Junction table not found");
        }

        // First, clear the associations in the junction table
        console.log(`Clearing associations for reminders: ${ids}`);
        await junctionTable.destroy({
            where: {
                ReminderId: { [Op.in]: ids }
            }
        });

        // Then delete the reminders themselves
        console.log(`Deleting reminder records: ${ids}`);
        const deletedCount = await Reminder.destroy({
            where: {
                id: { [Op.in]: ids }
            }
        });

        console.log(`Successfully deleted ${deletedCount} reminders`);
        res.json({ message: `${deletedCount} reminders deleted` });
    } catch (error) {
        console.error("Bulk Delete Error:", error);
        next(error);
    }
};

// Delete a reminder
export const deleteReminder = async (req, res, next) => {
    console.log(`Attempting to delete reminder: ${req.params.id}`);
    try {
        const { id } = req.params;
        const reminder = await Reminder.findByPk(id);
        if (!reminder) {
           console.warn(`Reminder ${id} not found for deletion`);
           return res.status(404).json({ message: "Reminder not found" });
        }

        // Clear associations first
        await reminder.setClients([]);
        
        // Then destroy
        await reminder.destroy();

        console.log(`Reminder ${id} deleted successfully`);
        res.json({ message: "Reminder deleted" });
    } catch (error) {
        console.error(`Error deleting reminder ${req.params.id}:`, error);
        next(error);
    }
};
// Manual retry for a failed reminder
export const retryReminder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reminder = await Reminder.findByPk(id, { include: Client });
        
        if (!reminder) {
            return res.status(404).json({ message: "Reminder not found" });
        }

        // Reset status to pending so the scheduler picks it up, or we can trigger it now
        reminder.status = 'pending';
        reminder.sent = false;
        reminder.retryCount = 0; // Reset retry count for manual retry
        reminder.failureReason = null;
        await reminder.save();

        res.json({ message: "Reminder queued for retry", reminder });
    } catch (error) {
        next(error);
    }
};
