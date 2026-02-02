import express from 'express';
import { register, login } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import { User } from '../models/index.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// 🆕 Optional: Get current user (useful for "remember me" / auto-login)
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

export default router;