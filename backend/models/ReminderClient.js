import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReminderClient = sequelize.define('ReminderClient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ReminderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Reminders',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  ClientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Clients',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['ReminderId', 'ClientId']
    }
  ]
});

export default ReminderClient;
