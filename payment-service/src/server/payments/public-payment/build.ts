import type { AppConfig } from "@/src/server/config";
import { buildTransfer } from "@/src/server/magicblock";
import type { NormalizedPaymentRequest } from "@/src/server/payments/types";
import type { BuiltTransferResponse } from "@/src/server/types";

export async function buildPublicPayment(
  config: AppConfig,
  request: NormalizedPaymentRequest,
): Promise<BuiltTransferResponse> {
  return buildTransfer(config, {
    from: request.from,
    to: request.to,
    amount: request.amount,
    cluster: request.cluster,
    mint: request.mint,
    visibility: "public",
    fromBalance: request.fromBalance,
    toBalance: request.toBalance,
    validator: request.validator,
    memo: request.memo,
  });
}
