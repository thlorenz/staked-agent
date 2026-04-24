import type { AppConfig } from "@/src/server/config";
import { buildDeposit } from "@/src/server/magicblock";
import type { BuiltTransferResponse } from "@/src/server/types";

export async function buildPrivateDeposit(
  config: AppConfig,
  payload: {
    owner: string;
    amount: number;
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<BuiltTransferResponse> {
  return buildDeposit(config, payload);
}
