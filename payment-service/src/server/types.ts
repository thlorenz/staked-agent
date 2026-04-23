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
