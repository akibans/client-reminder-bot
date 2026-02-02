import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Reminder = sequelize.define('Reminder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER, // or DataTypes.UUID if User uses UUID
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE',
  },
  message: {
    type: DataTypes.STRING(1000), // Explicit limit
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 1000]
    }
  },
  sendVia: {
    type: DataTypes.ENUM('email', 'whatsapp'),
    defaultValue: 'email',
    allowNull: false
  },
  scheduleAt: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: new Date().toISOString() // DB level validation
    }
  },
  sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'sent', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  failureReason: {
    type: DataTypes.TEXT, // Changed to TEXT for longer error messages
    allowNull: true,
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 10 // Safety limit
    }
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    validate: {
      min: 0,
      max: 10
    }
  },
  isProcessing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  lastRetriedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true, // When the cron job actually processed it
  }
}, {
  timestamps: true,
  indexes: [
    // For fetching user's reminders
    {
      fields: ['userId', 'createdAt'],
      name: 'reminder_user_created_idx'
    },
    // For cron job: find pending reminders due for sending
    {
      fields: ['status', 'scheduleAt', 'sent'],
      name: 'reminder_status_schedule_idx'
    },
    // For user dashboard filtering
    {
      fields: ['userId', 'status'],
      name: 'reminder_user_status_idx'
    }
  ]
});

export default Reminder;