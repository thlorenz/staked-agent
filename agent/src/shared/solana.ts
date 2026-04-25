import fs from "node:fs";
import path from "node:path";

import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";

export function loadKeypairFromFile(filePath: string): Keypair {
  const resolvedPath = path.resolve(filePath);
  let fileContents: string;

  try {
    fileContents = fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(
      `Unable to read keypair file at ${resolvedPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    throw new Error(
      `Keypair file is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Keypair JSON must be an array of integers");
  }

  if (
    parsed.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    throw new Error(
      "Keypair JSON must contain only integer byte values between 0 and 255",
    );
  }

  try {
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch (error) {
    throw new Error(
      `Unable to construct Keypair from file: ${
        error instanceof Error ? error.message : String(error)
      }`,
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

export function deserializeVersionedTransaction(
  transactionBase64: string,
): VersionedTransaction {
  try {
    return VersionedTransaction.deserialize(
      Buffer.from(transactionBase64, "base64"),
    );
  } catch {
    throw new Error("Unable to deserialize transactionBase64");
  }
}

export function buildExplorerTxUrl(
  signature: string,
  cluster: "devnet" | "mainnet",
): string {
  if (cluster === "devnet") {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }
  return `https://explorer.solana.com/tx/${signature}`;
}
