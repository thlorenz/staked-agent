export type PrivacyMode = "public" | "private";

export interface PayRequestBody {
  to: string;
  amount: number;
  mint?: string;
  cluster?: string;
  privacy?: PrivacyMode;
  validator?: string;
  memo?: string;
}

export interface HealthResponse {
  ok: true;
  service: "payment-service";
}

export interface BalanceResponse {
  ok: true;
  wallet: string;
  solBalanceLamports: number;
}

export interface ErrorResponse {
  ok: false;
  error: string;
  details?: string;
}
