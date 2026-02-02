import express from 'express';
import * as whatsappController from '../controllers/whatsappController.js';

const router = express.Router();

router.get('/status', whatsappController.getStatus);
router.post('/send', whatsappController.sendTestMessage);
router.post('/verify', whatsappController.verifyNumber);

export default router;