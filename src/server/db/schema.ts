import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export interface DatabaseInstance extends Database.Database {
  // Type-safe interface for our database
}

/**
 * Initialize SQLite database with schema
 * @param dbPath - Path to database file (default: data/monitor.db)
 * @returns Database instance
 */
export function initDb(dbPath: string = 'data/monitor.db'): DatabaseInstance {
  // Ensure the data directory exists
  const dir = dirname(dbPath);
  mkdirSync(dir, { recursive: true });

  // Open database connection
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS mints (
      mint_address     TEXT PRIMARY KEY,
      tx_signature     TEXT NOT NULL,
      minted_at        INTEGER NOT NULL,
      discovered_at    INTEGER NOT NULL,
      token_program    TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending',
      token_name       TEXT,
      token_symbol     TEXT,
      price_usd        REAL,
      liquidity_usd    REAL,
      market_cap_usd   REAL,
      fdv_usd          REAL,
      dex_url          TEXT,
      pair_address     TEXT,
      enriched_at      INTEGER,
      retry_count      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS fetch_log (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at       INTEGER NOT NULL,
      completed_at     INTEGER,
      window_start     INTEGER NOT NULL,
      window_end       INTEGER NOT NULL,
      mints_discovered INTEGER DEFAULT 0,
      mints_qualified  INTEGER DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'running'
    );

    CREATE INDEX IF NOT EXISTS idx_mints_status ON mints(status);
    CREATE INDEX IF NOT EXISTS idx_mints_minted_at ON mints(minted_at);
    CREATE INDEX IF NOT EXISTS idx_mints_enriched_at ON mints(enriched_at);
  `);

  return db as DatabaseInstance;
}
