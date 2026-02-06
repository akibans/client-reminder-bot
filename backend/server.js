console.log("Server starting...");
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import dotenv from "dotenv";
import crypto from "crypto";
import { connectDB } from "./config/database.js";
import "./models/index.js";
import protect from "./middleware/authMiddleware.js";

// Routes
import clientRoutes from "./routes/clientRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import whatsappService from "./services/whatsappService.js";
import whatsappHandler from "./socket/handlers/whatsappHandler.js";
import { Server } from "socket.io";
import http from "http";

dotenv.config();
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Initialize WhatsApp service with Socket.io
whatsappService.setSocketIO(io);
whatsappService.initialize();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Register handlers
  whatsappHandler(io, socket);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Correlation ID for tracing (set early)
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
});

// Rate limiting (skip auth routes - they have their own)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 100 to allow frequent polling
  skip: (req) => req.path.startsWith('/api/auth'),
  message: { message: "Too many requests, please try again later." }
});
app.use('/api', apiLimiter);

// Stricter limit for auth routes only
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Increased from 10 to allow easier testing
  message: { message: "Too many login attempts, please try again later." }
});
app.use('/api/auth/login', authLimiter);

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.correlationId}] ${new Date().toISOString()} - ${req.method} ${req.url} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// Health check (for Render/Railway/Docker)
app.get('/health', async (req, res) => {
  try {
    const { sequelize } = await import('./models/index.js');
    await sequelize.authenticate();
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Database connection failed',
      correlationId: req.correlationId
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", protect, clientRoutes);
app.use("/api/reminders", protect, reminderRoutes);
app.use("/api/stats", protect, statsRoutes);
app.use("/api/whatsapp", protect, whatsappRoutes);
app.use("/api/templates", protect, templateRoutes);

// 404 handler (must be before error handler)
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    correlationId: req.correlationId
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[${req.correlationId}] Error: ${err.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: err.errors.map(e => e.message),
      correlationId: req.correlationId
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: 'Duplicate entry',
      field: err.errors?.[0]?.path,
      correlationId: req.correlationId
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      message: 'Referenced record not found or still in use',
      correlationId: req.correlationId
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      message: 'Invalid token',
      correlationId: req.correlationId 
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      message: 'Token expired',
      correlationId: req.correlationId 
    });
  }

  // Default
  res.status(err.status || err.statusCode || 500).json({ 
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      name: err.name 
    }),
    correlationId: req.correlationId
  });
});

// 🔴 START SERVER ONLY AFTER DB CONNECTS
const startServer = async () => {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    // Import and start scheduler AFTER DB is ready
    await import('./jobs/reminderScheduler.js');
    console.log('Reminder scheduler started');
    
    const PORT = process.env.PORT || 5000;
    const serverInstance = server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`WhatsApp initializing...`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`${signal} received. Starting graceful shutdown...`);
      serverInstance.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
      
      // Force exit after 10s if hanging
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

console.log("Calling startServer()...");
startServer();
