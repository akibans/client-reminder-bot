import sequelize from '../config/database.js';
import Client from './Client.js';
import Reminder from './Reminder.js';
import User from './User.js';

// Define Associations
Client.belongsToMany(Reminder, { through: 'ClientReminders', onDelete: 'CASCADE' });
Reminder.belongsToMany(Client, { through: 'ClientReminders', onDelete: 'CASCADE' });

export { Client, Reminder, User, sequelize };
