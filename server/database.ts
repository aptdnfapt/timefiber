import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database<sqlite3.Database>;

export async function initDatabase(): Promise<Database<sqlite3.Database>> {
  db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
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

export function getDb(): Database<sqlite3.Database> {
  return db;
}
