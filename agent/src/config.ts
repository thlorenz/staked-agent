import "dotenv/config";

export type AgentConfig = {
  cluster: "devnet";
  solanaRpcUrl: string;
  agentKeypairPath: string;
  operatorSolanaCliConfigPath: string;
  operatorKeypairPathOverride?: string;
  agentFundingKeypairPath: string;
  fundingMultiplier: number;
  usdcMint: string;
  solMint: string;
  coinGeckoBaseUrl: string;
  coinGeckoDemoApiKey?: string;
  jupiterBaseUrl: string;
  jupiterApiKey?: string;
  slippageBps: number;
  maxPriorityFeeLamports: number;
  minSolFeeReserveLamports: bigint;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  fieldName: string,
): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return parsed;
}

export function loadAgentConfig(): AgentConfig {
  const cluster = process.env.CLUSTER ?? "devnet";
  if (cluster !== "devnet") {
    throw new Error("Only devnet is supported.");
  }

  const agentKeypairPath =
    process.env.AGENT_KEYPAIR_PATH ??
    process.env.SENDER_KEYPAIR_PATH ??
    "../keypairs/01.json";

  return {
    cluster,
    solanaRpcUrl: getRequiredEnv("SOLANA_RPC_URL"),
    agentKeypairPath,
    operatorSolanaCliConfigPath:
      process.env.SOLANA_CLI_CONFIG_PATH ?? "~/.config/solana/cli/config.yml",
    operatorKeypairPathOverride: process.env.OPERATOR_KEYPAIR_PATH,
    agentFundingKeypairPath:
      process.env.AGENT_FUNDING_KEYPAIR_PATH ?? "../keypairs/agent.json",
    fundingMultiplier: parsePositiveInteger(
      process.env.AGENT_FUNDING_MULTIPLIER,
      2,
      "AGENT_FUNDING_MULTIPLIER",
    ),
    usdcMint:
      process.env.USDC_MINT ?? "6aMfKfekyzLpsF74Bgg7pZxNUM2iwcyXkg9cRjQ9XJYW",
    solMint: "So11111111111111111111111111111111111111112",
    coinGeckoBaseUrl:
      process.env.COIN_GECKO_BASE_URL ?? "https://api.coingecko.com/api/v3",
    coinGeckoDemoApiKey: process.env.COINGECKO_DEMO_API_KEY,
    jupiterBaseUrl:
      process.env.JUPITER_BASE_URL ?? "https://api.jup.ag/swap/v1",
    jupiterApiKey: process.env.JUPITER_API_KEY,
    slippageBps: parsePositiveInteger(
      process.env.AGENT_SLIPPAGE_BPS,
      50,
      "AGENT_SLIPPAGE_BPS",
    ),
    maxPriorityFeeLamports: parsePositiveInteger(
      process.env.AGENT_MAX_PRIORITY_FEE_LAMPORTS,
      1_000_000,
      "AGENT_MAX_PRIORITY_FEE_LAMPORTS",
    ),
    minSolFeeReserveLamports: BigInt(
      parsePositiveInteger(
        process.env.AGENT_MIN_SOL_FEE_RESERVE_LAMPORTS,
        1_000_000,
        "AGENT_MIN_SOL_FEE_RESERVE_LAMPORTS",
      ),
    ),
  };
}
