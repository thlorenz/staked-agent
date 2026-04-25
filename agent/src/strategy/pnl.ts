import type { TradeRecord } from "./types";

const LAMPORTS_PER_SOL = 1_000_000_000;

function tradeUsdcValue(trade: TradeRecord): number {
  const solAmount = Number(trade.amountSolAtomic) / LAMPORTS_PER_SOL;
  return solAmount * trade.priceUsdc;
}

export type PnlSummary = {
  lastCyclePnlUsdc: number | null; // null until at least one buy+sell pair exists
  cumulativePnlUsdc: number; // sum over closed buy/sell pairs in order
};

/**
 * Walks the trades in insertion order and pairs each `sell` with the
 * most recent unmatched `buy`. PnL of the pair is `sellUsdc - buyUsdc`.
 * Stray buys with no following sell are ignored for PnL but counted
 * for completeness via the queue length.
 */
export function computePnl(trades: TradeRecord[]): PnlSummary {
  const buyQueue: TradeRecord[] = [];
  let cumulative = 0;
  let lastCycle: number | null = null;
  for (const trade of trades) {
    if (trade.type === "buy") {
      buyQueue.push(trade);
      continue;
    }
    const matchingBuy = buyQueue.shift();
    if (!matchingBuy) {
      continue;
    }
    const cyclePnl = tradeUsdcValue(trade) - tradeUsdcValue(matchingBuy);
    cumulative += cyclePnl;
    lastCycle = cyclePnl;
  }
  return { lastCyclePnlUsdc: lastCycle, cumulativePnlUsdc: cumulative };
}
