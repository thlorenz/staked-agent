import { formatAtomicToDecimal } from "../shared";
import type { AgentBalances } from "./balances";
import type { PnlSummary } from "./pnl";
import type { Mode, TradeRecord } from "./types";

export type TickReport = {
  tickIso: string;
  mode: Mode;
  priceUsdc: number | null;
  priceSamples: number;
  balances: AgentBalances;
  totalHoldingsUsdc: number | null;
  lastTrade: TradeRecord | null;
  pnl: PnlSummary;
  decision: "buy" | "sell" | "skip" | "skip-stale-prices";
  justExecuted: TradeRecord | null;
  explorerUrl: string | null;
  errorMessage: string | null;
};

const LAMPORTS_PER_SOL = 1_000_000_000;

export function logTick(report: TickReport): void {
  const lines: string[] = [];
  lines.push(`--- tick ${report.tickIso} ---`);
  lines.push(`mode=${report.mode} decision=${report.decision}`);
  lines.push(
    `price_usdc=${report.priceUsdc ?? "n/a"} samples=${report.priceSamples}`,
  );
  lines.push(
    `balance_sol=${formatAtomicToDecimal(report.balances.solLamports, 9)} (${report.balances.solLamports} lamports)`,
  );
  lines.push(
    `balance_usdc=${formatAtomicToDecimal(report.balances.usdcAtomic, 6)} (${report.balances.usdcAtomic} atomic)`,
  );
  if (report.totalHoldingsUsdc !== null) {
    lines.push(`holdings_usdc=${report.totalHoldingsUsdc.toFixed(6)}`);
  }
  if (report.lastTrade) {
    const t = report.lastTrade;
    lines.push(
      `last_trade=${t.type} amount_sol=${(Number(t.amountSolAtomic) / LAMPORTS_PER_SOL).toFixed(9)} price=${t.priceUsdc} sig=${t.signature}`,
    );
  } else {
    lines.push(`last_trade=none`);
  }
  lines.push(
    `pnl_last_cycle_usdc=${report.pnl.lastCyclePnlUsdc ?? "n/a"} pnl_cumulative_usdc=${report.pnl.cumulativePnlUsdc.toFixed(6)}`,
  );
  if (report.justExecuted) {
    lines.push(
      `executed=${report.justExecuted.type} sig=${report.justExecuted.signature}`,
    );
    if (report.explorerUrl) {
      lines.push(`explorer=${report.explorerUrl}`);
    }
  }
  if (report.errorMessage) {
    lines.push(`error=${report.errorMessage}`);
  }
  console.log(lines.join("\n"));
}
