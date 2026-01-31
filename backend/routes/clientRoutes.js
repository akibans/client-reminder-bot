import express from "express";
import { getClients, createClient, deleteClient } from "../controllers/clientController.js";
import { validate, clientSchema } from "../middleware/validation.js";

const router = express.Router();

router.get("/", getClients);
router.post("/", validate(clientSchema), createClient);
router.delete("/:id", deleteClient);

export default router;
