import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("--- Checking Database Schema ---");

db.serialize(() => {
  db.each("SELECT name FROM sqlite_master WHERE type='table'", (err, table) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`\nTable: ${table.name}`);
    db.all(`PRAGMA table_info(${table.name})`, (err, cols) => {
      cols.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    });
    db.all(`PRAGMA foreign_key_list(${table.name})`, (err, fks) => {
      fks.forEach(fk => console.log(`  FK: ${fk.table} (${fk.from} -> ${fk.to})`));
    });
  });
});

setTimeout(() => db.close(), 2000);
