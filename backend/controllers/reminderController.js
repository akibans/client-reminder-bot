import db from '../models/index.js';
const { Reminder, Client } = db;
import { Op } from 'sequelize';
import whatsappService from '../services/whatsappService.js';

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
      where.message = { [Op.like]: `%${search}%` };
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: reminders } = await Reminder.findAndCountAll({
      where,
      include: [{
        model: Client,
        as: 'clients',
        attributes: ['id', 'name', 'email', 'phone'],
        through: { attributes: [] }
      }],
      order: [['scheduleAt', 'ASC']],
      limit: parseInt(limit),
      offset
    });
    
    // Response format matches what ReminderList.jsx expects
    res.json({
      reminders,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const createReminder = async (req, res) => {
  try {
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
        message: 'Some clients not found or do not belong to you'
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
        attributes: ['id', 'name', 'email', 'phone'],
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
        message: 'Duplicate entry detected'
      });
    }
    
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/reminders/:id
export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message, scheduleAt } = req.body;

    const reminder = await Reminder.findOne({ where: { id, userId } });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Only allow updating unsent reminders
    if (reminder.sent) {
      return res.status(400).json({ message: 'Cannot update a sent reminder' });
    }

    const updateData = {};
    if (message) updateData.message = message;
    if (scheduleAt) updateData.scheduleAt = new Date(scheduleAt);

    await reminder.update(updateData);

    res.json({ success: true, data: reminder });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/reminders/:id
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({ where: { id, userId } });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    await reminder.destroy();
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/reminders/bulk-delete
export const deleteRemindersBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided' });
    }

    const deleted = await Reminder.destroy({
      where: {
        id: ids,
        userId
      }
    });

    res.json({ success: true, message: `${deleted} reminder(s) deleted` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/reminders/:id/retry
export const retryReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({ where: { id, userId } });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    await reminder.update({
      status: 'pending',
      sent: false,
      retryCount: 0,
      scheduleAt: new Date(),
      failureReason: null,
      isProcessing: false
    });

    res.json({ success: true, message: 'Reminder queued for retry', data: reminder });
  } catch (error) {
    console.error('Retry reminder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Process due reminders (called by scheduler)
export const processDueReminders = async () => {
  try {
    const now = new Date();
    
    const dueReminders = await Reminder.findAll({
      where: {
        scheduleAt: { [Op.lte]: now },
        sent: false,
        status: 'pending',
        retryCount: { [Op.lt]: 5 }
      },
      include: [{
        model: Client,
        as: 'clients',
        attributes: ['id', 'name', 'email', 'phone'],
        through: { attributes: [] }
      }]
    });
    
    if (dueReminders.length > 0) {
      console.log(`⏰ Found ${dueReminders.length} due reminders`);
    }
    
    for (const reminder of dueReminders) {
      try {
        const statusData = whatsappService.getStatus();
        if (reminder.sendVia === 'whatsapp' && statusData.status !== 'connected') {
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
            const messageText = `${reminder.message}\n\n_This is an automated reminder_`;
            
            if (reminder.sendVia === 'whatsapp' && client.phone) {
              const result = await whatsappService.sendMessage(
                client.phone,
                messageText
              );
              
              if (result.success) {
                sentCount++;
                console.log(`✅ Sent to ${client.name} (${client.phone})`);
              } else {
                failCount++;
                console.error(`❌ Failed to send to ${client.name}: ${result.error}`);
              }
            } else if (reminder.sendVia === 'email' && client.email) {
              // Email sending handled by scheduler
              sentCount++;
              console.log(`✅ Email queued for ${client.name} (${client.email})`);
            } else {
              failCount++;
              console.warn(`⚠️ No contact info for ${client.name}`);
            }
            
            // Rate limiting between messages
            await new Promise(r => setTimeout(r, 1000));
            
          } catch (sendError) {
            failCount++;
            console.error(`❌ Error sending to ${client.name}:`, sendError.message);
          }
        }
        
        // Update reminder status
        if (sentCount === clients.length && clients.length > 0) {
          await reminder.update({
            sent: true,
            status: 'sent',
            sentAt: new Date()
          });
          console.log(`✅ Reminder ${reminder.id} fully sent`);
        } else if (sentCount > 0) {
          await reminder.update({
            sent: true,
            status: 'sent',
            sentAt: new Date(),
            failureReason: `Partial: ${sentCount}/${clients.length} delivered`
          });
          console.log(`⚠️ Reminder ${reminder.id} partially sent`);
        } else {
          await reminder.update({
            status: 'failed',
            retryCount: reminder.retryCount + 1,
            failureReason: 'All recipients failed'
          });
          console.log(`❌ Reminder ${reminder.id} failed`);
        }
        
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        await reminder.update({
          status: 'failed',
          retryCount: reminder.retryCount + 1,
          failureReason: error.message
        });
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
};