import jwt from 'jsonwebtoken';
import db from '../models/index.js';
const { User } = db;

// Validate JWT_SECRET at startup
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Not authorized, no token',
        correlationId: req.correlationId 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.log(`[${req.correlationId}] JWT Error: ${jwtError.name} - ${jwtError.message}`);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired',
          expiredAt: jwtError.expiredAt,
          correlationId: req.correlationId 
        });
      }
      
      return res.status(401).json({ 
        message: 'Not authorized, invalid token',
        correlationId: req.correlationId 
      });
    }

    // Get user from DB
    let user;
    try {
      user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
    } catch (dbError) {
      console.error(`[${req.correlationId}] Database error in auth middleware:`, dbError);
      return res.status(500).json({ 
        message: 'Authentication service unavailable',
        correlationId: req.correlationId 
      });
    }
    
    if (!user) {
      console.log(`[${req.correlationId}] User not found for ID: ${decoded.id}`);
      return res.status(401).json({ 
        message: 'Not authorized, user not found',
        correlationId: req.correlationId 
      });
    }

    req.user = user;
    next();
    
  } catch (error) {
    console.error(`[${req.correlationId}] Unexpected auth error:`, error);
    res.status(500).json({ 
      message: 'Authentication error',
      correlationId: req.correlationId 
    });
  }
};

export default protect;