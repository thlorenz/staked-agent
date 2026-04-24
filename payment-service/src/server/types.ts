export type PrivacyMode = "public" | "private";

export type HealthResponse = {
  ok: true;
  service: "payment-service";
};

export type ErrorResponse = {
  ok: false;
  error: string;
  details?: string;
};

export type BuildTransferParams = {
  from: string;
  to: string;
  amount: number;
  cluster: string;
  mint: string;
  visibility: PrivacyMode;
  fromBalance: "base" | "ephemeral";
  toBalance: "base" | "ephemeral";
  validator?: string;
  memo?: string;
};

export type BuiltTransferResponse = {
  kind: string;
  transactionBase64: string;
  requiredSigners?: string[];
  sendTo?: string;
  recentBlockhash?: string;
  lastValidBlockHeight?: number;
  instructionCount?: number;
  validator?: string;
};

export type BuiltInitializeMintResponse = BuiltTransferResponse & {
  transferQueue?: string;
  rentPda?: string;
};

export type MintInitializationStatusResponse = {
  mint: string;
  validator: string;
  transferQueue: string;
  initialized: boolean;
};

export type PrivateBalanceResponse = {
  address?: string;
  mint?: string;
  ata?: string;
  location?: string;
  balance: string;
};

export type TeeAuthToken = {
  token: string;
};

export type BalanceResponse = {
  ok: true;
  wallet: string;
  solBalanceLamports: number;
};

export type PayResponse = {
  ok: true;
  signature: string;
  sender: string;
  destination: string;
  amount: number;
  privacy: PrivacyMode;
  build: BuiltTransferResponse;
};

export type RemoteBuildResponse = {
  ok: true;
  sender: string;
  destination: string;
  amount: number;
  privacy: PrivacyMode;
  build: BuiltTransferResponse;
};

export type TeeChallengeResponse = {
  ok: true;
  challenge: string;
};

export type RemoteTeeAuthResponse = {
  ok: true;
  token: string;
};

export type PublicStakeSubmitRequest = {
  signedTransactionBase64: string;
  stakerPubkey: string;
  destination: string;
  amount: number;
  privacy: "public";
};

export type RecordedStakePayment = {
  signature: string;
  stakerPubkey: string;
  agentPubkey: string;
  amount: number;
  slot: number;
  blockTime: number | null;
  stakedAt: string;
  status: "confirmed";
};

export type StakerLeaderboardEntry = {
  displayName: string;
  totalAmount: number;
  stakeCount: number;
  firstStakeUnixSeconds: number;
};

export type StakersResponse = {
  ok: true;
  stakers: StakerLeaderboardEntry[];
};

export type RemoteSubmitResponse = {
  ok: true;
  signature: string;
  recordedStake: RecordedStakePayment;
};
