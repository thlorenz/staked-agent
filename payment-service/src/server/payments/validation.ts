import { parsePublicKey } from "@/src/server/solana";

import type {
  NormalizedPaymentRequest,
  PaymentRequestInput,
} from "@/src/server/payments/types";
import type { PrivacyMode } from "@/src/server/types";

export function normalizePaymentRequest(
  input: PaymentRequestInput,
  defaults: {
    defaultFrom?: string;
    defaultMint: string;
    defaultCluster: string;
    defaultValidator?: string;
    defaultPrivacy?: PrivacyMode;
  },
): NormalizedPaymentRequest {
  if (typeof input.to !== "string" || input.to.trim() === "") {
    throw new Error("`to` must be a non-empty string");
  }

  parsePublicKey(input.to, "to");

  if (
    typeof input.amount !== "number" ||
    !Number.isFinite(input.amount) ||
    !Number.isInteger(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error("`amount` must be a positive integer");
  }

  const from = input.from?.trim() || defaults.defaultFrom;
  if (!from) {
    throw new Error("Missing from");
  }

  parsePublicKey(from, "from");

  if (
    input.privacy !== undefined &&
    input.privacy !== "public" &&
    input.privacy !== "private"
  ) {
    throw new Error("`privacy` must be either `public` or `private`");
  }

  return {
    from,
    to: input.to.trim(),
    amount: input.amount,
    mint: input.mint?.trim() || defaults.defaultMint,
    cluster: input.cluster?.trim() || defaults.defaultCluster,
    privacy: input.privacy ?? defaults.defaultPrivacy ?? "public",
    validator: input.validator?.trim() || defaults.defaultValidator,
    memo: input.memo,
    fromBalance: input.fromBalance ?? "base",
    toBalance: input.toBalance ?? "base",
    teeAuthToken: input.teeAuthToken,
  };
}
