import bs58 from "bs58";

import type { AppConfig } from "@/src/server/config";
import { ensureStakePaymentsSchema } from "@/src/db/schema";
import { getDatabase } from "@/src/db/client";
import {
  insertStakePayment,
  type StakePaymentRecord,
} from "@/src/db/stake-payments";
import {
  createSolanaConnection,
  deserializeTransaction,
} from "@/src/server/solana";
import {
  SendTransactionError,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
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

function getTransactionSignature(
  transaction: Transaction | VersionedTransaction,
): string {
  if (transaction instanceof VersionedTransaction) {
    const signature = transaction.signatures[0];
    if (!signature) {
      throw new Error("Signed versioned transaction is missing a signature");
    }

    return bs58.encode(signature);
  }

  if (!transaction.signature) {
    throw new Error("Signed transaction is missing a signature");
  }

  return bs58.encode(transaction.signature);
}

export async function submitSignedTransactionBase64(
  config: AppConfig,
  input: PublicStakeSubmitRequest,
): Promise<RemoteSubmitResponse> {
  const connection = createSolanaConnection(config.solanaRpcUrl);
  const transaction = deserializeTransaction(input.signedTransactionBase64);
  const signature = getTransactionSignature(transaction);

  try {
    await connection.sendRawTransaction(transaction.serialize());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof SendTransactionError) {
      const logs = await error.getLogs(connection).catch(() => error.logs);
      if (
        message.includes("already been processed") ||
        logs?.some((log) => log.includes("already been processed"))
      ) {
        // Treat duplicate preflight results as success and continue to confirmation.
      } else {
        throw new Error(
          `Transaction simulation failed: ${
            logs?.length ? logs.join("\n") : error.message
          }`,
        );
      }
    } else if (!message.includes("already been processed")) {
      throw error;
    }
  }

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
