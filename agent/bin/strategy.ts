import { runStrategyLoop } from "../src/strategy";

void runStrategyLoop().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
