import { parseUnsignedUsdcCliAmount } from "../src/shared";

export function parseFundArgs(argv: string[]): bigint {
  if (argv.length !== 1) {
    throw new Error("Usage: esr bin/fund.ts <unsigned-usdc-amount>");
  }

  return parseUnsignedUsdcCliAmount(argv[0]);
}

async function main(argv: string[]): Promise<void> {
  parseFundArgs(argv);
  throw new Error("fund CLI is not implemented yet.");
}

void main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
