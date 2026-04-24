import "dotenv/config";

import { parsePublicKey } from "@/src/server/solana";

const DEFAULT_AGENT_DESTINATION =
  "AhJJkA2WBFPKpRjL5JnHZiTkNYDRWhr13cpTRMHDzZNA";

export type AppConfig = {
  port: number;
  solanaRpcUrl: string;
  sqliteDbPath: string;
  magicblockPaymentsUrl: string;
  magicblockTeeUrl: string;
  magicblockTeeWsUrl: string;
  magicblockTeeChallengePath: string;
  magicblockTeeAuthPath: string;
  cluster: string;
  usdcMint: string;
  validator?: string;
  senderKeypairPath: string;
  verifyTee: boolean;
  nextPublicSolanaRpcUrl: string;
  nextPublicCluster: string;
  agentDestination: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${value}`);
  }

  return port;
}

function parseVerifyTee(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Invalid VERIFY_TEE: ${value}`);
}

export function loadConfig(): AppConfig {
  const solanaRpcUrl = getRequiredEnv("SOLANA_RPC_URL");
  const cluster = process.env.CLUSTER?.trim() || "devnet";
  const agentDestination =
    process.env.AGENT_DESTINATION_PUBKEY?.trim() || DEFAULT_AGENT_DESTINATION;
  parsePublicKey(agentDestination, "AGENT_DESTINATION_PUBKEY");

  return {
    port: parsePort(process.env.PORT?.trim()),
    solanaRpcUrl,
    sqliteDbPath:
      process.env.SQLITE_DB_PATH?.trim() || "./src/db/staked-agent.sqlite",
    magicblockPaymentsUrl:
      process.env.MAGICBLOCK_PAYMENTS_URL?.trim() ||
      "https://payments.magicblock.app",
    magicblockTeeUrl:
      process.env.MAGICBLOCK_TEE_URL?.trim() ||
      "https://devnet-tee.magicblock.app",
    magicblockTeeWsUrl:
      process.env.MAGICBLOCK_TEE_WS_URL?.trim() || "wss://tee.magicblock.app",
    magicblockTeeChallengePath:
      process.env.MAGICBLOCK_TEE_CHALLENGE_PATH?.trim() || "/auth/challenge",
    magicblockTeeAuthPath:
      process.env.MAGICBLOCK_TEE_AUTH_PATH?.trim() || "/auth/login",
    cluster,
    usdcMint: getRequiredEnv("USDC_MINT"),
    validator: process.env.VALIDATOR?.trim() || undefined,
    senderKeypairPath:
      process.env.SENDER_KEYPAIR_PATH?.trim() || "./keypairs/01.json",
    verifyTee: parseVerifyTee(process.env.VERIFY_TEE?.trim()),
    nextPublicSolanaRpcUrl:
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || solanaRpcUrl,
    nextPublicCluster: process.env.NEXT_PUBLIC_CLUSTER?.trim() || cluster,
    agentDestination,
  };
}
