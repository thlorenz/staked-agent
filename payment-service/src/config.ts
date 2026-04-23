import "dotenv/config";

export interface AppConfig {
  port: number;
  solanaRpcUrl: string;
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
}

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
  const senderKeypairPath =
    process.env.SENDER_KEYPAIR_PATH?.trim() || "./keypairs/01.json";

  return {
    port: parsePort(process.env.PORT?.trim()),
    solanaRpcUrl: getRequiredEnv("SOLANA_RPC_URL"),
    magicblockPaymentsUrl:
      process.env.MAGICBLOCK_PAYMENTS_URL?.trim() ||
      "https://payments.magicblock.app",
    magicblockTeeUrl:
      process.env.MAGICBLOCK_TEE_URL?.trim() ||
      "https://devnet-tee.magicblock.app",
    magicblockTeeWsUrl:
      process.env.MAGICBLOCK_TEE_WS_URL?.trim() || "wss://tee.magicblock.app",
    // These path defaults are placeholders and may need to be replaced with
    // the actual MagicBlock integration endpoints.
    magicblockTeeChallengePath:
      process.env.MAGICBLOCK_TEE_CHALLENGE_PATH?.trim() || "/challenge",
    magicblockTeeAuthPath:
      process.env.MAGICBLOCK_TEE_AUTH_PATH?.trim() || "/authenticate",
    cluster: process.env.CLUSTER?.trim() || "devnet",
    usdcMint: getRequiredEnv("USDC_MINT"),
    validator: process.env.VALIDATOR?.trim() || undefined,
    senderKeypairPath,
    verifyTee: parseVerifyTee(process.env.VERIFY_TEE?.trim())
  };
}
