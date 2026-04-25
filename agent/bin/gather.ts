import { getHistoricalSolPrices } from "../src/gather";
import { renderHistoricalPricesTerminal } from "../src/gather/terminal";

export function parseGatherArgs(argv: string[]): number {
  if (argv.length !== 1) {
    throw new Error("Usage: esr bin/gather.ts <lookback-seconds>");
  }

  const [lookbackSecondsText] = argv;
  if (!/^\d+$/.test(lookbackSecondsText)) {
    throw new Error("Usage: esr bin/gather.ts <lookback-seconds>");
  }

  const lookbackSeconds = Number(lookbackSecondsText);
  if (!Number.isSafeInteger(lookbackSeconds) || lookbackSeconds <= 0) {
    throw new Error("Usage: esr bin/gather.ts <lookback-seconds>");
  }

  return lookbackSeconds;
}

async function main(argv: string[]): Promise<void> {
  const lookbackSeconds = parseGatherArgs(argv);
  const series = await getHistoricalSolPrices(lookbackSeconds);
  console.log(renderHistoricalPricesTerminal(series));
}

void main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
