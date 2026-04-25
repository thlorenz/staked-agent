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

export type ExecutedTrade = {
  direction: TradeDirection;
  signature: string;
  explorerUrl: string;
};
