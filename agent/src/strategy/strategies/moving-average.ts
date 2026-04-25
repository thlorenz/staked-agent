import type { HistoricalPriceSeries } from "../../gather/types";
import type { Strategy } from "../types";

const ONE_DAY_SECONDS = 24 * 60 * 60;

function computeMovingAverage(series: HistoricalPriceSeries): number | null {
  if (series.points.length === 0) {
    return null;
  }
  const total = series.points.reduce((sum, point) => sum + point.priceUsd, 0);
  return total / series.points.length;
}

function latestPrice(series: HistoricalPriceSeries): number | null {
  if (series.points.length === 0) {
    return null;
  }
  return series.points[series.points.length - 1].priceUsd;
}

export class MovingAverageStrategy implements Strategy {
  readonly name = "moving-average";

  constructor(
    private readonly lookbackSeconds: number = ONE_DAY_SECONDS,
    private readonly threshold: number = 0.01,
  ) {}

  getPriceDataRangeInSeconds(): number {
    return this.lookbackSeconds;
  }

  shouldBuy(priceData: HistoricalPriceSeries): boolean {
    const ma = computeMovingAverage(priceData);
    const last = latestPrice(priceData);
    if (ma === null || last === null || ma <= 0) {
      return false;
    }
    return last <= ma * (1 - this.threshold);
  }

  shouldSell(priceData: HistoricalPriceSeries): boolean {
    const ma = computeMovingAverage(priceData);
    const last = latestPrice(priceData);
    if (ma === null || last === null || ma <= 0) {
      return false;
    }
    return last >= ma * (1 + this.threshold);
  }
}
