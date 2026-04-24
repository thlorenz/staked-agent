"use client";

import bs58 from "bs58";
import type { Connection, PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

import {
  buildInitializeMintTransaction,
  buildPrivateDepositTransaction,
  buildRemotePaymentRequest,
  completeRemoteTeeAuth,
  fetchPrivateBalance,
  fetchPrivateMintStatus,
  fetchRemoteTeeChallenge,
} from "@/src/lib/payment/shared/api";
import {
  executeBuiltTransactionWithRetry,
  type StakeDebugLogger,
} from "@/src/lib/payment/shared/transactions";

type SignMessage = NonNullable<WalletContextState["signMessage"]>;
type SignTransaction = NonNullable<WalletContextState["signTransaction"]>;

type PrivatePaymentHelpers = {
  cluster: string;
  connection: Connection;
  routerConnection: Connection;
  signTransaction: SignTransaction;
  setStatus: (value: string | null) => void;
  logDebug?: StakeDebugLogger;
};

export async function ensurePrivateMintInitialized(
  params: PrivatePaymentHelpers & {
    sender: string;
    signTransaction: SignTransaction;
  },
): Promise<string> {
  const {
    cluster,
    connection,
    routerConnection,
    sender,
    signTransaction,
    setStatus,
    logDebug,
  } = params;

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
    getSubmitConnection: () => routerConnection,
    connection,
    signTransaction,
    setStatus,
    logDebug,
    onBuilt: (built) => {
      logDebug?.("initialize-mint-build", {
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

export async function ensurePrivateDeposit(
  params: PrivatePaymentHelpers & {
    sender: string;
    amount: number;
    validator: string;
    signTransaction: SignTransaction;
  },
): Promise<void> {
  const {
    cluster,
    connection,
    routerConnection,
    sender,
    amount,
    validator,
    signTransaction,
    setStatus,
    logDebug,
  } = params;

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
    getSubmitConnection: () => routerConnection,
    connection,
    signTransaction,
    setStatus,
    logDebug,
    onBuilt: (built) => {
      logDebug?.("deposit-build", {
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

export async function getPrivateTokenBalance(params: {
  address: string;
  authorization: string;
  cluster: string;
  mint: string;
  validator: string;
  setStatus: (value: string | null) => void;
  logDebug?: StakeDebugLogger;
}): Promise<bigint> {
  const {
    address,
    authorization,
    cluster,
    mint,
    validator,
    setStatus,
    logDebug,
  } = params;

  setStatus("Checking private token balance...");
  const response = await fetchPrivateBalance({
    address,
    authToken: authorization,
    cluster,
    mint,
    validator,
  });

  logDebug?.("private-balance", {
    address,
    validator,
    balance: response.balance,
    ata: response.ata,
    location: response.location,
  });

  return BigInt(response.balance);
}

export async function executePrivatePayment(params: {
  agentDestination: string;
  amount: number;
  cluster: string;
  connection: Connection;
  routerConnection: Connection;
  mint: string;
  publicKey: PublicKey;
  signMessage: SignMessage;
  signTransaction: SignTransaction;
  setStatus: (value: string | null) => void;
  setBuildSummary: (value: string | null) => void;
  teeUrl: string;
  teeWsUrl: string;
  getBaseTokenBalance: (owner: string) => Promise<bigint>;
  logDebug?: StakeDebugLogger;
}): Promise<string> {
  const {
    agentDestination,
    amount,
    cluster,
    connection,
    routerConnection,
    mint,
    publicKey,
    signMessage,
    signTransaction,
    setStatus,
    setBuildSummary,
    teeUrl,
    teeWsUrl,
    getBaseTokenBalance,
    logDebug,
  } = params;

  const sender = publicKey.toBase58();
  const validator = await ensurePrivateMintInitialized({
    cluster,
    connection,
    routerConnection,
    sender,
    signTransaction,
    setStatus,
    logDebug,
  });

  setStatus("Requesting MagicBlock private-payment challenge...");
  const challenge = await fetchRemoteTeeChallenge(sender);
  const signedChallenge = await signMessage(
    new TextEncoder().encode(challenge),
  );
  const teeAuthToken = await completeRemoteTeeAuth({
    publicKey: sender,
    challenge,
    signature: bs58.encode(signedChallenge),
  });
  logDebug?.("tee-auth", {
    sender,
    validator,
    teeUrl,
    teeWsUrl,
    hasToken: Boolean(teeAuthToken),
  });

  const privateBalance = await getPrivateTokenBalance({
    address: sender,
    authorization: teeAuthToken,
    cluster,
    mint,
    validator,
    setStatus,
    logDebug,
  });
  const amountBigInt = BigInt(amount);

  if (privateBalance < amountBigInt) {
    const depositAmount = amountBigInt - privateBalance;
    const baseBalance = await getBaseTokenBalance(sender);
    if (baseBalance < depositAmount) {
      throw new Error(
        `Insufficient token balance for amount ${amount}. Wallet has ${baseBalance.toString()} raw base units and ${privateBalance.toString()} raw private units.`,
      );
    }

    await ensurePrivateDeposit({
      cluster,
      connection,
      routerConnection,
      sender,
      amount: Number(depositAmount),
      validator,
      signTransaction,
      setStatus,
      logDebug,
    });
  }

  return executeBuiltTransactionWithRetry({
    build: () =>
      buildRemotePaymentRequest({
        from: sender,
        to: agentDestination,
        amount,
        privacy: "private",
        fromBalance: "ephemeral",
        toBalance: "base",
        teeAuthToken,
        validator,
      }),
    getTransactionBase64: (remoteBuild) => remoteBuild.build.transactionBase64,
    getSubmitConnection: () => routerConnection,
    connection,
    signTransaction,
    setStatus,
    logDebug,
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
