"use client";

import type { Connection, PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

import {
  buildRemotePaymentRequest,
  serializeSignedTransactionToBase64,
  submitRemotePublicStake,
} from "@/src/lib/payment/shared/api";
import {
  executeBuiltTransactionWithRetry,
  type StakeDebugLogger,
} from "@/src/lib/payment/shared/transactions";

type SignTransaction = NonNullable<WalletContextState["signTransaction"]>;

export async function executePublicPayment(params: {
  agentDestination: string;
  amount: number;
  connection: Connection;
  routerConnection: Connection;
  publicKey: PublicKey;
  signTransaction: SignTransaction;
  setStatus: (value: string | null) => void;
  setBuildSummary: (value: string | null) => void;
  getBaseTokenBalance: (owner: string) => Promise<bigint>;
  logDebug?: StakeDebugLogger;
}): Promise<string> {
  const {
    agentDestination,
    amount,
    connection,
    routerConnection,
    publicKey,
    signTransaction,
    setStatus,
    setBuildSummary,
    getBaseTokenBalance,
    logDebug,
  } = params;

  const sender = publicKey.toBase58();
  const baseBalance = await getBaseTokenBalance(sender);
  if (baseBalance < BigInt(amount)) {
    throw new Error(
      `Insufficient base token balance for amount ${amount}. Wallet currently has ${baseBalance.toString()} raw units.`,
    );
  }

  return executeBuiltTransactionWithRetry({
    build: () =>
      buildRemotePaymentRequest({
        from: sender,
        to: agentDestination,
        amount,
        privacy: "public",
        fromBalance: "base",
        toBalance: "base",
      }),
    getTransactionBase64: (remoteBuild) => remoteBuild.build.transactionBase64,
    getSubmitConnection: () => routerConnection,
    connection,
    signTransaction,
    setStatus,
    logDebug,
    submitSignedTransactionOverride: async ({ signedTransaction }) => {
      setStatus("Submitting signed transaction for verification...");
      const response = await submitRemotePublicStake({
        signedTransactionBase64:
          serializeSignedTransactionToBase64(signedTransaction),
        stakerPubkey: sender,
        destination: agentDestination,
        amount,
        privacy: "public",
      });
      return response.signature;
    },
    onBuilt: (remoteBuild) => {
      setStatus("Building unsigned transaction...");
      setBuildSummary(
        `kind=${remoteBuild.build.kind} privacy=${remoteBuild.privacy} destination=${remoteBuild.destination}`,
      );
      logDebug?.("transfer-build", {
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
