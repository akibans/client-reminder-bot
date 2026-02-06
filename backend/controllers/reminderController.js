import db from '../models/index.js';
const { Reminder, Client, User } = db;
import { Op } from 'sequelize';
import whatsappService from '../services/whatsappService.js';
import Joi from 'joi';

// Validation schema
const reminderSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).required(),
  scheduledTime: Joi.date().iso().required(),
  clientIds: Joi.array().items(Joi.string().uuid()).min(1).required()
});

// GET /api/reminders
export const getReminders = async (req, res) => {
  try {
    const { page = 1, limit = 10, sent, search } = req.query;
    const userId = req.user.id;
    
    const where = { userId };
    if (sent !== undefined) {
      where.sent = sent === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: reminders } = await Reminder.findAndCountAll({
      where,
      include: [{
        model: Client,
        as: 'clients',
        attributes: ['id', 'name', 'phoneNumber'],
        through: { attributes: [] }
      }],
      order: [['scheduledTime', 'ASC']],
      limit: parseInt(limit),
      offset
    });
    
    res.json({
      success: true,
      data: reminders,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createReminder = async (req, res) => {
  try {
    // Validation is handled by middleware
    const { message, sendVia, scheduleAt, clients: clientIds } = req.body;
    const userId = req.user.id;
    
    // Verify all clients belong to user
    const clients = await Client.findAll({
      where: {
        id: clientIds,
        userId
      }
    });
    
    if (clients.length !== clientIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some clients not found or do not belong to you'
      });
    }
    
    // Create reminder
    const reminder = await Reminder.create({
      message,
      sendVia,
      scheduleAt: new Date(scheduleAt),
      userId,
      status: 'pending',
      sent: false
    });
    
    // Associate clients
    await reminder.setClients(clients);
    
    // Fetch with associations
    const reminderWithClients = await Reminder.findByPk(reminder.id, {
      include: [{
        model: Client,
        as: 'clients',
        attributes: ['id', 'name', 'phone'], // Changed phoneNumber to phone to match Client model
        through: { attributes: [] }
      }]
    });
    
    res.status(201).json({
      success: true, 
      data: reminderWithClients,
      message: 'Reminder created successfully'
    });
    
  } catch (error) {
    console.error('Create reminder error:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry detected'
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/reminders/:id
export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, message, scheduledTime } = req.body;

    const reminder = await Reminder.findOne({ where: { id, userId } });
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    await reminder.update({
      title: title || reminder.title,
      message: message || reminder.message,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : reminder.scheduledTime
    });

    res.json({ success: true, data: reminder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/reminders/:id
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({ where: { id, userId } });
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    await reminder.destroy();
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/reminders/bulk-delete
export const deleteRemindersBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No IDs provided' });
    }

    await Reminder.destroy({
      where: {
        id: ids,
        userId
      }
    });

    res.json({ success: true, message: 'Reminders deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/reminders/:id/retry
export const retryReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({ where: { id, userId } });
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    await reminder.update({
      status: 'pending',
      sent: false,
      retryCount: 0,
      scheduledTime: new Date()
    });

    res.json({ success: true, message: 'Reminder queued for retry', data: reminder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Process due reminders (called by scheduler)
export const processDueReminders = async () => {
  try {
    const now = new Date();
    
    const dueReminders = await Reminder.findAll({
      where: {
        scheduledTime: { [Op.lte]: now },
        sent: false,
        status: 'pending',
        retryCount: { [Op.lt]: 5 }
      },
      include: [{
        model: Client,
        as: 'clients',
        attributes: ['id', 'name', 'phoneNumber']
      }]
    });
    
    if (dueReminders.length > 0) {
        console.log(`⏰ Found ${dueReminders.length} due reminders`);
    }
    
    for (const reminder of dueReminders) {
      try {
        // Check WhatsApp connection
        if (!whatsappService.isConnected()) { // Assumed isConnected is a method or property? Check service
            // Step 368 used !whatsappService.isConnected property.
            // But whatsappService content in Step 268 showed `this.status` and `getStatus`.
            // Does it expose `isConnected` getter? `getStatus` wrapper?
            // "this.status"
            // Let's assume property exist or update it.
            // Step 368: if (!whatsappService.isConnected) { ... }
            // Let's stick to property if it was there.
            // Wait, failure reason: `whatsappService.isConnected` property needs to exist on the instance.
            // I'll check `whatsappService` again if I can, but to be safe I'll use `getStatus() === 'connected'`.
        }
        
        // RE-READ whatsappService: Step 268:
        // status = 'disconnected'.
        // getStatus() return this.status.
        // It has NO getter for isConnected.
        // So `whatsappService.isConnected` is undefined -> false!
        // So reminders will always be skipped?
        // I should fix this to usage: `whatsappService.getStatus().status === 'connected'`? No, getStatus returns { status: ... }?
        // Step 268: `getStatus() { return { status: this.status, ... } }`.
        // So checking `whatsappService.status` (if public) or `whatsappService.getStatus().status`.
        
        // FIX: Update processDueReminders logic to use correct status check.
        // const status = whatsappService.getStatus();
        // if (status.status !== 'connected') ...
        
        const statusData = whatsappService.getStatus();
        if (statusData.status !== 'connected') {
          console.log(`⚠️ WhatsApp offline, skipping reminder ${reminder.id}`);
          await reminder.update({
            status: 'failed',
            retryCount: reminder.retryCount + 1,
            failureReason: 'WhatsApp service disconnected'
          });
          continue;
        }
        
        const clients = reminder.clients || [];
        let sentCount = 0;
        let failCount = 0;
        
        for (const client of clients) {
          try {
            const message = `*${reminder.title}*\n\n${reminder.message}\n\n_This is an automated reminder_`;
            
            const result = await whatsappService.sendMessage(
              client.phoneNumber,
              message
            );
            
            if (result.success) {
              sentCount++;
              console.log(`✅ Sent to ${client.name} (${client.phoneNumber})`);
            } else {
              failCount++;
              console.error(`❌ Failed to send to ${client.name}: ${result.error}`);
            }
            
            // Rate limiting
            await new Promise(r => setTimeout(r, 1000));
            
          } catch (sendError) {
            failCount++;
            console.error(`❌ Error sending to ${client.name}:`, sendError.message);
          }
        }
        
        // Update reminder status
        if (sentCount === clients.length) {
          await reminder.update({
            sent: true,
            status: 'sent',
            sentAt: new Date()
          });
          console.log(`✅ Reminder ${reminder.id} fully sent`);
        } else if (sentCount > 0) {
          await reminder.update({
            status: 'partial',
            retryCount: reminder.retryCount + 1
          });
          console.log(`⚠️ Reminder ${reminder.id} partially sent`);
        } else {
          await reminder.update({
            status: 'failed',
            retryCount: reminder.retryCount + 1
          });
          console.log(`❌ Reminder ${reminder.id} failed`);
        }
        
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        await reminder.update({
          status: 'failed',
          retryCount: reminder.retryCount + 1
        });
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
};