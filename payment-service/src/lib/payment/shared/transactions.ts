import bs58 from "bs58";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

import {
  deserializeBuiltTransaction,
  submitSignedTransaction,
} from "@/src/lib/payment/shared/api";

export type StakeDebugLogger = (
  label: string,
  payload: Record<string, unknown>,
) => void;

type BuiltTransaction = Transaction | VersionedTransaction;

function getTransactionRecentBlockhash(
  transaction: BuiltTransaction,
): string | null {
  if ("message" in transaction && "recentBlockhash" in transaction.message) {
    const value = (transaction.message as { recentBlockhash?: string })
      .recentBlockhash;
    return typeof value === "string" ? value : null;
  }

  if ("recentBlockhash" in transaction) {
    const value = (transaction as { recentBlockhash?: string }).recentBlockhash;
    return typeof value === "string" ? value : null;
  }

  return null;
}

function getWritableAccountsForRouter(
  transaction: BuiltTransaction,
): string[] | null {
  const writableAccounts = new Set<string>();

  if ("instructions" in transaction) {
    if (transaction.feePayer) {
      writableAccounts.add(transaction.feePayer.toBase58());
    }

    for (const instruction of transaction.instructions) {
      for (const key of instruction.keys) {
        if (key.isWritable) {
          writableAccounts.add(key.pubkey.toBase58());
        }
      }
    }

    return Array.from(writableAccounts);
  }

  if ("message" in transaction) {
    const message = transaction.message as {
      staticAccountKeys?: { toBase58(): string }[];
      isAccountWritable?: (index: number) => boolean;
    };

    if (
      Array.isArray(message.staticAccountKeys) &&
      typeof message.isAccountWritable === "function"
    ) {
      message.staticAccountKeys.forEach((key, index) => {
        if (message.isAccountWritable!(index)) {
          writableAccounts.add(key.toBase58());
        }
      });

      return Array.from(writableAccounts);
    }
  }

  return null;
}

function setTransactionRecentBlockhash(
  transaction: BuiltTransaction,
  blockhash: string,
): void {
  if ("message" in transaction && "recentBlockhash" in transaction.message) {
    (transaction.message as { recentBlockhash: string }).recentBlockhash =
      blockhash;
    return;
  }

  if ("recentBlockhash" in transaction) {
    (transaction as { recentBlockhash: string }).recentBlockhash = blockhash;
  }
}

async function getRouterBlockhashForTransaction(
  routerConnection: Connection,
  transaction: BuiltTransaction,
  logDebug?: StakeDebugLogger,
): Promise<{ blockhash: string; lastValidBlockHeight: number } | null> {
  const writableAccounts = getWritableAccountsForRouter(transaction);
  if (!writableAccounts || writableAccounts.length === 0) {
    return null;
  }

  logDebug?.("router-writable-accounts", {
    endpoint: routerConnection.rpcEndpoint,
    writableAccounts,
  });

  const response = await fetch(routerConnection.rpcEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBlockhashForAccounts",
      params: [writableAccounts],
    }),
  });

  const payload = (await response.json()) as {
    result?: { blockhash?: string; lastValidBlockHeight?: number };
  };

  if (
    !payload.result?.blockhash ||
    typeof payload.result.lastValidBlockHeight !== "number"
  ) {
    return null;
  }

  return payload.result as { blockhash: string; lastValidBlockHeight: number };
}

function isExpiredBlockhashError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Blockhash not found");
}

export function getExplorerUrl(signature: string, cluster: string): string {
  const url = new URL(`https://explorer.solana.com/tx/${signature}`);
  if (cluster !== "mainnet-beta") {
    url.searchParams.set("cluster", cluster);
  }
  return url.toString();
}

