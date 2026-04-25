export type HistoricalPricePoint = {
  timestampMs: number;
  priceUsd: number;
  marketCapUsd: number | null;
  totalVolumeUsd: number | null;
};

export type HistoricalPriceSeries = {
  asset: "SOL";
  quoteCurrency: "USD";
  fromUnixSeconds: number;
  toUnixSeconds: number;
  points: HistoricalPricePoint[];
};
