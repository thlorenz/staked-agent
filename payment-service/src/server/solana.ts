import fs from "node:fs";
import path from "node:path";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction
} from "@solana/web3.js";

export function loadKeypairFromFile(filePath: string): Keypair {
  const resolvedPath = path.resolve(filePath);
  let fileContents: string;

  try {
    fileContents = fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(
      `Unable to read sender keypair file at ${resolvedPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    throw new Error(
      `Sender keypair file is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Sender keypair JSON must be an array of integers");
  }

  if (
    parsed.some(
      (value) => !Number.isInteger(value) || value < 0 || value > 255
    )
  ) {
    throw new Error(
      "Sender keypair JSON must contain only integer byte values between 0 and 255"
    );
  }

  try {
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch (error) {
    throw new Error(
      `Unable to construct Keypair from sender keypair file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function createSolanaConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, "confirmed");
}

export function parsePublicKey(value: string, fieldName: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${fieldName}`);
  }
}

export function deserializeTransaction(
  transactionBase64: string
): Transaction | VersionedTransaction {
  const buffer = Buffer.from(transactionBase64, "base64");

  try {
    return VersionedTransaction.deserialize(buffer);
  } catch {
    try {
      return Transaction.from(buffer);
    } catch {
      throw new Error("Unable to deserialize transactionBase64");
    }
  }
}

export async function signAndSendBuiltTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
  signer: Keypair
): Promise<string> {
  if (transaction instanceof VersionedTransaction) {
    transaction.sign([signer]);
  } else {
    transaction.partialSign(signer);
  }

  const signature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

export function assertRequiredSigner(
  requiredSigners: string[] | undefined,
  signerPublicKey: string
): void {
  if (!requiredSigners || requiredSigners.length === 0) {
    return;
  }

  if (!requiredSigners.includes(signerPublicKey)) {
    throw new Error("Sender is not listed in requiredSigners");
  }
}
