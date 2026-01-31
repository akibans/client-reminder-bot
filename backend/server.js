import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import "./models/index.js"; // Initialize associations
import "./jobs/reminderScheduler.js"; // Start the scheduler job

// Routes
import clientRoutes from "./routes/clientRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

app.use("/api/clients", clientRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/stats", statsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
