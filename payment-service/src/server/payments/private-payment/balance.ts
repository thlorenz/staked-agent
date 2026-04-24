import type { AppConfig } from "@/src/server/config";
import { getPrivateBalance } from "@/src/server/magicblock";
import type { PrivateBalanceResponse } from "@/src/server/types";

export async function getPrivatePaymentBalance(
  config: AppConfig,
  payload: {
    address: string;
    authToken: string;
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<PrivateBalanceResponse> {
  return getPrivateBalance(config, payload);
}
