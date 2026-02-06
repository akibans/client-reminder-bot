import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

// Import Models
import ClientModel from './Client.js';
import MessageTemplateModel from './MessageTemplate.js';
import ReminderModel from './Reminder.js';
import ReminderClientModel from './ReminderClient.js';
import ReminderEventModel from './ReminderEvent.js';
import UserModel from './User.js';

const db = {};

// Initialize models
db.Client = ClientModel;
db.MessageTemplate = MessageTemplateModel;
db.Reminder = ReminderModel;
db.ReminderClient = ReminderClientModel;
db.ReminderEvent = ReminderEventModel;
db.User = UserModel;

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Define Associations

// User <-> Client
db.User.hasMany(db.Client, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Client.belongsTo(db.User, { foreignKey: 'userId' });

// User <-> Reminder
db.User.hasMany(db.Reminder, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Reminder.belongsTo(db.User, { foreignKey: 'userId' });

// User <-> MessageTemplate
db.User.hasMany(db.MessageTemplate, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.MessageTemplate.belongsTo(db.User, { foreignKey: 'userId' });

// Reminder <-> Client (Many-to-Many)
db.Reminder.belongsToMany(db.Client, { 
  through: db.ReminderClient, 
  foreignKey: 'reminderId', 
  otherKey: 'clientId',
  as: 'clients' 
});
db.Client.belongsToMany(db.Reminder, { 
  through: db.ReminderClient, 
  foreignKey: 'clientId', 
  otherKey: 'reminderId',
  as: 'reminders' 
});

// Reminder <-> ReminderEvent (One-to-Many)
db.Reminder.hasMany(db.ReminderEvent, { foreignKey: 'reminderId', onDelete: 'CASCADE' });
db.ReminderEvent.belongsTo(db.Reminder, { foreignKey: 'reminderId' });

export {
  ClientModel as Client,
  MessageTemplateModel as MessageTemplate,
  ReminderModel as Reminder,
  ReminderClientModel as ReminderClient,
  ReminderEventModel as ReminderEvent,
  UserModel as User
};

export default db;
