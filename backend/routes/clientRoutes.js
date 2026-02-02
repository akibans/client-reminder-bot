import express from "express";
import { 
  getClients, 
  getClient, 
  createClient, 
  updateClient, 
  deleteClient 
} from "../controllers/clientController.js";
import { validate, clientSchema, clientUpdateSchema } from "../middleware/validation.js";

const router = express.Router();

router.get("/", getClients);
router.get("/:id", getClient);           // 🆕 Get single client
router.post("/", validate(clientSchema), createClient);
router.put("/:id", validate(clientUpdateSchema), updateClient); // 🆕 Update client
router.delete("/:id", deleteClient);

export default router;