import { Connection, Keypair } from "@solana/web3.js";
import type { AgentConfig } from "../config";
import type { TradesDb } from "../../lib/trades-db";
import type { Strategy, StrategySignal } from "../../lib/strategy";
import { MovingAverageStrategy } from "../../lib/strategy";
import { TradeExecutor } from "../trade/executor";

export type StrategyExecutorState = {
  isRunning: boolean;
  lastExecutionTime: number;
  lastSignal: StrategySignal;
  lastSignalTime: number;
  currentPrice: number;
  positionSize: number;
  availableCapitalUsdc: number;
};

export class StrategyExecutor {
  private connection: Connection;
  private strategy: Strategy;
  private executor: TradeExecutor;
  private config: AgentConfig;
  private tradesDb: TradesDb;
  private state: StrategyExecutorState;
  private executionTimer?: NodeJS.Timeout;

  constructor(
    connection: Connection,
    strategy: Strategy,
    executor: TradeExecutor,
    config: AgentConfig,
    tradesDb: TradesDb,
    initialCapitalUsdc: number = 1000,
  ) {
    this.connection = connection;
    this.strategy = strategy;
    this.executor = executor;
    this.config = config;
    this.tradesDb = tradesDb;
    this.state = {
      isRunning: false,
      lastExecutionTime: 0,
      lastSignal: "hold",
      lastSignalTime: 0,
      currentPrice: 0,
      positionSize: 0,
      availableCapitalUsdc: initialCapitalUsdc,
    };
  }

  /**
   * Start the strategy execution loop
   */
  start(): void {
    if (this.state.isRunning) {
      console.warn("Strategy executor already running");
      return;
    }

    this.state.isRunning = true;
    console.log(
      `Starting strategy executor with ${this.config.strategyTickSeconds}s interval`,
    );

    // Execute immediately, then schedule
    this.executeStrategyTick();
    this.executionTimer = setInterval(
      () => this.executeStrategyTick(),
      this.config.strategyTickSeconds * 1000,
    );
  }

  /**
   * Stop the strategy execution loop
   */
  stop(): void {
    if (!this.state.isRunning) {
      console.warn("Strategy executor not running");
      return;
    }

    this.state.isRunning = false;
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
      this.executionTimer = undefined;
    }

