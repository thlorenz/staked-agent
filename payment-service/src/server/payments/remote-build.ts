import type { AppConfig } from "@/src/server/config";
import { buildMagicBlockPayment } from "@/src/server/payments/build-transfer";
import type { PaymentRequestInput } from "@/src/server/payments/types";
import { normalizePaymentRequest } from "@/src/server/payments/validation";
import { assertRequiredSigner } from "@/src/server/solana";
import type { RemoteBuildResponse } from "@/src/server/types";

export async function buildRemotePayment(
  config: AppConfig,
  input: PaymentRequestInput
): Promise<RemoteBuildResponse> {
  const normalized = normalizePaymentRequest(input, {
    defaultMint: config.usdcMint,
    defaultCluster: config.cluster,
    defaultValidator: config.validator,
    defaultPrivacy: "private"
  });

  const build = await buildMagicBlockPayment(config, normalized);
  assertRequiredSigner(build.requiredSigners, normalized.from);

  return {
    ok: true,
    sender: normalized.from,
    destination: normalized.to,
    amount: normalized.amount,
    privacy: normalized.privacy,
    build
  };
}
