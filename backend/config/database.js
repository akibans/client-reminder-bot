import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'), // Creates file in backend root
  logging: false, // Set to console.log to see SQL queries
  dialectOptions: {
    // Enable foreign keys support in SQLite
    busyTimeout: 3000, // Wait up to 3 seconds if database is locked
  },
  // Enable foreign keys for SQLite by default
  define: {
    timestamps: true,
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite Database connected successfully.');
    
    // Enable foreign keys for SQLite (required for CASCADE deletes)
    // This MUST be done for every connection to SQLite
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    // Sync models without foreign key enforcement during schema changes
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    await sequelize.sync({ alter: true }); 
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('✅ Models synchronized. Foreign keys enabled.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export default sequelize;
