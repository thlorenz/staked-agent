import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import type {
  InsertTradeInput,
  Mode,
  TradeRecord,
} from "./types";

let database: Database.Database | null = null;

export function getTradesDatabase(dbPath: string): Database.Database {
  if (database) {
    return database;
  }
  const resolvedPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  database = new Database(resolvedPath);
  database.pragma("journal_mode = WAL");
  return database;
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

type TradeRow = {
  id: number;
  traded_at: string;
  type: Mode;
  amount_sol_atomic: number | bigint;
  price_usdc: number;
  signature: string;
  cluster: "devnet" | "mainnet";
  created_at: string;
};

function mapRow(row: TradeRow): TradeRecord {
  return {
    id: row.id,
    tradedAt: row.traded_at,
    type: row.type,
    amountSolAtomic: BigInt(row.amount_sol_atomic),
    priceUsdc: row.price_usdc,
    signature: row.signature,
    cluster: row.cluster,
    createdAt: row.created_at,
  };
}

export function recordTrade(
  db: Database.Database,
  input: InsertTradeInput,
): TradeRecord {
  db.prepare(
    `
    INSERT INTO trades (
      traded_at,
      type,
      amount_sol_atomic,
      price_usdc,
      signature,
      cluster
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(signature) DO NOTHING
    `,
  ).run(
    input.tradedAt,
    input.type,
    input.amountSolAtomic.toString(),
    input.priceUsdc,
    input.signature,
    input.cluster,
  );

  const row = db
    .prepare(
      `SELECT id, traded_at, type, amount_sol_atomic, price_usdc, signature, cluster, created_at
       FROM trades WHERE signature = ?`,
    )
    .get(input.signature) as TradeRow | undefined;

  if (!row) {
    throw new Error(
      `Unable to load trade record for signature ${input.signature}`,
    );
  }
  return mapRow(row);
}

export function getLastTrade(db: Database.Database): TradeRecord | null {
  const row = db
    .prepare(
      `SELECT id, traded_at, type, amount_sol_atomic, price_usdc, signature, cluster, created_at
       FROM trades ORDER BY id DESC LIMIT 1`,
    )
    .get() as TradeRow | undefined;
  return row ? mapRow(row) : null;
}

export function listAllTradesAsc(db: Database.Database): TradeRecord[] {
  const rows = db
    .prepare(
      `SELECT id, traded_at, type, amount_sol_atomic, price_usdc, signature, cluster, created_at
       FROM trades ORDER BY id ASC`,
    )
    .all() as TradeRow[];
  return rows.map(mapRow);
}
