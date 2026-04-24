import type { Connection } from "@solana/web3.js";

import type { AppConfig } from "@/src/server/config";
import type {
  PublicStakeSubmitRequest,
  RecordedStakePayment,
} from "@/src/server/types";

type ParsedTokenBalance = {
  owner?: string;
  mint: string;
  uiTokenAmount: {
    amount: string;
  };
};

function sumTokenBalanceAmounts(
  balances: ParsedTokenBalance[] | null | undefined,
  owner: string,
  mint: string,
): number {
  return (balances ?? []).reduce((total, balance) => {
    if (balance.owner !== owner || balance.mint !== mint) {
      return total;
    }

    const amount = Number.parseInt(balance.uiTokenAmount.amount, 10);
    if (Number.isNaN(amount)) {
      throw new Error("Unable to parse token balance amount from Solana RPC");
    }

    return total + amount;
  }, 0);
}

export async function verifyConfirmedPublicStakePayment(params: {
  connection: Connection;
  config: AppConfig;
  signature: string;
  expected: Omit<
    PublicStakeSubmitRequest,
    "signedTransactionBase64" | "privacy"
  >;
}): Promise<RecordedStakePayment> {
  const { connection, config, signature, expected } = params;
  const transaction = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) {
    throw new Error(
      "Submitted transaction could not be loaded from Solana RPC",
    );
  }

  if (transaction.meta?.err) {
    throw new Error(
      `Transaction failed with meta.err: ${JSON.stringify(
        transaction.meta.err,
      )}`,
    );
  }

  const signerAccount = transaction.transaction.message.accountKeys.find(
    (accountKey) => accountKey.signer,
  );
  if (!signerAccount) {
    throw new Error("Submitted transaction does not include a signer");
  }

  const signerPubkey = signerAccount.pubkey.toBase58();
  if (signerPubkey !== expected.stakerPubkey) {
    throw new Error(
      "Submitted staker pubkey does not match transaction signer",
    );
  }

  if (expected.destination !== config.agentDestination) {
    throw new Error(
      "Submitted destination does not match configured agent destination",
    );
  }

  const preTokenBalances = transaction.meta?.preTokenBalances;
  const postTokenBalances = transaction.meta?.postTokenBalances;
  const agentPreBalance = sumTokenBalanceAmounts(
    preTokenBalances,
    config.agentDestination,
    config.usdcMint,
  );
  const agentPostBalance = sumTokenBalanceAmounts(
    postTokenBalances,
    config.agentDestination,
    config.usdcMint,
  );
  const stakerPreBalance = sumTokenBalanceAmounts(
    preTokenBalances,
    expected.stakerPubkey,
    config.usdcMint,
  );
  const stakerPostBalance = sumTokenBalanceAmounts(
    postTokenBalances,
    expected.stakerPubkey,
    config.usdcMint,
  );

  if (agentPostBalance - agentPreBalance !== expected.amount) {
    throw new Error("Submitted token delta does not match expected amount");
  }

  if (stakerPreBalance - stakerPostBalance !== expected.amount) {
    throw new Error("Submitted token delta does not match expected amount");
  }

  return {
    signature,
    stakerPubkey: expected.stakerPubkey,
    agentPubkey: config.agentDestination,
    amount: expected.amount,
    slot: transaction.slot,
    blockTime: transaction.blockTime ?? null,
    stakedAt: new Date().toISOString(),
    status: "confirmed",
  };
}
