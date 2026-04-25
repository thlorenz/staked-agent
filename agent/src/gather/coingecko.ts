import type { AgentConfig } from "../config";
import type { HistoricalPriceSeries } from "./types";

type CoinGeckoRangeResponse = {
  prices: number[][];
  market_caps: number[][];
  total_volumes: number[][];
};

export async function fetchHistoricalSolRange(
  config: AgentConfig,
  fromUnixSeconds: number,
  toUnixSeconds: number,
): Promise<HistoricalPriceSeries> {
  const url = new URL(
    `${config.coinGeckoBaseUrl}/coins/solana/market_chart/range`,
  );
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("from", fromUnixSeconds.toString());
  url.searchParams.set("to", toUnixSeconds.toString());

  const headers: Record<string, string> = {};
  if (config.coinGeckoDemoApiKey) {
    headers["x-cg-demo-api-key"] = config.coinGeckoDemoApiKey;
  }

  const response = await fetch(url.toString(), {
    headers,
  });

  if (!response.ok) {
    throw new Error(`CoinGecko request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as CoinGeckoRangeResponse;
  if (!Array.isArray(payload.prices) || payload.prices.length === 0) {
    throw new Error("No SOL price data returned.");
  }

  const marketCapsByTimestamp = new Map<number, number>();
  for (const entry of payload.market_caps ?? []) {
    const [timestampMs, marketCapUsd] = entry;
    marketCapsByTimestamp.set(timestampMs, marketCapUsd);
  }

  const totalVolumesByTimestamp = new Map<number, number>();
  for (const entry of payload.total_volumes ?? []) {
    const [timestampMs, totalVolumeUsd] = entry;
    totalVolumesByTimestamp.set(timestampMs, totalVolumeUsd);
  }

  const points = payload.prices.map(([timestampMs, priceUsd]) => ({
    timestampMs,
    priceUsd,
    marketCapUsd: marketCapsByTimestamp.get(timestampMs) ?? null,
    totalVolumeUsd: totalVolumesByTimestamp.get(timestampMs) ?? null,
  }));

  points.sort((left, right) => left.timestampMs - right.timestampMs);

  return {
    asset: "SOL",
    quoteCurrency: "USD",
    fromUnixSeconds,
    toUnixSeconds,
    points,
  };
}
