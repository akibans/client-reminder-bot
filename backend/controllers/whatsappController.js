import whatsappService from '../services/whatsappService.js';
import Joi from 'joi';

const messageSchema = Joi.object({
  phone: Joi.string().required(),
  message: Joi.string().min(1).max(1000).required()
});

const bulkMessageSchema = Joi.object({
  recipients: Joi.array().items(
    Joi.object({
      phone: Joi.string().required(),
      name: Joi.string()
    })
  ).min(1).max(100).required(),
  message: Joi.string().min(1).required(),
  useTemplate: Joi.boolean().default(false)
});

class WhatsAppController {
  // GET /api/whatsapp/status
  async getStatus(req, res) {
    try {
      const status = whatsappService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/whatsapp/send
  async sendMessage(req, res) {
    try {
      const { error, value } = messageSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      const result = await whatsappService.sendMessage(
        value.phone, 
        value.message
      );
      
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // POST /api/whatsapp/send-bulk
  async sendBulk(req, res) {
    try {
      const { error, value } = bulkMessageSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      // Setup progress tracking via Socket.io
      const io = req.app.get('io');
      
      const results = await whatsappService.sendBulkMessages(
        value.recipients,
        value.message,
        (progress) => {
          io && io.emit('whatsapp:bulk-progress', progress);
        }
      );

      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        data: {
          total: results.length,
          success: successCount,
          failed: results.length - successCount,
          details: results
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // POST /api/whatsapp/reconnect
  async reconnect(req, res) {
    try {
      await whatsappService.reconnect();
      res.json({ success: true, message: 'Reconnecting...' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/whatsapp/disconnect
  async disconnect(req, res) {
    try {
      await whatsappService.disconnect();
      res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new WhatsAppController();
