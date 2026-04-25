import type { ExecutedTrade, TradeRequest } from "./types";

export async function executeTrade(
  _request: TradeRequest,
): Promise<ExecutedTrade> {
  throw new Error("executeTrade is not implemented yet.");
}
