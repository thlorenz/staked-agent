import type { Keypair } from "@solana/web3.js";
import type { SwapMode } from "../types";

export type SwapQuoteRequest = {
  inputMint: string;
  outputMint: string;
  amountAtomic: bigint;
  swapMode: SwapMode;
  slippageBps: number;
};

export type SwapQuote = {
  request: SwapQuoteRequest;
  inputAmountAtomic: bigint;
  outputAmountAtomic: bigint;
  // Provider-specific opaque payload re-used by executeSwap().
  rawQuote: unknown;
};

export type SwapExecutionRequest = {
  signer: Keypair;
  quote: SwapQuote;
};

export type ExecutedSwap = {
  signature: string;
  explorerUrl: string;
  inputAmountAtomic: bigint;
  outputAmountAtomic: bigint;
};

export interface SwapProvider {
  readonly name: "jupiter" | "whirlpool";
  getQuote(request: SwapQuoteRequest): Promise<SwapQuote>;
  executeSwap(request: SwapExecutionRequest): Promise<ExecutedSwap>;
}
