export type FundRequest = {
  requestedUsdcAtomicAmount: bigint;
  slippageBps: number;
};

export type FundResult = {
  requestedUsdcAtomicAmount: bigint;
  purchasedUsdcAtomicAmount: bigint;
  sourceWallet: string;
  destinationWallet: string;
  operatorUsdcAta: string;
  agentUsdcAta: string;
  purchaseSignature: string;
  transferSignature: string;
  purchaseExplorerUrl: string;
  transferExplorerUrl: string;
};
