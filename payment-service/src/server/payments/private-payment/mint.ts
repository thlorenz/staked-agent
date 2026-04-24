import type { AppConfig } from "@/src/server/config";
import {
  buildInitializeMint,
  getMintInitializationStatus,
} from "@/src/server/magicblock";
import type {
  BuiltInitializeMintResponse,
  MintInitializationStatusResponse,
} from "@/src/server/types";

export async function getPrivateMintStatus(
  config: AppConfig,
  payload: {
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<MintInitializationStatusResponse> {
  return getMintInitializationStatus(config, payload);
}

export async function buildPrivateInitializeMint(
  config: AppConfig,
  payload: {
    owner: string;
    payer: string;
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<BuiltInitializeMintResponse> {
  return buildInitializeMint(config, payload);
}
