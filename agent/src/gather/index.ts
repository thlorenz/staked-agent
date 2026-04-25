import { loadAgentConfig } from "../config";
import { fetchHistoricalSolRange } from "./coingecko";
import type { HistoricalPriceSeries } from "./types";

export async function getHistoricalSolPrices(
  lookbackSeconds: number,
  nowUnixSeconds = Math.floor(Date.now() / 1000),
): Promise<HistoricalPriceSeries> {
  if (!Number.isSafeInteger(lookbackSeconds)) {
    throw new Error("lookbackSeconds must be a safe integer.");
  }

  if (lookbackSeconds <= 0) {
    throw new Error("lookbackSeconds must be greater than zero.");
  }

  const fromUnixSeconds = nowUnixSeconds - lookbackSeconds;
  return fetchHistoricalSolRange(
    loadAgentConfig(),
    fromUnixSeconds,
    nowUnixSeconds,
  );
}
