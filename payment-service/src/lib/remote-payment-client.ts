import { Buffer } from "buffer";

import {
  Connection,
  Transaction,
  VersionedTransaction
} from "@solana/web3.js";

import type { RemoteBuildResponse } from "@/src/server/types";

type ErrorPayload = {
  error?: string;
  details?: string;
};

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    return payload.details || payload.error || `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}

export async function fetchRemoteTeeChallenge(
  publicKey: string
): Promise<string> {
  const response = await fetch("/api/remote/tee/challenge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ publicKey })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { challenge: string };
  return payload.challenge;
}

export async function completeRemoteTeeAuth(payload: {
  publicKey: string;
  challenge: string;
  signature: string;
}): Promise<string> {
  const response = await fetch("/api/remote/tee/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { token: string };
  return body.token;
}

export async function buildRemotePaymentRequest(payload: {
  from: string;
  to: string;
  amount: number;
  memo?: string;
  privacy: "public" | "private";
  teeAuthToken?: string;
}): Promise<RemoteBuildResponse> {
  const response = await fetch("/api/remote/build-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as RemoteBuildResponse;
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

export function deserializeBuiltTransaction(
  transactionBase64: string
): Transaction | VersionedTransaction {
  const bytes = base64ToBytes(transactionBase64);

  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    try {
      return Transaction.from(Buffer.from(bytes));
    } catch {
      throw new Error("Unable to deserialize transactionBase64");
    }
  }
}

export async function submitSignedTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction
): Promise<string> {
  const signature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}
