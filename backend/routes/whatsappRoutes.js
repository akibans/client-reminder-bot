import express from 'express';
import whatsappController from '../controllers/whatsappController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/status', whatsappController.getStatus);
router.post('/send', whatsappController.sendMessage);
router.post('/send-bulk', whatsappController.sendBulk);
router.post('/reconnect', whatsappController.reconnect);
router.post('/disconnect', whatsappController.disconnect);

export default router;
