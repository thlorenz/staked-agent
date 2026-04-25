import type { HistoricalPriceSeries } from "./types";

export function renderHistoricalPricesMarkdown(
  series: HistoricalPriceSeries,
): string {
  const lines = [
    "| Timestamp (UTC) | Price (USD) | Market Cap (USD) | 24h Volume (USD) |",
    "| --- | ---: | ---: | ---: |",
  ];

  for (const point of series.points) {
    lines.push(
      [
        new Date(point.timestampMs).toISOString(),
        point.priceUsd.toFixed(6),
        point.marketCapUsd === null ? "" : point.marketCapUsd.toFixed(2),
        point.totalVolumeUsd === null ? "" : point.totalVolumeUsd.toFixed(2),
      ].join(" | "),
    );
  }

  return lines.map((line) => `| ${line} |`).join("\n");
}
