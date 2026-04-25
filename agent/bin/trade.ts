import { loadAgentConfig } from "../src/config";
import { executeTrade } from "../src/trade";
import { parseSignedSolCliAmount } from "../src/shared";
import type { TradeRequest } from "../src/trade/types";

export function parseTradeArgs(argv: string[]): TradeRequest {
  if (argv.length !== 1) {
    throw new Error("Usage: esr bin/trade.ts <signed-sol-amount>");
  }

  const config = loadAgentConfig();
  const { sign, atomicAmount } = parseSignedSolCliAmount(argv[0]);

  return {
    direction: sign === 1 ? "buy-sol-with-usdc" : "sell-sol-for-usdc",
    solAtomicAmount: atomicAmount,
    slippageBps: config.slippageBps,
  };
}

async function main(argv: string[]): Promise<void> {
  const request = parseTradeArgs(argv);
  const trade = await executeTrade(request);
  console.log(`Signature: ${trade.signature}`);
  console.log(`Explorer: ${trade.explorerUrl}`);
}

void main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
