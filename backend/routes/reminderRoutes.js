import express from "express";
import { getReminders, createReminder, deleteReminder, updateReminder, deleteRemindersBulk } from "../controllers/reminderController.js";
import { validate, reminderSchema } from "../middleware/validation.js";

const router = express.Router();

router.get("/", getReminders);
router.post("/", validate(reminderSchema), createReminder);
router.put("/:id", updateReminder); // Add validation if needed, for now manual check in controller is fine or reuse partial schema
router.post("/bulk-delete", deleteRemindersBulk);
router.delete("/:id", deleteReminder);

export default router;
