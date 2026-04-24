import type { AppConfig } from "@/src/server/config";
import { ensureStakePaymentsSchema } from "@/src/server/db/schema";
import { getDatabase } from "@/src/server/db/client";
import {
  insertStakePayment,
  type StakePaymentRecord,
} from "@/src/server/db/stake-payments";
import {
  createSolanaConnection,
  deserializeTransaction,
} from "@/src/server/solana";
import type {
  PublicStakeSubmitRequest,
  RecordedStakePayment,
  RemoteSubmitResponse,
} from "@/src/server/types";
import { verifyConfirmedPublicStakePayment } from "@/src/server/payments/public-payment/verify";

function toRecordedStakePayment(
  record: StakePaymentRecord,
): RecordedStakePayment {
  return {
    signature: record.signature,
    stakerPubkey: record.stakerPubkey,
    agentPubkey: record.agentPubkey,
    amount: record.amount,
    slot: record.slot,
    blockTime: record.blockTime,
    stakedAt: record.stakedAt,
    status: record.status,
  };
}

export async function submitSignedTransactionBase64(
  config: AppConfig,
  input: PublicStakeSubmitRequest,
): Promise<RemoteSubmitResponse> {
  const connection = createSolanaConnection(config.solanaRpcUrl);
  const transaction = deserializeTransaction(input.signedTransactionBase64);
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
  );
  await connection.confirmTransaction(signature, "confirmed");

  const db = getDatabase(config.sqliteDbPath);
  ensureStakePaymentsSchema(db);
  const verified = await verifyConfirmedPublicStakePayment({
    connection,
    config,
    signature,
    expected: {
      stakerPubkey: input.stakerPubkey,
      destination: input.destination,
      amount: input.amount,
    },
  });
  const persisted = insertStakePayment(db, verified);

  return {
    ok: true,
    signature,
    recordedStake: toRecordedStakePayment(persisted),
  };
}
