import express from "express";
import { 
  getReminders, 
  createReminder, 
  deleteReminder, 
  updateReminder, 
  deleteRemindersBulk, 
  retryReminder 
} from "../controllers/reminderController.js";
import { validate, reminderSchema } from "../middleware/validation.js";

const router = express.Router();

// Safe request logger (handles undefined user)
router.use((req, res, next) => {
  const userId = req.user?.id || 'unauthenticated';
  console.log(`[Reminders] ${req.method} ${req.originalUrl} user=${userId} time=${new Date().toISOString()}`);
  next();
});

router.get("/", getReminders);
router.post("/", validate(reminderSchema), createReminder);
router.put("/:id", updateReminder);
router.post("/bulk-delete", deleteRemindersBulk);
router.delete("/:id", deleteReminder);
router.post("/:id/retry", retryReminder);

export default router;