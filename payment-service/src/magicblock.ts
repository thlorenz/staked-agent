import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";

import { AppConfig } from "./server/config";
import {
  BuildTransferParams,
  BuiltTransferResponse,
  TeeAuthToken
} from "./server/types";

type ChallengeResponse = {
  challenge?: string;
};

type AuthenticateResponse = {
  token?: string;
};

function joinUrl(baseUrl: string, requestPath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = requestPath.startsWith("/")
    ? requestPath
    : `/${requestPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

function parseChallengeBytes(challenge: string): Uint8Array {
  try {
    return Uint8Array.from(Buffer.from(challenge, "base64"));
  } catch {
    return new TextEncoder().encode(challenge);
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Expected JSON response but received: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function maybeVerifyTee(config: AppConfig): Promise<void> {
  if (!config.verifyTee) {
    return;
  }
  throw new Error("TEE verification is not implemented in this sample");
}

export async function getTeeAuthToken(
  config: AppConfig,
  signer: Keypair,
): Promise<TeeAuthToken> {
  const challengeResponse = await fetch(
    joinUrl(config.magicblockTeeUrl, config.magicblockTeeChallengePath),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        publicKey: signer.publicKey.toBase58()
      })
    },
  );

  if (!challengeResponse.ok) {
    throw new Error(
      `TEE challenge request failed with status ${challengeResponse.status}: ${await challengeResponse.text()}`,
    );
  }

  const challengeBody = await parseJsonResponse<ChallengeResponse>(challengeResponse);
  if (!challengeBody.challenge) {
    throw new Error("TEE challenge response did not include a challenge");
  }

  const signature = nacl.sign.detached(
    parseChallengeBytes(challengeBody.challenge),
    signer.secretKey,
  );

  const authResponse = await fetch(
    joinUrl(config.magicblockTeeUrl, config.magicblockTeeAuthPath),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        publicKey: signer.publicKey.toBase58(),
        challenge: challengeBody.challenge,
        signature: bs58.encode(signature)
      })
    },
  );

  if (!authResponse.ok) {
    throw new Error(
      `TEE auth request failed with status ${authResponse.status}: ${await authResponse.text()}`,
    );
  }

  const authBody = await parseJsonResponse<AuthenticateResponse>(authResponse);
  if (!authBody.token) {
    throw new Error("TEE auth response did not include a token");
  }

  return { token: authBody.token };
}

export async function buildTransfer(
  config: AppConfig,
  params: BuildTransferParams,
): Promise<BuiltTransferResponse> {
  const response = await fetch(`${config.magicblockPaymentsUrl}/v1/spl/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error(
      `MagicBlock transfer build failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const payload = await parseJsonResponse<BuiltTransferResponse>(response);
  if (!payload.transactionBase64) {
    throw new Error("MagicBlock transfer response did not include transactionBase64");
  }

  return payload;
}
