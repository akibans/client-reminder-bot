import Reminder from "../models/Reminder.js";
import Client from "../models/Client.js";
import Joi from "joi";

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
    
    // Create the reminder
    const reminder = await Reminder.create(reminderData);

    // Associate clients
    const clientInstances = await Client.findAll({
      where: { id: clients }
    });
    await reminder.setClients(clientInstances);

    res.status(201).json(reminder);
  } catch (error) {
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
    try {
        const { ids } = req.body; // Expecting array of UUIDs
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided" });
        }

        await Reminder.destroy({
            where: {
                id: ids
            }
        });

        res.json({ message: `${ids.length} reminders deleted` });
    } catch (error) {
        next(error);
    }
};

// Delete a reminder
export const deleteReminder = async (req, res, next) => {
    console.log(`Attempting to delete reminder: ${req.params.id}`);
    try {
        const { id } = req.params;
        const deleted = await Reminder.destroy({ where: { id } });
        
        if (!deleted) {
           console.warn(`Reminder ${id} not found for deletion`);
           return res.status(404).json({ message: "Reminder not found" });
        }
        console.log(`Reminder ${id} deleted successfully`);
        res.json({ message: "Reminder deleted" });
    } catch (error) {
        console.error(`Error deleting reminder ${req.params.id}:`, error);
        next(error);
    }
};
