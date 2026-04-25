import type Database from "better-sqlite3";

export function ensureStakePaymentsSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stake_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signature TEXT NOT NULL UNIQUE,
      staker_pubkey TEXT NOT NULL,
      agent_pubkey TEXT NOT NULL,
      amount INTEGER NOT NULL,
      slot INTEGER NOT NULL,
      block_time INTEGER,
      staked_at TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_stake_payments_staker_pubkey
      ON stake_payments (staker_pubkey);

    CREATE INDEX IF NOT EXISTS idx_stake_payments_block_time
      ON stake_payments (block_time);
  `);
}

export function ensureTradesSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      traded_at TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('buy','sell')),
      amount_sol_atomic INTEGER NOT NULL,
      price_usdc REAL NOT NULL,
      signature TEXT NOT NULL UNIQUE,
      cluster TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_trades_traded_at
      ON trades (traded_at);
  `);
}
