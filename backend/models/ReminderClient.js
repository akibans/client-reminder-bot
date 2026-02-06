import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReminderClient = sequelize.define('ReminderClient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reminderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Reminders',
      key: 'id'
    }
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Clients',
      key: 'id'
    }
  }
}, {
  tableName: 'ReminderClients',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['reminderId', 'clientId'],
      name: 'idx_reminder_client_unique'
    }
  ]
});

export default ReminderClient;
