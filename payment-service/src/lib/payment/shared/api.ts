import { Buffer } from "buffer";

import bs58 from "bs58";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

import type {
  PublicStakeSubmitRequest,
  RemoteSubmitResponse,
} from "@/src/server/types";
import type {
  BuiltInitializeMintResponse,
  MintInitializationStatusResponse,
  PrivateBalanceResponse,
  RemoteBuildResponse,
} from "@/src/server/types";

type ErrorPayload = {
  error?: string;
  details?: string;
};

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    return (
      payload.details ||
      payload.error ||
      `Request failed with ${response.status}`
    );
  } catch {
    return `Request failed with ${response.status}`;
  }
}

export async function fetchRemoteTeeChallenge(
  publicKey: string,
): Promise<string> {
  const response = await fetch("/api/remote/tee/challenge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicKey }),
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
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { token: string };
  return body.token;
}

export async function fetchPrivateMintStatus(payload?: {
  mint?: string;
  cluster?: string;
  validator?: string;
}): Promise<MintInitializationStatusResponse> {
  const response = await fetch("/api/remote/private/mint-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload ?? {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as MintInitializationStatusResponse;
}

export async function buildInitializeMintTransaction(payload: {
  owner: string;
  payer?: string;
  mint?: string;
  cluster?: string;
  validator?: string;
}): Promise<BuiltInitializeMintResponse> {
  const response = await fetch("/api/remote/private/initialize-mint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as BuiltInitializeMintResponse;
}

export async function buildPrivateDepositTransaction(payload: {
  owner: string;
  amount: number;
  mint?: string;
  cluster?: string;
  validator?: string;
}): Promise<BuiltInitializeMintResponse> {
  const response = await fetch("/api/remote/private/deposit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as BuiltInitializeMintResponse;
}

export async function fetchPrivateBalance(payload: {
  address: string;
  authToken: string;
  mint?: string;
  cluster?: string;
  validator?: string;
}): Promise<PrivateBalanceResponse> {
  const response = await fetch("/api/remote/private/balance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as PrivateBalanceResponse;
}

export async function buildRemotePaymentRequest(payload: {
  from: string;
  to: string;
  amount: number;
  privacy: "public" | "private";
  fromBalance?: "base" | "ephemeral";
  toBalance?: "base" | "ephemeral";
  validator?: string;
  teeAuthToken?: string;
}): Promise<RemoteBuildResponse> {
  const response = await fetch("/api/remote/build-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as RemoteBuildResponse;
}

export async function submitRemotePublicStake(
  payload: PublicStakeSubmitRequest,
): Promise<RemoteSubmitResponse> {
  const response = await fetch("/api/remote/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as RemoteSubmitResponse;
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

export function deserializeBuiltTransaction(
  transactionBase64: string,
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

export function serializeSignedTransactionToBase64(
  transaction: Transaction | VersionedTransaction,
): string {
  return Buffer.from(transaction.serialize()).toString("base64");
}

function getSignedTransactionSignature(
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

export async function submitSignedTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
): Promise<string> {
  const serialized = transaction.serialize();
  const signature = getSignedTransactionSignature(transaction);
  const useRouter = connection.rpcEndpoint.includes("magicblock.app");

  try {
    await connection.sendRawTransaction(serialized, {
      preflightCommitment: "confirmed",
      skipPreflight: useRouter,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already been processed")) {
      throw error;
    }
  }

  const confirmation = await connection.confirmTransaction(
    signature,
    "confirmed",
  );
  if (confirmation.value.err) {
    throw new Error(
      `Transaction failed during confirmation: ${JSON.stringify(confirmation.value.err)}`,
    );
  }

  const statuses = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });
  const status = statuses.value[0];
  if (status?.err) {
    throw new Error(
      `Transaction failed with status: ${JSON.stringify(status.err)}`,
    );
  }

  const transactionDetails = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  if (transactionDetails?.meta?.err) {
    throw new Error(
      `Transaction failed with meta.err: ${JSON.stringify(transactionDetails.meta.err)}`,
    );
  }

  return signature;
}
