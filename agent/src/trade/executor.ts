import {
  Connection,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";
import type { AgentConfig } from "../config";
import type { TradesDb } from "../../lib/trades-db";

export type ExecutorResult = {
  success: boolean;
  signature?: string;
  error?: string;
  amountExecuted?: number;
};

export class TradeExecutor {
  private connection: Connection;
  private keypair: Keypair;
  private config: AgentConfig;
  private tradesDb: TradesDb;

  constructor(
    connection: Connection,
    keypair: Keypair,
    config: AgentConfig,
    tradesDb: TradesDb,
  ) {
    this.connection = connection;
    this.keypair = keypair;
    this.config = config;
    this.tradesDb = tradesDb;
  }

  async executeBuy(amountUsdcAtomic: number): Promise<ExecutorResult> {
    try {
      // Validate SOL balance for fees
      const solBalance = await this.connection.getBalance(this.keypair.publicKey);
      if (solBalance < Number(this.config.minSolFeeReserveLamports)) {
        return {
          success: false,
          error: `Insufficient SOL for fees. Balance: ${solBalance}, Required: ${this.config.minSolFeeReserveLamports}`,
        };
      }

      // Get quote from Jupiter
      const quote = await this.getQuote(
        this.config.usdcMint,
        this.config.solMint,
        amountUsdcAtomic,
      );

      if (!quote) {
        return {
          success: false,
          error: "Failed to get quote from Jupiter",
        };
      }

      // Apply slippage
      const minOutAmount = this.applySlippage(
        BigInt(quote.outAmount),
        this.config.slippageBps,
        false, // not selling, so reduce output
      );

      // Execute swap
      const result = await this.executeSwap(
        this.config.usdcMint,
        this.config.solMint,
        amountUsdcAtomic,
        minOutAmount.toString(),
      );

      if (!result.success || !result.signature) {
        return {
          success: false,
          error: result.error || "Swap failed",
        };
      }

      // Record trade
      const priceUsdc =
        amountUsdcAtomic / Number(minOutAmount) || Number(quote.outAmount);
      const trade = this.tradesDb.recordTrade(
        new Date().toISOString(),
        "buy",
        Number(minOutAmount),
        priceUsdc,
        result.signature,
        this.config.cluster,
      );

      console.log(`Buy trade recorded: ${trade.id}, ${minOutAmount} SOL at $${priceUsdc.toFixed(4)}`);

      return {
        success: true,
        signature: result.signature,
        amountExecuted: Number(minOutAmount),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Buy execution failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async executeSell(amountSolAtomic: number): Promise<ExecutorResult> {
    try {
      // Validate SOL balance
      const solBalance = await this.connection.getBalance(this.keypair.publicKey);
      const required = amountSolAtomic + Number(this.config.minSolFeeReserveLamports);
      if (solBalance < required) {
        return {
          success: false,
          error: `Insufficient SOL. Balance: ${solBalance}, Required: ${required}`,
        };
      }

      // Get quote from Jupiter
      const quote = await this.getQuote(
        this.config.solMint,
        this.config.usdcMint,
        amountSolAtomic,
      );

      if (!quote) {
        return {
          success: false,
          error: "Failed to get quote from Jupiter",
        };
      }

      // Apply slippage
      const minOutAmount = this.applySlippage(
        BigInt(quote.outAmount),
        this.config.slippageBps,
        true, // selling, so reduce output
      );

      // Execute swap
      const result = await this.executeSwap(
        this.config.solMint,
        this.config.usdcMint,
        amountSolAtomic,
        minOutAmount.toString(),
      );

      if (!result.success || !result.signature) {
        return {
          success: false,
          error: result.error || "Swap failed",
        };
      }

      // Record trade
      const priceUsdc = Number(minOutAmount) / amountSolAtomic;
      const trade = this.tradesDb.recordTrade(
        new Date().toISOString(),
        "sell",
        amountSolAtomic,
        priceUsdc,
        result.signature,
        this.config.cluster,
      );

      console.log(`Sell trade recorded: ${trade.id}, ${amountSolAtomic} atomic SOL for $${minOutAmount}`);

      return {
        success: true,
        signature: result.signature,
        amountExecuted: amountSolAtomic,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Sell execution failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  private async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
  ): Promise<{
    inAmount: string;
    outAmount: string;
    priceImpactPct: string;
  } | null> {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: this.config.slippageBps.toString(),
      });

      const url = `${this.config.jupiterBaseUrl}/quote?${params}`;
      const headers: Record<string, string> = {
        "Accept": "application/json",
      };

      if (this.config.jupiterApiKey) {
        headers["X-Jupiter-API-Key"] = this.config.jupiterApiKey;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error(`Jupiter quote failed: ${response.status}`);
        return null;
      }

      const data = await response.json() as {
        inAmount: string;
        outAmount: string;
        priceImpactPct: string;
      };
      return data;
    } catch (error) {
      console.error(`Quote fetch error: ${error}`);
      return null;
    }
  }

  private async executeSwap(
    inputMint: string,
    outputMint: string,
    inAmount: number,
    minOutAmount: string,
  ): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      // Get quote for swap
      const quoteParams = new URLSearchParams({
        inputMint,
        outputMint,
        amount: inAmount.toString(),
        slippageBps: this.config.slippageBps.toString(),
      });

      const quoteUrl = `${this.config.jupiterBaseUrl}/quote?${quoteParams}`;
      const quoteHeaders: Record<string, string> = {
        "Accept": "application/json",
      };

      if (this.config.jupiterApiKey) {
        quoteHeaders["X-Jupiter-API-Key"] = this.config.jupiterApiKey;
      }

      const quoteResponse = await fetch(quoteUrl, { headers: quoteHeaders });

      if (!quoteResponse.ok) {
        return {
          success: false,
          error: "Failed to get swap quote",
        };
      }

      const quote = await quoteResponse.json() as Record<string, unknown>;

      // Request swap transaction
      const swapUrl = `${this.config.jupiterBaseUrl}/swap`;
      const swapHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      if (this.config.jupiterApiKey) {
        swapHeaders["X-Jupiter-API-Key"] = this.config.jupiterApiKey;
      }

      const swapBody = {
        quoteResponse: quote,
        userPublicKey: this.keypair.publicKey.toString(),
        dynamicComputeUnitLimit: true,
        dynamicSlippage: {
          minBps: Math.floor(this.config.slippageBps * 0.5),
          maxBps: this.config.slippageBps * 2,
        },
        prioritizationFeeLamports: this.config.maxPriorityFeeLamports,
      };

      const swapResponse = await fetch(swapUrl, {
        method: "POST",
        headers: swapHeaders,
        body: JSON.stringify(swapBody),
      });

      if (!swapResponse.ok) {
        return {
          success: false,
          error: `Swap request failed: ${swapResponse.status}`,
        };
      }

      const swapData = await swapResponse.json() as {
        swapTransaction: string;
      };

      if (!swapData.swapTransaction) {
        return {
          success: false,
          error: "No swap transaction returned",
        };
      }

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      transaction.sign([this.keypair]);

      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3,
      });

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(
        signature,
        "confirmed",
      );

      if (confirmation.value.err) {
        return {
          success: false,
          error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        };
      }

      console.log(`Transaction confirmed: ${signature}`);

      return {
        success: true,
        signature,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  private applySlippage(
    amount: bigint,
    slippageBps: number,
    isSelling: boolean,
  ): bigint {
    // slippageBps is basis points (1 bps = 0.01% = 0.0001)
    // For buying: reduce output (multiply by (1 - slippage))
    // For selling: reduce output (multiply by (1 - slippage))
    const slippageMultiplier = BigInt(10000 - slippageBps);
    return (amount * slippageMultiplier) / BigInt(10000);
  }
}

export async function createTradeExecutor(
  config: AgentConfig,
  tradesDb: TradesDb,
  keypair?: Keypair,
): Promise<TradeExecutor> {
  const connection = new Connection(config.solanaRpcUrl);
  
  let actualKeypair: Keypair;
  if (keypair) {
    actualKeypair = keypair;
  } else {
    const fs = await import("fs");
    const secretKeyData = JSON.parse(
      fs.readFileSync(config.agentKeypairPath, "utf-8"),
    ) as number[];
    actualKeypair = Keypair.fromSecretKey(Buffer.from(secretKeyData));
  }

  return new TradeExecutor(connection, actualKeypair, config, tradesDb);
}
