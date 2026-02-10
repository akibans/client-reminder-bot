import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReminderEvent = sequelize.define('ReminderEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reminderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Reminders',
      key: 'id'
    },
    onDelete: 'CASCADE' // Delete events when reminder is deleted
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL' // Keep event history even if user deleted
  },
  eventType: {
    type: DataTypes.ENUM('CREATED', 'UPDATED', 'SENT', 'FAILED', 'RETRIED', 'CANCELLED'),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT, // TEXT not STRING (longer messages allowed)
    allowNull: false, // Controller always provides this
  },
  correlationId: {
    type: DataTypes.STRING(36), // UUID is 36 chars
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON, // Flexible field for extra data (retry count, error details, etc.)
    allowNull: true,
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['reminderId', 'createdAt'], // Fast lookup of event history
      name: 'event_reminder_time_idx'
    },
    {
      fields: ['correlationId'], // For tracing/debugging specific operations
      name: 'event_correlation_idx'
    },
    {
      fields: ['userId'], // For "what did this user do" audit queries
      name: 'event_user_idx'
    }
  ]
});

export default ReminderEvent;