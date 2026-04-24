import type { AppConfig } from "@/src/server/config";
import { buildPrivatePayment } from "@/src/server/payments/private-payment/build";
import { buildPublicPayment } from "@/src/server/payments/public-payment/build";
import type { NormalizedPaymentRequest } from "@/src/server/payments/types";
import type { BuiltTransferResponse } from "@/src/server/types";

export async function buildPayment(
  config: AppConfig,
  request: NormalizedPaymentRequest,
): Promise<BuiltTransferResponse> {
  if (request.privacy === "private") {
    return buildPrivatePayment(config, request);
  }

  return buildPublicPayment(config, request);
}
