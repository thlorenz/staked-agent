import type { AgentConfig } from "../../config";
import { JupiterSwapProvider } from "./jupiter";
import type { SwapProvider } from "./swap-provider";
import { WhirlpoolSwapProvider } from "./whirlpool";

export * from "./swap-provider";
export { JupiterSwapProvider } from "./jupiter";
export { WhirlpoolSwapProvider } from "./whirlpool";

export function getSwapProvider(config: AgentConfig): SwapProvider {
  if (config.cluster === "devnet") {
    return new WhirlpoolSwapProvider(config);
  }
  return new JupiterSwapProvider(config);
}
