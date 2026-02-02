import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER, // or DataTypes.UUID if User uses UUID
    allowNull: false,
    references: {
      model: 'Users', // Make sure this matches your User table name
      key: 'id'
    },
    onDelete: 'CASCADE',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
    // NOTE: Removed unique: true here - moved to composite index below
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^\+?[1-9]\d{1,14}$/ // Optional: add DB-level validation
    }
  },
}, {
  timestamps: true,
  indexes: [
    // Composite unique constraint: each user can have the same email once
    {
      unique: true,
      fields: ['userId', 'email'],
      name: 'unique_email_per_user'
    },
    // Index for faster queries by user
    {
      fields: ['userId'],
      name: 'client_userId_idx'
    }
  ]
});

export default Client;