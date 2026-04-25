import type { HistoricalPriceSeries } from "./types";

type RenderedColumn = {
  header: string;
  values: string[];
  align: "left" | "right";
};

function padCell(
  value: string,
  width: number,
  align: "left" | "right",
): string {
  if (value.length >= width) {
    return value;
  }

  const padding = " ".repeat(width - value.length);
  return align === "right" ? `${padding}${value}` : `${value}${padding}`;
}

function renderBorder(columns: RenderedColumn[]): string {
  return `+${columns.map((column) => "-".repeat(columnWidth(column))).join("+")}+`;
}

function columnWidth(column: RenderedColumn): number {
  return (
    Math.max(
      column.header.length,
      ...column.values.map((value) => value.length),
    ) + 2
  );
}

function renderRow(columns: RenderedColumn[], rowIndex: number): string {
  return `|${columns
    .map((column) => {
      const width = columnWidth(column);
      const value = column.values[rowIndex] ?? "";
      return ` ${padCell(value, width - 2, column.align)} `;
    })
    .join("|")}|`;
}

export function renderHistoricalPricesTerminal(
  series: HistoricalPriceSeries,
): string {
  const columns: RenderedColumn[] = [
    {
      header: "Timestamp (UTC)",
      values: series.points.map((point) =>
        new Date(point.timestampMs).toISOString(),
      ),
      align: "left",
    },
    {
      header: "Price (USD)",
      values: series.points.map((point) => point.priceUsd.toFixed(6)),
      align: "right",
    },
    {
      header: "Market Cap (USD)",
      values: series.points.map((point) =>
        point.marketCapUsd === null ? "-" : point.marketCapUsd.toFixed(2),
      ),
      align: "right",
    },
    {
      header: "24h Volume (USD)",
      values: series.points.map((point) =>
        point.totalVolumeUsd === null ? "-" : point.totalVolumeUsd.toFixed(2),
      ),
      align: "right",
    },
  ];

  const title = `SOL/USD historical prices`;
  const range = `Range: ${new Date(series.fromUnixSeconds * 1000).toISOString()} -> ${new Date(series.toUnixSeconds * 1000).toISOString()}`;
  const summary = `Points: ${series.points.length}`;
  const header = columns.map(
    (column) => ` ${padCell(column.header, columnWidth(column) - 2, "left")} `,
  );
  const lines = [
    title,
    range,
    summary,
    renderBorder(columns),
    `|${header.join("|")}|`,
    renderBorder(columns),
  ];

  for (let index = 0; index < series.points.length; index += 1) {
    lines.push(renderRow(columns, index));
  }

  lines.push(renderBorder(columns));

  return lines.join("\n");
}
