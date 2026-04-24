import type { AppConfig } from "@/src/server/config";
import {
  authenticateTeeChallenge,
  requestTeeChallenge,
} from "@/src/server/magicblock";
import type {
  RemoteTeeAuthResponse,
  TeeChallengeResponse,
} from "@/src/server/types";

export async function createRemoteTeeChallenge(
  config: AppConfig,
  publicKey: string,
): Promise<TeeChallengeResponse> {
  const challenge = await requestTeeChallenge(config, publicKey);
  return {
    ok: true,
    challenge,
  };
}

export async function completeRemoteTeeAuth(
  config: AppConfig,
  payload: {
    publicKey: string;
    challenge: string;
    signature: string;
  },
): Promise<RemoteTeeAuthResponse> {
  const { token } = await authenticateTeeChallenge(config, payload);
  return {
    ok: true,
    token,
  };
}
