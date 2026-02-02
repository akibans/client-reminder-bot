import whatsappService from '../services/whatsappBaileysService.js';

export const getStatus = async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendTestMessage = async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message required' 
      });
    }

    const result = await whatsappService.sendMessage(phoneNumber, message);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const exists = await whatsappService.verifyNumber(phoneNumber);
    res.json({ success: true, data: { exists, phoneNumber } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
