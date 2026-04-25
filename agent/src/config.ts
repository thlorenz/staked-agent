import "dotenv/config";

export type AgentConfig = {
  cluster: "devnet" | "mainnet";
  solanaRpcUrl: string;
  agentKeypairPath: string;
  operatorSolanaCliConfigPath: string;
  operatorKeypairPathOverride?: string;
  fundingMultiplier: number;
  usdcMint: string;
  whirlpoolsConfig: string;
  solMint: string;
  coinGeckoBaseUrl: string;
  coinGeckoDemoApiKey?: string;
  jupiterBaseUrl: string;
  jupiterApiKey?: string;
  slippageBps: number;
  maxPriorityFeeLamports: number;
  minSolFeeReserveLamports: bigint;
  strategyTickSeconds: number;
  strategyBuyPercent: number;
  strategySellPercent: number;
  strategyName: string;
  strategyLookbackSecondsOverride: number | null;
  tradesDbPath: string;
};

const DEVNET_USDC_MINT = "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k";
const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEVNET_WHIRLPOOLS_CONFIG = "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR";
const MAINNET_WHIRLPOOLS_CONFIG =
  "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ";

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

function parsePercent(
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
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${fieldName} must be between 0 and 100.`);
  }

  return parsed;
}

export function loadAgentConfig(): AgentConfig {
  const cluster = process.env.CLUSTER ?? "devnet";
  if (cluster !== "devnet" && cluster !== "mainnet") {
    throw new Error("CLUSTER must be devnet or mainnet.");
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
    fundingMultiplier: parsePositiveInteger(
      process.env.AGENT_FUNDING_MULTIPLIER,
      2,
      "AGENT_FUNDING_MULTIPLIER",
    ),
    usdcMint:
      process.env.USDC_MINT ??
      (cluster === "devnet" ? DEVNET_USDC_MINT : MAINNET_USDC_MINT),
    whirlpoolsConfig:
      process.env.WHIRLPOOLS_CONFIG ??
      (cluster === "devnet"
        ? DEVNET_WHIRLPOOLS_CONFIG
        : MAINNET_WHIRLPOOLS_CONFIG),
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
    strategyTickSeconds: parsePositiveInteger(
      process.env.AGENT_STRATEGY_TICK_SECONDS,
      60,
      "AGENT_STRATEGY_TICK_SECONDS",
    ),
    strategyBuyPercent: parsePercent(
      process.env.AGENT_STRATEGY_BUY_PERCENT,
      20,
      "AGENT_STRATEGY_BUY_PERCENT",
    ),
    strategySellPercent: parsePercent(
      process.env.AGENT_STRATEGY_SELL_PERCENT,
      90,
      "AGENT_STRATEGY_SELL_PERCENT",
    ),
    strategyName: process.env.AGENT_STRATEGY ?? "moving-average",
    strategyLookbackSecondsOverride: (() => {
      const value = process.env.AGENT_STRATEGY_LOOKBACK_SECONDS;
      if (value === undefined || value === "") {
        return null;
      }
      return parsePositiveInteger(
        value,
        0,
        "AGENT_STRATEGY_LOOKBACK_SECONDS",
      );
    })(),
    tradesDbPath:
      process.env.AGENT_TRADES_DB_PATH ??
      "../payment-service/src/db/staked-agent.sqlite",
  };
}
