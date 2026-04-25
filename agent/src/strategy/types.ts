import type { HistoricalPriceSeries } from "../gather/types";

export type Mode = "buy" | "sell";

export interface Strategy {
  readonly name: string;
  getPriceDataRangeInSeconds(): number;
  shouldBuy(priceData: HistoricalPriceSeries): boolean;
  shouldSell(priceData: HistoricalPriceSeries): boolean;
}

export type TradeRecord = {
  id: number;
  tradedAt: string;
  type: Mode;
  amountSolAtomic: bigint;
  priceUsdc: number;
  signature: string;
  cluster: "devnet" | "mainnet";
  createdAt: string;
};

export type InsertTradeInput = {
  tradedAt: string;
  type: Mode;
  amountSolAtomic: bigint;
  priceUsdc: number;
  signature: string;
  cluster: "devnet" | "mainnet";
};
