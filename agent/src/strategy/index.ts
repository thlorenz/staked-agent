import { loadAgentConfig } from "../config";
import { getHistoricalSolPrices } from "../gather";
import type { HistoricalPriceSeries } from "../gather/types";
import {
  createSolanaConnection,
  loadKeypairFromFile,
} from "../shared";
import { executeTrade } from "../trade";
import type { TradeRequest } from "../trade/types";
import { readAgentBalances } from "./balances";
import type { AgentBalances } from "./balances";
import { logTick } from "./monitor";
import type { TickReport } from "./monitor";
import { computePnl } from "./pnl";
import {
  computeBuySolAmount,
  computeSellSolAmount,
} from "./sizing";
import {
  ensureTradesSchema,
  getLastTrade,
  getTradesDatabase,
  listAllTradesAsc,
  recordTrade,
} from "./store";
import { createStrategy } from "./strategies";
import type { Mode, Strategy } from "./types";

const LAMPORTS_PER_SOL = 1_000_000_000;
const STALE_PRICE_MAX_AGE_SECONDS = 30 * 60;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latestPriceUsdc(series: HistoricalPriceSeries): number | null {
  if (series.points.length === 0) {
    return null;
  }
  return series.points[series.points.length - 1].priceUsd;
}

function isPriceStale(series: HistoricalPriceSeries): boolean {
  if (series.points.length === 0) {
    return true;
  }
  const lastTimestampMs =
    series.points[series.points.length - 1].timestampMs;
  const ageSeconds = (Date.now() - lastTimestampMs) / 1000;
  return ageSeconds > STALE_PRICE_MAX_AGE_SECONDS;
}

function totalHoldingsUsdc(
  balances: AgentBalances,
  priceUsdc: number,
): number {
  const solValue =
    (Number(balances.solLamports) / LAMPORTS_PER_SOL) * priceUsdc;
  const usdcValue = Number(balances.usdcAtomic) / 1_000_000;
  return solValue + usdcValue;
}

async function tick(
  strategy: Strategy,
  mode: Mode,
): Promise<{ nextMode: Mode }> {
  const config = loadAgentConfig();
  const connection = createSolanaConnection(config.solanaRpcUrl);
  const signer = loadKeypairFromFile(config.agentKeypairPath);
  const db = getTradesDatabase(config.tradesDbPath);

  const priceData = await getHistoricalSolPrices(
    strategy.getPriceDataRangeInSeconds(),
  );
  const priceUsdc = latestPriceUsdc(priceData);
  const stale = isPriceStale(priceData);

  const balances = await readAgentBalances(
    connection,
    signer.publicKey,
    config,
  );
  const lastTrade = getLastTrade(db);
  const pnl = computePnl(listAllTradesAsc(db));

  const baseReport: TickReport = {
    tickIso: new Date().toISOString(),
    mode,
    priceUsdc,
    priceSamples: priceData.points.length,
    balances,
    totalHoldingsUsdc:
      priceUsdc !== null ? totalHoldingsUsdc(balances, priceUsdc) : null,
    lastTrade,
    pnl,
    decision: "skip",
    justExecuted: null,
    explorerUrl: null,
    errorMessage: null,
  };

  if (stale || priceUsdc === null) {
    logTick({ ...baseReport, decision: "skip-stale-prices" });
    return { nextMode: mode };
  }

  const wantsTrade =
    mode === "buy"
      ? strategy.shouldBuy(priceData)
      : strategy.shouldSell(priceData);

  if (!wantsTrade) {
    logTick(baseReport);
    return { nextMode: mode };
  }

  const solAtomicAmount =
    mode === "buy"
      ? computeBuySolAmount({
          solHeldLamports: balances.solLamports,
          priceUsdcPerSol: priceUsdc,
          buyPercent: config.strategyBuyPercent,
        })
      : computeSellSolAmount({
          solHeldLamports: balances.solLamports,
          sellPercent: config.strategySellPercent,
          feeReserveLamports: config.minSolFeeReserveLamports,
        });

  if (solAtomicAmount <= 0n) {
    logTick({
      ...baseReport,
      decision: mode,
      errorMessage: "computed trade amount is zero; skipping",
    });
    return { nextMode: mode };
  }

  const tradeRequest: TradeRequest = {
    direction:
      mode === "buy" ? "buy-sol-with-usdc" : "sell-sol-for-usdc",
    solAtomicAmount,
    slippageBps: config.slippageBps,
  };

  try {
    const executed = await executeTrade(tradeRequest);
    const recorded = recordTrade(db, {
      tradedAt: new Date().toISOString(),
      type: mode,
      amountSolAtomic: solAtomicAmount,
      priceUsdc,
      signature: executed.signature,
      cluster: config.cluster,
    });
    logTick({
      ...baseReport,
      decision: mode,
      justExecuted: recorded,
      explorerUrl: executed.explorerUrl,
      pnl: computePnl(listAllTradesAsc(db)),
      lastTrade: recorded,
    });
    return { nextMode: mode === "buy" ? "sell" : "buy" };
  } catch (error) {
    logTick({
      ...baseReport,
      decision: mode,
      errorMessage:
        error instanceof Error ? error.message : String(error),
    });
    return { nextMode: mode };
  }
}

function deriveInitialMode(db: ReturnType<typeof getTradesDatabase>): Mode {
  const last = getLastTrade(db);
  if (!last) {
    return "buy";
  }
  return last.type === "buy" ? "sell" : "buy";
}

export async function runStrategyLoop(): Promise<void> {
  const config = loadAgentConfig();
  const strategy = createStrategy(config);
  const db = getTradesDatabase(config.tradesDbPath);
  ensureTradesSchema(db);

  let mode: Mode = deriveInitialMode(db);
  console.log(
    `strategy=${strategy.name} tick_seconds=${config.strategyTickSeconds} initial_mode=${mode} cluster=${config.cluster}`,
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const startedAt = Date.now();
    try {
      const result = await tick(strategy, mode);
      mode = result.nextMode;
    } catch (error) {
      console.error(
        `tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = Math.max(
      0,
      config.strategyTickSeconds * 1000 - elapsedMs,
    );
    await delay(remainingMs);
  }
}
