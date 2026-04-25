import type { AgentConfig } from "../config";
import type { HistoricalPriceSeries } from "./types";

type CoinGeckoRangeResponse = {
  prices: number[][];
  market_caps: number[][];
  total_volumes: number[][];
};

const MIN_QUERY_WINDOW_SECONDS = 30 * 60;

function buildPointSeries(
  payload: CoinGeckoRangeResponse,
): HistoricalPriceSeries["points"] {
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
  return points;
}

export async function fetchHistoricalSolRange(
  config: AgentConfig,
  fromUnixSeconds: number,
  toUnixSeconds: number,
): Promise<HistoricalPriceSeries> {
  const queryFromUnixSeconds = Math.max(
    0,
    fromUnixSeconds - MIN_QUERY_WINDOW_SECONDS,
  );
  const url = new URL(
    `${config.coinGeckoBaseUrl}/coins/solana/market_chart/range`,
  );
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("from", queryFromUnixSeconds.toString());
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
    console.error("CoinGecko response did not contain price data.", {
      payload,
    });
    throw new Error("No SOL price data returned.");
  }

  const points = buildPointSeries(payload);
  const fromTimestampMs = fromUnixSeconds * 1000;
  const toTimestampMs = toUnixSeconds * 1000;
  const pointsInRequestedWindow = points.filter(
    (point) =>
      point.timestampMs >= fromTimestampMs &&
      point.timestampMs <= toTimestampMs,
  );
  const effectivePoints =
    pointsInRequestedWindow.length > 0
      ? pointsInRequestedWindow
      : [points[points.length - 1]];

  return {
    asset: "SOL",
    quoteCurrency: "USD",
    fromUnixSeconds,
    toUnixSeconds,
    points: effectivePoints,
  };
}
