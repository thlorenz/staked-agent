import type { AppConfig } from "@/src/server/config";
import { getTeeAuthToken } from "@/src/server/magicblock";
import { buildMagicBlockPayment } from "@/src/server/payments/build-transfer";
import { normalizePaymentRequest } from "@/src/server/payments/validation";
import type { PaymentRequestInput } from "@/src/server/payments/types";
import {
  assertRequiredSigner,
  createSolanaConnection,
  deserializeTransaction,
  loadKeypairFromFile,
  signAndSendBuiltTransaction
} from "@/src/server/solana";
import type { PayResponse } from "@/src/server/types";

export async function performCustodialPayment(
  config: AppConfig,
  input: PaymentRequestInput
): Promise<PayResponse> {
  const sender = loadKeypairFromFile(config.senderKeypairPath);
  const senderPublicKey = sender.publicKey.toBase58();
  const connection = createSolanaConnection(config.solanaRpcUrl);

  const normalized = normalizePaymentRequest(input, {
    defaultFrom: senderPublicKey,
    defaultMint: config.usdcMint,
    defaultCluster: config.cluster,
    defaultValidator: config.validator,
    defaultPrivacy: "private"
  });

  if (normalized.privacy === "private") {
    await getTeeAuthToken(config, sender);
  }

  const build = await buildMagicBlockPayment(config, normalized);
  assertRequiredSigner(build.requiredSigners, senderPublicKey);

  const transaction = deserializeTransaction(build.transactionBase64);
  const signature = await signAndSendBuiltTransaction(
    connection,
    transaction,
    sender
  );

  return {
    ok: true,
    signature,
    sender: senderPublicKey,
    destination: normalized.to,
    amount: normalized.amount,
    privacy: normalized.privacy,
    build
  };
}
