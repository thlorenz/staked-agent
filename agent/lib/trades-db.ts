import Database from "better-sqlite3";
import { ensureTradesSchema } from "../../payment-service/src/db/schema";

export type TradeRecord = {
  id: number;
  traded_at: string;
  type: "buy" | "sell";
  amount_sol_atomic: number;
  price_usdc: number;
  signature: string;
  cluster: string;
  created_at: string;
};

export class TradesDb {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    ensureTradesSchema(this.db);
  }

  recordTrade(
    tradedAt: string,
    type: "buy" | "sell",
    amountSolAtomic: number,
    priceUsdc: number,
    signature: string,
    cluster: string,
  ): TradeRecord {
    const stmt = this.db.prepare(`
      INSERT INTO trades (traded_at, type, amount_sol_atomic, price_usdc, signature, cluster)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      tradedAt,
      type,
      amountSolAtomic,
      priceUsdc,
      signature,
      cluster,
    );

    const id = typeof info.lastInsertRowid === "bigint"
      ? Number(info.lastInsertRowid)
      : (info.lastInsertRowid as number);

    return {
      id,
      traded_at: tradedAt,
      type,
      amount_sol_atomic: amountSolAtomic,
      price_usdc: priceUsdc,
      signature,
      cluster,
      created_at: new Date().toISOString(),
    };
  }

  getRecentTrades(
    limit: number = 100,
    offsetSeconds: number = 0,
  ): TradeRecord[] {
    const cutoffDate = new Date(Date.now() - offsetSeconds * 1000).toISOString();

    const stmt = this.db.prepare(`
      SELECT id, traded_at, type, amount_sol_atomic, price_usdc, signature, cluster, created_at
      FROM trades
      WHERE traded_at >= ?
      ORDER BY traded_at DESC
      LIMIT ?
    `);

    return stmt.all(cutoffDate, limit) as TradeRecord[];
  }

  close(): void {
    this.db.close();
  }
}
