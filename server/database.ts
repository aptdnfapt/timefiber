import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function initDatabase(): Database.Database {
  db = new Database(path.join(__dirname, 'database.sqlite'));

  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number TEXT,
      month_number TEXT,
      date TEXT,
      day_name TEXT,
      season TEXT,
      time_string TEXT,
      detail TEXT,
      place TEXT,
      activity TEXT,
      row_color TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export function getDb(): Database.Database {
  return db;
}
