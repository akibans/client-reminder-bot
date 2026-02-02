import { Reminder, Client, ReminderEvent, sequelize } from "../models/index.js";
import crypto from "crypto";
import Joi from "joi";
import { Op } from "sequelize";

/* =========================
   Validation Schema
========================= */
const reminderSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required(),
  sendVia: Joi.string().valid("email", "whatsapp").required(),
  scheduleAt: Joi.date().greater("now").required(),
  clients: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

/* =========================
   GET REMINDERS (User-scoped)
========================= */
export const getReminders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const sent = req.query.sent;
    const search = req.query.search?.trim();
    const offset = (page - 1) * limit;

    // Build where clause - ALWAYS filter by user
    const where = { userId: req.user.id };
    if (sent !== undefined) where.sent = sent === "true";
    
    // Add search filter for message content
    if (search) {
      where.message = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Reminder.findAndCountAll({
      where,
      include: { 
        model: Client, 
        where: { userId: req.user.id }, // Extra safety: only user's clients
        through: { attributes: [] } 
      },
      order: [["scheduleAt", "ASC"]],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      reminders: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   CREATE REMINDER
========================= */
export const createReminder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = reminderSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }

    const { clients, ...reminderData } = value;
    const correlationId = crypto.randomUUID();

    // Verify clients belong to this user
    const clientInstances = await Client.findAll({
      where: { 
        id: clients,
        userId: req.user.id // Security: only user's clients
      },
      transaction: t
    });

    if (clientInstances.length !== clients.length) {
      await t.rollback();
      return res.status(400).json({ message: "One or more clients not found or not authorized" });
    }

    const reminder = await Reminder.create({
      ...reminderData,
      userId: req.user.id, // Track ownership
      maxRetries: 3,
      status: 'pending',
      sent: false,
      retryCount: 0,
      isProcessing: false
    }, { transaction: t });

    await reminder.setClients(clientInstances, { transaction: t });

    await ReminderEvent.create({
      reminderId: reminder.id,
      eventType: "CREATED",
      message: `Reminder created by user ${req.user.id} for ${clients.length} clients`,
      correlationId,
      userId: req.user.id // Track who did it
    }, { transaction: t });

    await t.commit();
    
    // Return with clients populated
    const result = await Reminder.findByPk(reminder.id, {
      include: { model: Client, through: { attributes: [] } }
    });
    res.status(201).json(result);
  } catch (error) {
    await t.rollback();
    console.error(`[${req.correlationId}] Reminder Creation Error:`, error);
    next(error);
  }
};

/* =========================
   UPDATE REMINDER
========================= */
export const updateReminder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { scheduleAt } = req.body;
    
    if (!scheduleAt) {
      await t.rollback();
      return res.status(400).json({ message: "Only scheduleAt can be updated" });
    }

    // Find reminder belonging to this user
    const reminder = await Reminder.findOne({
      where: { id, userId: req.user.id },
      transaction: t
    });
    
    if (!reminder) {
      await t.rollback();
      return res.status(404).json({ message: "Reminder not found" });
    }

    if (reminder.sent) {
      await t.rollback();
      return res.status(400).json({ message: "Cannot modify sent reminders" });
    }

    if (reminder.isProcessing) {
      await t.rollback();
      return res.status(409).json({ message: "Cannot modify while processing" });
    }

    const date = new Date(scheduleAt);
    if (isNaN(date.getTime()) || date <= new Date()) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid date or must be in the future" });
    }

    // Only update if actually changed
    if (reminder.scheduleAt.getTime() !== date.getTime()) {
      reminder.scheduleAt = date;
      await reminder.save({ transaction: t });
      
      await ReminderEvent.create({
        reminderId: id,
        eventType: "UPDATED",
        message: `Schedule updated to ${date.toISOString()}`,
        userId: req.user.id
      }, { transaction: t });
    }

    await t.commit();
    res.json(reminder);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/* =========================
   DELETE SINGLE REMINDER (with audit)
========================= */
export const deleteReminder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    
    // Find reminder belonging to user
    const reminder = await Reminder.findOne({
      where: { id, userId: req.user.id },
      transaction: t
    });
    
    if (!reminder) {
      await t.rollback();
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Prevent deleting processing reminders
    if (reminder.isProcessing) {
      await t.rollback();
      return res.status(409).json({ message: "Cannot delete while processing" });
    }

    // Remove client associations first (junction table)
    await reminder.setClients([], { transaction: t });
    
    // Delete associated ReminderEvents
    await ReminderEvent.destroy({
      where: { reminderId: id },
      transaction: t
    });

    await reminder.destroy({ transaction: t });
    await t.commit();
    
    res.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Delete reminder failed:", error);
    next(error);
  }
};

/* =========================
   BULK DELETE REMINDERS
========================= */
export const deleteRemindersBulk = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "No IDs provided" });
    }

    if (ids.length > 100) {
      await t.rollback();
      return res.status(400).json({ message: "Cannot delete more than 100 reminders at once" });
    }

    // Find reminders to delete
    const remindersToDelete = await Reminder.findAll({
      where: { 
        id: { [Op.in]: ids },
        userId: req.user.id,
        isProcessing: false
      },
      transaction: t
    });

    // Remove client associations and ReminderEvents for each reminder
    for (const reminder of remindersToDelete) {
      await reminder.setClients([], { transaction: t });
      await ReminderEvent.destroy({
        where: { reminderId: reminder.id },
        transaction: t
      });
    }

    // Now delete the reminders
    const deletedCount = await Reminder.destroy({
      where: { 
        id: { [Op.in]: ids },
        userId: req.user.id,
        isProcessing: false
      },
      transaction: t
    });

    const skippedCount = ids.length - deletedCount;

    await t.commit();
    res.json({ 
      message: `${deletedCount} reminders deleted${skippedCount > 0 ? ` (${skippedCount} skipped - not found or processing)` : ''}` 
    });
  } catch (error) {
    await t.rollback();
    console.error("Bulk delete failed:", error);
    next(error);
  }
};

/* =========================
   RETRY REMINDER (Fixed Logic)
========================= */
export const retryReminder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const correlationId = crypto.randomUUID();

    // Lock row - only user's reminder
    const reminder = await Reminder.findOne({
      where: { id, userId: req.user.id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    
    if (!reminder) {
      await t.rollback();
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Can't retry if not failed/sent
    if (!reminder.sent && reminder.retryCount === 0 && !reminder.failureReason) {
      await t.rollback();
      return res.status(400).json({ message: "Reminder is still pending, no need to retry" });
    }

    // Can't retry if currently processing
    if (reminder.isProcessing) {
      await t.rollback();
      return res.status(409).json({ message: "Reminder is currently processing" });
    }

    // Reset for retry
    await reminder.update({
      status: "pending",
      sent: false,
      retryCount: 0,
      failureReason: null,
      isProcessing: false,
      lastRetriedAt: new Date()
    }, { transaction: t });

    await ReminderEvent.create({
      reminderId: id,
      eventType: "RETRIED",
      message: "Manual retry triggered",
      correlationId,
      userId: req.user.id
    }, { transaction: t });

    await t.commit();
    res.json({ message: "Reminder queued for retry", reminder });
  } catch (error) {
    await t.rollback();
    console.error("Retry reminder failed:", error);
    next(error);
  }
};