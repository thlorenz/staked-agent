import type { Keypair } from "@solana/web3.js";

export type TradeDirection = "buy-sol-with-usdc" | "sell-sol-for-usdc";

export type TradeRequest =
  | {
      direction: "buy-sol-with-usdc";
      usdcAtomicAmount: bigint;
      slippageBps: number;
    }
  | {
      direction: "sell-sol-for-usdc";
      usdcAtomicAmount: bigint;
      slippageBps: number;
    };

export type TradeQuote = {
  direction: TradeDirection;
  inputMint: string;
  outputMint: string;
  inputAmountAtomic: bigint;
  outputAmountAtomic: bigint;
  rawQuote: unknown;
};

export type ExecutedTrade = {
  direction: TradeDirection;
  signature: string;
  explorerUrl: string;
  inputAmountAtomic: bigint;
  outputAmountAtomic: bigint;
};

export type SwapMode = "ExactIn" | "ExactOut";

export type SwapRequest = {
  signer: Keypair;
  inputMint: string;
  outputMint: string;
  amountAtomic: bigint;
  swapMode: SwapMode;
  slippageBps: number;
};

export type PreparedSwap = {
  request: SwapRequest;
  inputAmountAtomic: bigint;
  outputAmountAtomic: bigint;
  rawQuote: JupiterQuoteResponse;
};

export type ExecutedSwap = {
  signature: string;
  explorerUrl: string;
  inputAmountAtomic: bigint;
  outputAmountAtomic: bigint;
};

export type JupiterQuoteResponse = {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  swapMode: "ExactIn" | "ExactOut";
  otherAmountThreshold: string;
  routePlan: unknown[];
};
