import sequelize from '../config/database.js';
import Client from './Client.js';
import Reminder from './Reminder.js';
import User from './User.js';
import ReminderEvent from './ReminderEvent.js';

// =========================
// ASSOCIATIONS
// =========================

// User ownership
User.hasMany(Client, { foreignKey: 'userId', onDelete: 'CASCADE' });
Client.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Reminder, { foreignKey: 'userId', onDelete: 'CASCADE' });
Reminder.belongsTo(User, { foreignKey: 'userId' });

// Many-to-Many: Reminders <-> Clients
Client.belongsToMany(Reminder, { through: 'ReminderClient' });
Reminder.belongsToMany(Client, { through: 'ReminderClient' });

// Reminder Events (audit trail)
Reminder.hasMany(ReminderEvent, { foreignKey: 'reminderId', onDelete: 'CASCADE' });
ReminderEvent.belongsTo(Reminder, { foreignKey: 'reminderId' });

User.hasMany(ReminderEvent, { foreignKey: 'userId', onDelete: 'SET NULL' });
ReminderEvent.belongsTo(User, { foreignKey: 'userId' });

// =========================
// EXPORTS
// =========================
export {
  sequelize,
  Client,
  Reminder,
  User,
  ReminderEvent
};

// Default export for convenience
export default {
  sequelize,
  Client,
  Reminder,
  User,
  ReminderEvent
};