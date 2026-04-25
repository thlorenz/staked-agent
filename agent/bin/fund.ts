import { loadAgentConfig } from "../src/config";
import { executeFunding } from "../src/fund";
import { parseUnsignedUsdcCliAmount } from "../src/shared";

export function parseFundArgs(argv: string[]): bigint {
  if (argv.length !== 1) {
    throw new Error("Usage: esr bin/fund.ts <unsigned-usdc-amount>");
  }

  return parseUnsignedUsdcCliAmount(argv[0]);
}

function formatUsdcAtomicAmount(amountAtomic: bigint): string {
  const whole = amountAtomic / 1_000_000n;
  const fraction = amountAtomic % 1_000_000n;
  return `${whole.toString()}.${fraction.toString().padStart(6, "0")}`;
}

function printFundingSummary(
  result: Awaited<ReturnType<typeof executeFunding>>,
): void {
  console.log(`Source wallet: ${result.sourceWallet}`);
  console.log(`Destination wallet: ${result.destinationWallet}`);
  console.log(
    `Purchased USDC: ${formatUsdcAtomicAmount(
      result.purchasedUsdcAtomicAmount,
    )}`,
  );
  console.log(
    `Transferred USDC: ${formatUsdcAtomicAmount(
      result.transferredUsdcAtomicAmount,
    )}`,
  );
  console.log(`Purchase signature: ${result.purchaseSignature}`);
  console.log(`Purchase explorer: ${result.purchaseExplorerUrl}`);
  console.log(`Transfer signature: ${result.transferSignature}`);
  console.log(`Transfer explorer: ${result.transferExplorerUrl}`);
}

async function main(argv: string[]): Promise<void> {
  const requestedUsdcAtomicAmount = parseFundArgs(argv);
  const config = loadAgentConfig();
  const result = await executeFunding({
    requestedUsdcAtomicAmount,
    slippageBps: config.slippageBps,
  });
  printFundingSummary(result);
}

void main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
