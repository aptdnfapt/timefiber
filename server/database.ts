import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

function getDbPath(): string {
  // project root = two levels up when running from server/ or server/dist/
  const projectRoot = path.resolve(process.cwd(), '..');
  const dataDir = path.join(projectRoot, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'database.sqlite');
}

function migrateOldDb(targetPath: string): void {
  const possibleOldPaths = [
    path.join(process.cwd(), 'database.sqlite'),
    path.join(process.cwd(), 'dist', 'database.sqlite'),
  ];

  for (const oldPath of possibleOldPaths) {
    if (fs.existsSync(oldPath) && oldPath !== targetPath) {
      for (const ext of ['', '-shm', '-wal']) {
        const oldFile = oldPath + ext;
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, targetPath + ext);
        }
      }
      console.log(`Migrated database from ${oldPath} → ${targetPath}`);
      return;
    }
  }
}

export function initDatabase(): Database.Database {
  const dbPath = getDbPath();
  migrateOldDb(dbPath);
  db = new Database(dbPath);

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
