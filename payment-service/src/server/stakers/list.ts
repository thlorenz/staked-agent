import type { AppConfig } from "@/src/server/config";
import { getDatabase } from "@/src/db/client";
import { ensureStakePaymentsSchema } from "@/src/db/schema";
import { listStakerLeaderboard } from "@/src/db/stake-payments";
import type { StakerLeaderboardEntry } from "@/src/server/types";

export function listStakers(config: AppConfig): StakerLeaderboardEntry[] {
  const db = getDatabase(config.sqliteDbPath);
  ensureStakePaymentsSchema(db);
  return listStakerLeaderboard(db);
}
