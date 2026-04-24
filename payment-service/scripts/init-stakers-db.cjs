const fs = require("node:fs");
const path = require("node:path");

const Database = require("better-sqlite3");

const dbPath =
  process.env.SQLITE_DB_PATH?.trim() || "./src/db/staked-agent.sqlite";
const resolvedPath = path.resolve(dbPath);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");
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
db.close();
