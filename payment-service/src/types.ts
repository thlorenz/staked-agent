export type PrivacyMode = "public" | "private";

export type PayRequestBody = {
  to: string;
  amount: number;
  mint?: string;
  cluster?: string;
  privacy?: PrivacyMode;
  validator?: string;
  memo?: string;
};

export type HealthResponse = {
  ok: true;
  service: "payment-service";
};

export type BalanceResponse = {
  ok: true;
  wallet: string;
  solBalanceLamports: number;
};

export type ErrorResponse = {
  ok: false;
  error: string;
  details?: string;
};

export type BuildTransferParams = {
  owner: string;
  destination: string;
  amount: number;
  cluster: string;
  mint: string;
  privacy: PrivacyMode;
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

export type PayResponse = {
  ok: true;
  signature: string;
  sender: string;
  destination: string;
  amount: number;
  privacy: PrivacyMode;
  build: BuiltTransferResponse;
};
