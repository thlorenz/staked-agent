import type { PrivacyMode } from "@/src/server/types";

export type PaymentRequestInput = {
  from?: string;
  to: string;
  amount: number;
  mint?: string;
  cluster?: string;
  privacy?: PrivacyMode;
  validator?: string;
  memo?: string;
  fromBalance?: "base" | "ephemeral";
  toBalance?: "base" | "ephemeral";
  teeAuthToken?: string;
};

export type NormalizedPaymentRequest = {
  from: string;
  to: string;
  amount: number;
  mint: string;
  cluster: string;
  privacy: PrivacyMode;
  validator?: string;
  memo?: string;
  fromBalance: "base" | "ephemeral";
  toBalance: "base" | "ephemeral";
  teeAuthToken?: string;
};
