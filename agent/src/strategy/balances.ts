import type { Connection, PublicKey } from "@solana/web3.js";

import type { AgentConfig } from "../config";
import { parsePublicKey } from "../shared";

export type AgentBalances = {
  solLamports: bigint;
  usdcAtomic: bigint;
};

export async function readAgentBalances(
  connection: Connection,
  owner: PublicKey,
  config: AgentConfig,
): Promise<AgentBalances> {
  const usdcMint = parsePublicKey(config.usdcMint, "USDC mint");

  const [lamports, tokenAccounts] = await Promise.all([
    connection.getBalance(owner),
    connection.getParsedTokenAccountsByOwner(owner, { mint: usdcMint }),
  ]);

  const usdcAtomic = tokenAccounts.value.reduce((total, account) => {
    const amount = account.account.data.parsed.info.tokenAmount
      .amount as string;
    return total + BigInt(amount);
  }, 0n);

  return {
    solLamports: BigInt(lamports),
    usdcAtomic,
  };
}
