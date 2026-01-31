import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Reminder = sequelize.define('Reminder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sendVia: {
    type: DataTypes.ENUM('email', 'whatsapp'),
    defaultValue: 'email',
  },
  scheduleAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending',
  },
  failureReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Reminder;
