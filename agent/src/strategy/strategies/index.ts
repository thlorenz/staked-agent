import type { AgentConfig } from "../../config";
import type { Strategy } from "../types";
import { MovingAverageStrategy } from "./moving-average";

export function createStrategy(config: AgentConfig): Strategy {
  const lookback = config.strategyLookbackSecondsOverride ?? undefined;
  const threshold = config.strategyMaThreshold;
  switch (config.strategyName) {
    case "moving-average":
      return new MovingAverageStrategy(lookback, threshold);
    default:
      throw new Error(`Unknown strategy: ${config.strategyName}`);
  }
}
