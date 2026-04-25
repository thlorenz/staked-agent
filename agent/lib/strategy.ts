import type { TradesDb, TradeRecord } from "./trades-db";

export type StrategySignal = "buy" | "sell" | "hold";

export type StrategyState = {
  lastSignal: StrategySignal;
  lastSignalTime: Date;
  currentHoldings: number;
  averageEntryPrice: number;
};

export interface Strategy {
  execute(
    tradesDb: TradesDb,
    lookbackSeconds: number,
    buyPercent: number,
    sellPercent: number,
  ): StrategySignal;
  getState(): StrategyState;
}

export class MovingAverageStrategy implements Strategy {
  private state: StrategyState;

  constructor() {
    this.state = {
      lastSignal: "hold",
      lastSignalTime: new Date(),
      currentHoldings: 0,
      averageEntryPrice: 0,
    };
  }

  execute(
    tradesDb: TradesDb,
    lookbackSeconds: number,
    buyPercent: number,
    sellPercent: number,
  ): StrategySignal {
    // Fetch recent trades within the lookback window
    const trades = tradesDb.getRecentTrades(1000, lookbackSeconds);

    if (trades.length === 0) {
      this.state.lastSignal = "hold";
      return "hold";
    }

    // Separate buy and sell trades
    const buyTrades = trades.filter((t) => t.type === "buy");
    const sellTrades = trades.filter((t) => t.type === "sell");

    // Calculate average prices
    const avgBuyPrice =
      buyTrades.length > 0
        ? buyTrades.reduce((sum, t) => sum + t.price_usdc, 0) / buyTrades.length
        : 0;

    const avgSellPrice =
      sellTrades.length > 0
        ? sellTrades.reduce((sum, t) => sum + t.price_usdc, 0) /
          sellTrades.length
        : 0;

    // Get the most recent trade price as reference
    const lastTrade = trades[0];
    const currentPrice = lastTrade.price_usdc;

    // Calculate moving averages using exponential weighting
    // (more recent trades weighted higher)
    const shortTermMA = this.calculateWeightedMA(trades.slice(0, 10), 10);
    const longTermMA = this.calculateWeightedMA(trades, lookbackSeconds);

    // Determine signal based on thresholds and moving averages
    let signal: StrategySignal = "hold";

    if (currentPrice < longTermMA && buyTrades.length > sellTrades.length) {
      // Price below long-term average and more buys than sells
      // This suggests accumulation/buying opportunity
      const buyRatio = (buyTrades.length / trades.length) * 100;
      if (buyRatio >= buyPercent) {
        signal = "buy";
      }
    } else if (currentPrice > longTermMA && sellTrades.length > buyTrades.length) {
      // Price above long-term average and more sells than buys
      // This suggests selling opportunity
      const sellRatio = (sellTrades.length / trades.length) * 100;
      if (sellRatio >= sellPercent) {
        signal = "sell";
      }
    }

    // Update state
    if (signal === "buy") {
      this.state.currentHoldings += lastTrade.amount_sol_atomic;
      this.state.averageEntryPrice =
        (this.state.averageEntryPrice * (this.state.currentHoldings - lastTrade.amount_sol_atomic) +
          currentPrice * lastTrade.amount_sol_atomic) /
        this.state.currentHoldings;
    } else if (signal === "sell" && this.state.currentHoldings > 0) {
      this.state.currentHoldings -= Math.min(
        lastTrade.amount_sol_atomic,
        this.state.currentHoldings,
      );
    }

    this.state.lastSignal = signal;
    this.state.lastSignalTime = new Date();

    return signal;
  }

  private calculateWeightedMA(
    trades: TradeRecord[],
    windowSize: number,
  ): number {
    if (trades.length === 0) return 0;

    // Calculate weighted moving average with exponential weighting
    // More recent trades have higher weight
    let totalWeight = 0;
    let weightedSum = 0;

    trades.forEach((trade, index) => {
      // Weight increases for more recent trades (index 0 is most recent)
      const weight = Math.exp(-index / (trades.length / 2));
      weightedSum += trade.price_usdc * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  getState(): StrategyState {
    return { ...this.state };
  }
}
