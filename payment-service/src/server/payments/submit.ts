import type { AppConfig } from "@/src/server/config";
import {
  createSolanaConnection,
  deserializeTransaction,
} from "@/src/server/solana";
import type { RemoteSubmitResponse } from "@/src/server/types";

export async function submitSignedTransactionBase64(
  config: AppConfig,
  signedTransactionBase64: string,
): Promise<RemoteSubmitResponse> {
  const connection = createSolanaConnection(config.solanaRpcUrl);
  const transaction = deserializeTransaction(signedTransactionBase64);
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
  );
  await connection.confirmTransaction(signature, "confirmed");

  return {
    ok: true,
    signature,
  };
}
