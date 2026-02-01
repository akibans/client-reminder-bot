import express from "express";
import { getReminders, createReminder, deleteReminder, updateReminder, deleteRemindersBulk, retryReminder } from "../controllers/reminderController.js";
import { validate, reminderSchema } from "../middleware/validation.js";

const router = express.Router();

router.get("/", getReminders);
router.post("/", validate(reminderSchema), createReminder);
router.put("/:id", updateReminder); // Add validation if needed, for now manual check in controller is fine or reuse partial schema
router.post("/bulk-delete", deleteRemindersBulk);
router.delete("/:id", deleteReminder);
router.post("/:id/retry", retryReminder);

export default router;
