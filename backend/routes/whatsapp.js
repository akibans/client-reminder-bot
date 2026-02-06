import express from 'express';
import whatsappService from '../services/whatsappService.js';

const router = express.Router();

// GET /api/whatsapp/status - Get connection status and QR code
router.get('/status', (req, res) => {
  const status = whatsappService.getStatus();
  res.json({
    success: true,
    data: status
  });
});

// POST /api/whatsapp/reconnect - Force reconnect
router.post('/reconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    await whatsappService.initialize();
    res.json({
      success: true,
      message: 'Reconnection initiated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/whatsapp/verify - Verify if number exists
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number required'
      });
    }
    
    const result = await whatsappService.verifyNumber(phoneNumber);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;