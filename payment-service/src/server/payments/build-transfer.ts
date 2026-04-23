import type { AppConfig } from "@/src/server/config";
import {
  buildTransfer,
  maybeVerifyTee
} from "@/src/server/magicblock";
import type { NormalizedPaymentRequest } from "@/src/server/payments/types";
import type { BuiltTransferResponse } from "@/src/server/types";

export async function buildMagicBlockPayment(
  config: AppConfig,
  request: NormalizedPaymentRequest
): Promise<BuiltTransferResponse> {
  if (request.privacy === "private") {
    await maybeVerifyTee(config);
    if (!request.teeAuthToken) {
      // The custodial route mints its own token; remote auth is added later.
    }
  }

  return buildTransfer(config, {
    from: request.from,
    to: request.to,
    amount: request.amount,
    cluster: request.cluster,
    mint: request.mint,
    visibility: request.privacy,
    fromBalance: request.fromBalance,
    toBalance: request.toBalance,
    validator: request.validator,
    memo: request.memo
  });
}
