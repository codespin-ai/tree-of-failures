import BetterSqlite3 from 'better-sqlite3';
import path from 'node:path';

const db = new BetterSqlite3(
  process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'database.sqlite'),
  {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  }
);

// Optionally enable foreign keys enforcement
db.pragma('foreign_keys = ON');

export function getDb(): BetterSqlite3.Database {
  return db;
}