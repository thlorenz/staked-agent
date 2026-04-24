"use client";
import bs58 from "bs58";
import { FormEvent, useState } from "react";

import { Connection, PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import {
  buildInitializeMintTransaction,
  buildPrivateDepositTransaction,
  buildRemotePaymentRequest,
  completeRemoteTeeAuth,
  deserializeBuiltTransaction,
  fetchPrivateBalance,
  fetchPrivateMintStatus,
  fetchRemoteTeeChallenge,
  submitSignedTransaction,
} from "@/src/lib/remote-payment-client";
import { getClientConfig } from "@/src/lib/client-config";
import type { PrivacyMode } from "@/src/server/types";

type PaymentFormProps = { agentDestination: string };

function parseChallengeBytes(challenge: string): Uint8Array {
  return new TextEncoder().encode(challenge);
}

function logStakeDebug(label: string, payload: Record<string, unknown>): void {
  console.info(`[stake-debug] ${label}`, payload);
  try {
    console.info(`[stake-debug-json] ${label} ${JSON.stringify(payload)}`);
  } catch {
    // Ignore JSON serialization failures in debug-only logging.
  }
}

function getTransactionRecentBlockhash(
  transaction: ReturnType<typeof deserializeBuiltTransaction>,
): string | null {
  if ("message" in transaction && "recentBlockhash" in transaction.message) {
    const value = (transaction.message as { recentBlockhash?: string }).recentBlockhash;
    return typeof value === "string" ? value : null;
  }

  if ("recentBlockhash" in transaction) {
    const value = (transaction as { recentBlockhash?: string }).recentBlockhash;
    return typeof value === "string" ? value : null;
  }

  return null;
}

function getWritableAccountsForRouter(
  transaction: ReturnType<typeof deserializeBuiltTransaction>,
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
  transaction: ReturnType<typeof deserializeBuiltTransaction>,
  blockhash: string,
): void {
  if ("message" in transaction && "recentBlockhash" in transaction.message) {
    (transaction.message as { recentBlockhash: string }).recentBlockhash = blockhash;
    return;
  }

  if ("recentBlockhash" in transaction) {
    (transaction as { recentBlockhash: string }).recentBlockhash = blockhash;
  }
}

async function getRouterBlockhashForTransaction(
  routerConnection: Connection,
  transaction: ReturnType<typeof deserializeBuiltTransaction>,
): Promise<{ blockhash: string; lastValidBlockHeight: number } | null> {
  const writableAccounts = getWritableAccountsForRouter(transaction);
  if (!writableAccounts || writableAccounts.length === 0) {
    return null;
  }

  logStakeDebug("router-writable-accounts", {
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

function getExplorerUrl(signature: string, cluster: string): string {
  const url = new URL(`https://explorer.solana.com/tx/${signature}`);
  if (cluster !== "mainnet-beta") {
    url.searchParams.set("cluster", cluster);
  }
  return url.toString();
}

export function PaymentForm({ agentDestination }: PaymentFormProps) {
  const { connection } = useConnection();
  const { publicKey, signMessage, signTransaction } = useWallet();
  const [amount, setAmount] = useState("1");
  const [status, setStatus] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [buildSummary, setBuildSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const privacy: PrivacyMode = "private";
  const { cluster, mint, teeUrl, teeWsUrl, routerUrl, routerWsUrl } =
    getClientConfig();
  const routerConnection = new Connection(routerUrl, {
    commitment: "confirmed",
    wsEndpoint: routerWsUrl,
  });

  function isExpiredBlockhashError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Blockhash not found");
  }

  async function executeBuiltTransactionWithRetry<T>(
    options: {
      build: () => Promise<T>;
      getTransactionBase64: (built: T) => string;
      getSubmitConnection?: (built: T) => Connection;
      expiredStatus: string;
      onBuilt?: (built: T) => void;
      maxAttempts?: number;
    },
  ): Promise<string> {
    const maxAttempts = options.maxAttempts ?? 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const built = await options.build();
      options.onBuilt?.(built);

      try {
        return await signAndSubmitBuiltTransaction(
          options.getTransactionBase64(built),
          options.getSubmitConnection?.(built),
        );
      } catch (error) {
        attempt += 1;
        logStakeDebug("rebuilt-transaction-failed", {
          attempt,
          maxAttempts,
          expired: isExpiredBlockhashError(error),
          error: error instanceof Error ? error.message : String(error),
        });
        if (!isExpiredBlockhashError(error) || attempt >= maxAttempts) {
          throw error;
        }

        setStatus(options.expiredStatus);
      }
    }

    throw new Error("Failed to submit transaction after repeated blockhash retries");
  }

  async function signAndSubmitBuiltTransaction(
    transactionBase64: string,
    submitConnection?: Connection,
  ): Promise<string> {
    const activeConnection = submitConnection ?? connection;
    setStatus("Signing transaction with wallet...");
    const transaction = deserializeBuiltTransaction(transactionBase64);
    const previousBlockhash = getTransactionRecentBlockhash(transaction);
    const routerBlockhash = activeConnection.rpcEndpoint.includes(
      "devnet-router.magicblock.app",
    )
      ? await getRouterBlockhashForTransaction(activeConnection, transaction)
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
    logStakeDebug("refresh-blockhash-before-sign", {
      endpoint: activeConnection.rpcEndpoint,
      previousBlockhash,
      nextBlockhash: latestBeforeSign.blockhash,
      nextLastValidBlockHeight: latestBeforeSign.lastValidBlockHeight,
      usedRouterAccountBlockhash: Boolean(routerBlockhash),
    });
    const signedTransaction = await signTransaction!(transaction);

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

    logStakeDebug("signed-transaction", {
      endpoint: activeConnection.rpcEndpoint,
      signature: signedSignature,
      bytes: signedTransaction.serialize().length,
    });

    setStatus("Submitting signed transaction...");
    try {
      return await submitSignedTransaction(activeConnection, signedTransaction);
    } catch (error) {
      let blockHeight: number | null = null;
      let latestBlockhash: { blockhash: string; lastValidBlockHeight: number } | null =
        null;
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

      logStakeDebug("submit-error", {
        endpoint: activeConnection.rpcEndpoint,
        currentBlockHeight: blockHeight,
        latestBlockhash,
        signature: signedSignature,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async function getBaseTokenBalance(owner: string): Promise<bigint> {
    const mintPublicKey = new PublicKey(mint);
    const ownerPublicKey = new PublicKey(owner);
    const response = await connection.getTokenAccountsByOwner(ownerPublicKey, {
      mint: mintPublicKey,
    });

    let total = 0n;
    for (const { pubkey } of response.value) {
      const balance = await connection.getTokenAccountBalance(pubkey);
      total += BigInt(balance.value.amount);
    }

    return total;
  }

  async function ensurePrivateMintInitialized(sender: string): Promise<string> {
    setStatus("Checking private-payment mint initialization...");
    const mintStatus = await fetchPrivateMintStatus({ cluster });

    if (mintStatus.initialized) {
      return mintStatus.validator;
    }

    setStatus("Initializing private-payment mint on MagicBlock...");
    await executeBuiltTransactionWithRetry({
      build: () =>
        buildInitializeMintTransaction({
          owner: sender,
          payer: sender,
          cluster,
          validator: mintStatus.validator,
        }),
      getTransactionBase64: (built) => built.transactionBase64,
      onBuilt: (built) => {
        logStakeDebug("initialize-mint-build", {
          kind: built.kind,
          sendTo: built.sendTo,
          validator: built.validator,
          recentBlockhash: built.recentBlockhash,
          lastValidBlockHeight: built.lastValidBlockHeight,
          instructionCount: built.instructionCount,
        });
      },
      expiredStatus:
        "Initialize-mint transaction expired before submission. Rebuilding and requesting a fresh signature...",
    });

    setStatus("Rechecking private-payment mint initialization...");
    const updatedStatus = await fetchPrivateMintStatus({
      cluster,
      validator: mintStatus.validator,
    });

    if (!updatedStatus.initialized) {
      throw new Error(
        `Private-payment mint is still not initialized for validator ${updatedStatus.validator}`,
      );
    }

    return updatedStatus.validator;
  }

  async function ensurePrivateDeposit(
    sender: string,
    amount: number,
    validator: string,
  ): Promise<void> {
    setStatus("Depositing tokens into private balance...");
    await executeBuiltTransactionWithRetry({
      build: () =>
        buildPrivateDepositTransaction({
          owner: sender,
          amount,
          cluster,
          validator,
        }),
      getTransactionBase64: (built) => built.transactionBase64,
      onBuilt: (built) => {
        logStakeDebug("deposit-build", {
          kind: built.kind,
          sendTo: built.sendTo,
          validator: built.validator,
          recentBlockhash: built.recentBlockhash,
          lastValidBlockHeight: built.lastValidBlockHeight,
          instructionCount: built.instructionCount,
        });
      },
      expiredStatus:
        "Deposit transaction expired before submission. Rebuilding and requesting a fresh signature...",
    });
  }

  async function getPrivateTokenBalance(
    address: string,
    authorization: string,
    validator: string,
  ): Promise<bigint> {
    setStatus("Checking private token balance...");
    const response = await fetchPrivateBalance({
      address,
      authToken: authorization,
      cluster,
      validator,
    });

    logStakeDebug("private-balance", {
      address,
      validator,
      balance: response.balance,
      ata: response.ata,
      location: response.location,
    });

    return BigInt(response.balance);
  }

  async function buildSignAndSubmitTransaction(payload: {
    sender: string;
    amount: number;
    privacy: PrivacyMode;
    fromBalance?: "base" | "ephemeral";
    toBalance?: "base" | "ephemeral";
    teeAuthToken?: string;
    validator?: string;
  }): Promise<string> {
    return executeBuiltTransactionWithRetry({
      build: () =>
        buildRemotePaymentRequest({
          from: payload.sender,
          to: agentDestination,
          amount: payload.amount,
          privacy: payload.privacy,
          fromBalance: payload.fromBalance,
          toBalance: payload.toBalance,
          teeAuthToken: payload.teeAuthToken,
          validator: payload.validator,
        }),
      getTransactionBase64: (remoteBuild) => remoteBuild.build.transactionBase64,
      getSubmitConnection: () => routerConnection,
      onBuilt: (remoteBuild) => {
        setStatus("Building unsigned transaction...");
        setBuildSummary(
          `kind=${remoteBuild.build.kind} privacy=${remoteBuild.privacy} destination=${remoteBuild.destination}`,
        );
        logStakeDebug("transfer-build", {
          kind: remoteBuild.build.kind,
          privacy: remoteBuild.privacy,
          destination: remoteBuild.destination,
          sendTo: remoteBuild.build.sendTo,
          validator: remoteBuild.build.validator,
          recentBlockhash: remoteBuild.build.recentBlockhash,
          lastValidBlockHeight: remoteBuild.build.lastValidBlockHeight,
          instructionCount: remoteBuild.build.instructionCount,
          submitRpc: routerConnection.rpcEndpoint,
        });
      },
      expiredStatus:
        "Built transaction expired before submission. Rebuilding and requesting a fresh signature...",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!publicKey || !signTransaction) {
      setStatus("Connect a wallet that supports transaction signing.");
      return;
    }

    const parsedAmount = Number.parseInt(amount, 10);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setStatus("Amount must be a positive integer.");
      return;
    }

    setIsSubmitting(true);
    setSignature(null);
    setBuildSummary(null);

    try {
      const sender = publicKey.toBase58();
      let validator: string | undefined;
      let teeAuthToken: string | undefined;

      logStakeDebug("submit-start", {
        sender,
        destination: agentDestination,
        amount: parsedAmount,
        privacy,
        cluster,
        baseRpc: connection.rpcEndpoint,
        routerRpc: routerConnection.rpcEndpoint,
      });

      if (privacy === "private") {
        validator = await ensurePrivateMintInitialized(sender);

        if (!signMessage) {
          throw new Error("This wallet does not support private auth signing.");
        }

        setStatus("Requesting MagicBlock private-payment challenge...");
        const challenge = await fetchRemoteTeeChallenge(sender);
        const signedChallenge = await signMessage(
          parseChallengeBytes(challenge),
        );
        teeAuthToken = await completeRemoteTeeAuth({
          publicKey: sender,
          challenge,
          signature: bs58.encode(signedChallenge),
        });
        logStakeDebug("tee-auth", {
          sender,
          validator,
          teeUrl,
          teeWsUrl,
          hasToken: Boolean(teeAuthToken),
        });

        const privateBalance = await getPrivateTokenBalance(
          sender,
          teeAuthToken,
          validator,
        );
        const amountBigInt = BigInt(parsedAmount);

        if (privateBalance < amountBigInt) {
          const depositAmount = amountBigInt - privateBalance;
          const baseBalance = await getBaseTokenBalance(sender);
          if (baseBalance < depositAmount) {
            throw new Error(
              `Insufficient token balance for amount ${parsedAmount}. Wallet has ${baseBalance.toString()} raw base units and ${privateBalance.toString()} raw private units.`,
            );
          }

          await ensurePrivateDeposit(sender, Number(depositAmount), validator);
        }
      } else {
        const baseBalance = await getBaseTokenBalance(sender);
        if (baseBalance < BigInt(parsedAmount)) {
          throw new Error(
            `Insufficient base token balance for amount ${parsedAmount}. Wallet currently has ${baseBalance.toString()} raw units.`,
          );
        }
      }

      const txSignature = await buildSignAndSubmitTransaction({
        sender,
        amount: parsedAmount,
        privacy,
        fromBalance: privacy === "private" ? "ephemeral" : "base",
        toBalance: "base",
        teeAuthToken,
        validator,
      });

      setSignature(txSignature);
      setStatus("Payment submitted and confirmed.");
    } catch (error) {
      logStakeDebug("submit-final-error", {
        error: error instanceof Error ? error.message : String(error),
      });
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">MagicBlock stake flow</p>
        <h1>Staked Agent</h1>
        <p className="lede">
          Connect Phantom and stake to the configured agent using the browser
          signing flow.
        </p>
        <div className="wallet-row">
          <WalletMultiButton />
          <span className="wallet-state">
            {publicKey ? publicKey.toBase58() : "No wallet connected"}
          </span>
        </div>
      </section>

      <section className="panel">
        <form className="payment-form" onSubmit={handleSubmit}>
          <label>
            Destination
            <input
              name="destination"
              type="text"
              value={agentDestination}
              readOnly
              aria-readonly="true"
              className="readonly-field"
            />
          </label>

          <label>
            Amount
            <input
              name="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label>
            Privacy
            <input
              name="privacy"
              type="text"
              value="private"
              readOnly
              aria-readonly="true"
              className="readonly-field"
            />
          </label>

          <button type="submit" disabled={!publicKey || isSubmitting}>
            Stake Agent
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Result</h2>
        <div className="result-box">
          <p>
            {status ?? "Connect a wallet to begin the remote signing flow."}
          </p>
          {buildSummary ? <p>{buildSummary}</p> : null}
          {signature ? (
            <p>
              Stake transaction:{" "}
              <a
                href={getExplorerUrl(signature, cluster)}
                target="_blank"
                rel="noreferrer noopener"
              >
                {signature}
              </a>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
