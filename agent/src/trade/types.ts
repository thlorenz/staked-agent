export type TradeDirection = "buy-sol-with-usdc" | "sell-sol-for-usdc";

export type TradeRequest =
  | {
      direction: "buy-sol-with-usdc";
      solAtomicAmount: bigint;
      slippageBps: number;
    }
  | {
      direction: "sell-sol-for-usdc";
      solAtomicAmount: bigint;
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
  inputMint: string;
  outputMint: string;
  amountAtomic: bigint;
  swapMode: SwapMode;
  slippageBps: number;
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