async function signAndSubmitBuiltTransaction(options: {
  connection: Connection;
  transactionBase64: string;
  submitConnection?: Connection;
  signTransaction: WalletContextState["signTransaction"];
  setStatus: (value: string | null) => void;
  logDebug?: StakeDebugLogger;
}): Promise<string> {
  const {
    connection,
    submitConnection,
    signTransaction,
    setStatus,
    transactionBase64,
    logDebug,
  } = options;

  if (!signTransaction) {
    throw new Error("This wallet does not support transaction signing.");
  }

  const activeConnection = submitConnection ?? connection;
  setStatus("Signing transaction with wallet...");
  const transaction = deserializeBuiltTransaction(transactionBase64);
  const previousBlockhash = getTransactionRecentBlockhash(transaction);
  const routerBlockhash = activeConnection.rpcEndpoint.includes(
    "devnet-router.magicblock.app",
  )
    ? await getRouterBlockhashForTransaction(
        activeConnection,
        transaction,
        logDebug,
      )
    : null;
  const latestBeforeSign =
    routerBlockhash ?? (await activeConnection.getLatestBlockhash("confirmed"));
  setTransactionRecentBlockhash(transaction, latestBeforeSign.blockhash);
  if ("lastValidBlockHeight" in transaction) {
    (
      transaction as {
        lastValidBlockHeight?: number;
      }
    ).lastValidBlockHeight = latestBeforeSign.lastValidBlockHeight;
  }
  logDebug?.("refresh-blockhash-before-sign", {
    endpoint: activeConnection.rpcEndpoint,
    previousBlockhash,
    nextBlockhash: latestBeforeSign.blockhash,
    nextLastValidBlockHeight: latestBeforeSign.lastValidBlockHeight,
    usedRouterAccountBlockhash: Boolean(routerBlockhash),
  });
  const signedTransaction = await signTransaction(transaction);

  let signedSignature: string | null = null;
  try {
    if ("signatures" in signedTransaction) {
      const maybeVersioned = signedTransaction as {
        signatures?: Uint8Array[];
      };
      const firstSig = maybeVersioned.signatures?.[0];
      signedSignature = firstSig ? bs58.encode(firstSig) : null;
    } else {
      const maybeLegacy = signedTransaction as {
        signature?: Uint8Array | null;
      };
      signedSignature = maybeLegacy.signature
        ? bs58.encode(maybeLegacy.signature)
        : null;
    }
  } catch {
    signedSignature = null;
  }

  logDebug?.("signed-transaction", {
    endpoint: activeConnection.rpcEndpoint,
    signature: signedSignature,
    bytes: signedTransaction.serialize().length,
  });

  setStatus("Submitting signed transaction...");
  try {
    return await submitSignedTransaction(activeConnection, signedTransaction);
  } catch (error) {
    let blockHeight: number | null = null;
    let latestBlockhash: {
      blockhash: string;
      lastValidBlockHeight: number;
    } | null = null;
    try {
      blockHeight = await activeConnection.getBlockHeight("confirmed");
    } catch {
      blockHeight = null;
    }
    try {
      latestBlockhash = await activeConnection.getLatestBlockhash("confirmed");
    } catch {
      latestBlockhash = null;
    }

    logDebug?.("submit-error", {
      endpoint: activeConnection.rpcEndpoint,
      currentBlockHeight: blockHeight,
      latestBlockhash,
      signature: signedSignature,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function executeBuiltTransactionWithRetry<T>(options: {
  build: () => Promise<T>;
  getTransactionBase64: (built: T) => string;
  getSubmitConnection?: (built: T) => Connection;
  expiredStatus: string;
  onBuilt?: (built: T) => void;
  maxAttempts?: number;
  connection: Connection;
  signTransaction: WalletContextState["signTransaction"];
  setStatus: (value: string | null) => void;
  logDebug?: StakeDebugLogger;
}): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    const built = await options.build();
    options.onBuilt?.(built);

    try {
      return await signAndSubmitBuiltTransaction({
        connection: options.connection,
        submitConnection: options.getSubmitConnection?.(built),
        signTransaction: options.signTransaction,
        setStatus: options.setStatus,
        transactionBase64: options.getTransactionBase64(built),
        logDebug: options.logDebug,
      });
    } catch (error) {
      attempt += 1;
      options.logDebug?.("rebuilt-transaction-failed", {
        attempt,
        maxAttempts,
        expired: isExpiredBlockhashError(error),
        error: error instanceof Error ? error.message : String(error),
      });
      if (!isExpiredBlockhashError(error) || attempt >= maxAttempts) {
        throw error;
      }

      options.setStatus(options.expiredStatus);
    }
  }

  throw new Error(
    "Failed to submit transaction after repeated blockhash retries",
  );
}