    console.log("Strategy executor stopped");
  }

  /**
   * Execute a single strategy tick
   */
  private async executeStrategyTick(): Promise<void> {
    try {
      const now = Date.now();
      this.state.lastExecutionTime = now;

      // Get strategy signal
      const lookbackSeconds =
        this.config.strategyLookbackSecondsOverride !== null
          ? this.config.strategyLookbackSecondsOverride
          : this.config.strategyTickSeconds * 10;

      const signal = this.strategy.execute(
        this.tradesDb,
        lookbackSeconds,
        this.config.strategyBuyPercent,
        this.config.strategySellPercent,
      );

      console.log(
        `[${new Date().toISOString()}] Strategy signal: ${signal}`,
      );

      // Check if we should debounce this signal
      if (!this.shouldExecuteSignal(signal, now)) {
        console.log(`Signal debounced (same signal within cooldown period)`);
        return;
      }

      // Execute the signal
      await this.handleSignal(signal);

      // Update state
      this.state.lastSignal = signal;
      this.state.lastSignalTime = now;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Strategy execution error: ${errorMsg}`);
    }
  }

  /**
   * Check if signal should be executed (debouncing logic)
   * Prevents duplicate signals within a configurable cooldown period
   */
  private shouldExecuteSignal(signal: StrategySignal, now: number): boolean {
    // Always execute "hold" signal (no action needed)
    if (signal === "hold") {
      return false;
    }

    // Don't execute if it's the same signal within cooldown
    const cooldownMs = this.config.strategyTickSeconds * 1000 * 2; // 2 ticks
    if (
      this.state.lastSignal === signal &&
      now - this.state.lastSignalTime < cooldownMs
    ) {
      return false;
    }

    return true;
  }

  /**
   * Handle buy or sell signal
   */
  private async handleSignal(signal: StrategySignal): Promise<void> {
    if (signal === "buy") {
      await this.executeBuy();
    } else if (signal === "sell") {
      await this.executeSell();
    }
  }

  /**
   * Execute a buy trade based on available capital
   */
  private async executeBuy(): Promise<void> {
    try {
      // Calculate position size based on buyPercent
      const buyAmount = Math.floor(
        this.state.availableCapitalUsdc *
          (this.config.strategyBuyPercent / 100),
      );

      if (buyAmount <= 0) {
        console.warn("Buy amount is zero or negative, skipping buy");
        return;
      }

      console.log(`Executing buy with ${buyAmount} atomic USDC`);

      const result = await this.executor.executeBuy(buyAmount);

      if (result.success) {
        // Update position after successful buy
        const solAmount = result.amountExecuted || 0;
        this.state.positionSize += solAmount;
        this.state.availableCapitalUsdc -= buyAmount;

        console.log(
          `Buy successful: +${solAmount} SOL, available capital: ${this.state.availableCapitalUsdc}`,
        );
      } else {
        console.error(`Buy failed: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Buy execution error: ${errorMsg}`);
    }
  }

  /**
   * Execute a sell trade based on current position
   */
  private async executeSell(): Promise<void> {
    try {
      // Calculate sell amount based on sellPercent and current holdings
      const sellAmount = Math.floor(
        this.state.positionSize * (this.config.strategySellPercent / 100),
      );

      if (sellAmount <= 0) {
        console.warn("Sell amount is zero or negative, skipping sell");
        return;
      }

      console.log(`Executing sell with ${sellAmount} atomic SOL`);

      const result = await this.executor.executeSell(sellAmount);

      if (result.success) {
        // Update position after successful sell
        const usdcReceived = sellAmount * this.state.currentPrice; // Approximate
        this.state.positionSize -= sellAmount;
        this.state.availableCapitalUsdc += Math.floor(usdcReceived);

        console.log(
          `Sell successful: -${sellAmount} SOL, available capital: ${this.state.availableCapitalUsdc}`,
        );
      } else {
        console.error(`Sell failed: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Sell execution error: ${errorMsg}`);
    }
  }

  /**
   * Update current price from latest trade
   */
  async updateCurrentPrice(): Promise<void> {
    try {
      const recentTrades = this.tradesDb.getRecentTrades(1);
      if (recentTrades.length > 0) {
        this.state.currentPrice = recentTrades[0].price_usdc;
      }
    } catch (error) {
      console.error(`Failed to update current price: ${error}`);
    }
  }

  /**
   * Get current executor state
   */
  getState(): StrategyExecutorState {
    return { ...this.state };
  }

  /**
   * Manually set available capital (for initialization/rebalancing)
   */
  setAvailableCapital(amount: number): void {
    this.state.availableCapitalUsdc = amount;
  }

  /**
   * Manually set position size (for initialization)
   */
  setPositionSize(amount: number): void {
    this.state.positionSize = amount;
  }
}

/**
 * Factory function to create a StrategyExecutor
 */
export async function createStrategyExecutor(
  config: AgentConfig,
  tradesDb: TradesDb,
  initialCapitalUsdc?: number,
  keypair?: Keypair,
): Promise<StrategyExecutor> {
  const connection = new Connection(config.solanaRpcUrl);

  // Create the strategy based on config
  let strategy: Strategy;
  switch (config.strategyName) {
    case "moving-average":
      strategy = new MovingAverageStrategy();
      break;
    default:
      throw new Error(`Unknown strategy: ${config.strategyName}`);
  }

  // Create the executor
  const executor = await (async () => {
    if (keypair) {
      const tradeExecutor = require("../trade/executor");
      return new tradeExecutor.TradeExecutor(
        connection,
        keypair,
        config,
        tradesDb,
      );
    } else {
      const { createTradeExecutor } = require("../trade/executor");
      return createTradeExecutor(config, tradesDb);
    }
  })();

  return new StrategyExecutor(
    connection,
    strategy,
    executor,
    config,
    tradesDb,
    initialCapitalUsdc || 1000,
  );
}
