import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";

import { AppConfig } from "@/src/server/config";
import {
  BuiltInitializeMintResponse,
  BuildTransferParams,
  BuiltTransferResponse,
  MintInitializationStatusResponse,
  PrivateBalanceResponse,
  TeeAuthToken,
} from "@/src/server/types";

type ChallengeResponse = {
  challenge?: string;
  error?: string;
};

type AuthenticateResponse = {
  token?: string;
  expiresAt?: number;
  error?: string;
};

type TEEIdentityResponse = {
  jsonrpc?: string;
  id?: number | string;
  result?: {
    identity?: string;
    fqdn?: string;
  };
  error?: {
    code?: number;
    message?: string;
  };
};

function joinUrl(baseUrl: string, requestPath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = requestPath.startsWith("/")
    ? requestPath
    : `/${requestPath}`;

  return `${normalizedBase}${normalizedPath}`;
}

function parseChallengeBytes(challenge: string): Uint8Array {
  return new TextEncoder().encode(challenge);
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

function withQuery(
  baseUrl: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export async function maybeVerifyTee(config: AppConfig): Promise<void> {
  if (!config.verifyTee) {
    return;
  }

  throw new Error("TEE verification is not implemented in this sample");
}

export async function getTeeIdentity(config: AppConfig): Promise<string> {
  const response = await fetch(joinUrl(config.magicblockTeeUrl, "/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getIdentity",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `TEE identity request failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const payload = await parseJsonResponse<TEEIdentityResponse>(response);
  if (payload.error?.message) {
    throw new Error(`TEE identity request failed: ${payload.error.message}`);
  }

  const identity = payload.result?.identity?.trim();
  if (!identity) {
    throw new Error("TEE identity response did not include an identity");
  }

  return identity;
}

export async function resolvePrivateValidator(
  config: AppConfig,
  validator?: string,
): Promise<string> {
  if (validator?.trim()) {
    return validator.trim();
  }

  if (config.validator?.trim()) {
    return config.validator.trim();
  }

  return getTeeIdentity(config);
}

export async function getMintInitializationStatus(
  config: AppConfig,
  payload: {
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<MintInitializationStatusResponse> {
  const validator = await resolvePrivateValidator(config, payload.validator);
  const response = await fetch(
    withQuery(
      joinUrl(config.magicblockPaymentsUrl, "/v1/spl/is-mint-initialized"),
      {
        mint: payload.mint,
        cluster: payload.cluster,
        validator,
      },
    ),
  );

  if (!response.ok) {
    throw new Error(
      `MagicBlock mint status request failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const body =
    await parseJsonResponse<MintInitializationStatusResponse>(response);
  if (!body.validator || typeof body.initialized !== "boolean") {
    throw new Error(
      "MagicBlock mint status response was missing required fields",
    );
  }

  return body;
}

export async function buildInitializeMint(
  config: AppConfig,
  payload: {
    owner: string;
    payer: string;
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<BuiltInitializeMintResponse> {
  const validator = await resolvePrivateValidator(config, payload.validator);
  const response = await fetch(
    joinUrl(config.magicblockPaymentsUrl, "/v1/spl/initialize-mint"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: payload.owner,
        payer: payload.payer,
        mint: payload.mint,
        cluster: payload.cluster,
        validator,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `MagicBlock initialize mint failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const body = await parseJsonResponse<BuiltInitializeMintResponse>(response);
  if (!body.transactionBase64) {
    throw new Error(
      "MagicBlock initialize mint response did not include transactionBase64",
    );
  }

  return {
    ...body,
    validator: body.validator ?? validator,
  };
}

export async function buildDeposit(
  config: AppConfig,
  payload: {
    owner: string;
    amount: number;
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<BuiltTransferResponse> {
  const validator = await resolvePrivateValidator(config, payload.validator);
  const response = await fetch(
    joinUrl(config.magicblockPaymentsUrl, "/v1/spl/deposit"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: payload.owner,
        amount: payload.amount,
        mint: payload.mint,
        cluster: payload.cluster,
        validator,
        initIfMissing: true,
        initVaultIfMissing: true,
        initAtasIfMissing: true,
        idempotent: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `MagicBlock deposit build failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const body = await parseJsonResponse<BuiltTransferResponse>(response);
  if (!body.transactionBase64) {
    throw new Error(
      "MagicBlock deposit response did not include transactionBase64",
    );
  }

  return {
    ...body,
    validator: body.validator ?? validator,
  };
}

export async function getPrivateBalance(
  config: AppConfig,
  payload: {
    address: string;
    authToken: string;
    mint: string;
    cluster: string;
    validator?: string;
  },
): Promise<PrivateBalanceResponse> {
  const validator = await resolvePrivateValidator(config, payload.validator);
  const response = await fetch(
    withQuery(
      joinUrl(config.magicblockPaymentsUrl, "/v1/spl/private-balance"),
      {
        address: payload.address,
        mint: payload.mint,
        cluster: payload.cluster,
        validator,
      },
    ),
    {
      headers: {
        Authorization: `Bearer ${payload.authToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `MagicBlock private balance request failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const body = await parseJsonResponse<PrivateBalanceResponse>(response);
  if (typeof body.balance !== "string") {
    throw new Error(
      "MagicBlock private balance response was missing required fields",
    );
  }

  return body;
}

export async function getTeeAuthToken(
  config: AppConfig,
  signer: Keypair,
): Promise<TeeAuthToken> {
  const publicKey = signer.publicKey.toBase58();
  const challenge = await requestTeeChallenge(config, publicKey);
  const signature = nacl.sign.detached(
    parseChallengeBytes(challenge),
    signer.secretKey,
  );
  return authenticateTeeChallenge(config, {
    publicKey,
    challenge,
    signature: bs58.encode(signature),
  });
}

export async function requestTeeChallenge(
  config: AppConfig,
  publicKey: string,
): Promise<string> {
  const challengeResponse = await fetch(
    `${joinUrl(config.magicblockTeeUrl, "/auth/challenge")}?pubkey=${encodeURIComponent(publicKey)}`,
  );

  if (!challengeResponse.ok) {
    throw new Error(
      `TEE challenge request failed with status ${challengeResponse.status}: ${await challengeResponse.text()}`,
    );
  }

  const challengeBody =
    await parseJsonResponse<ChallengeResponse>(challengeResponse);
  if (challengeBody.error) {
    throw new Error(`TEE challenge request failed: ${challengeBody.error}`);
  }
  if (!challengeBody.challenge) {
    throw new Error("TEE challenge response did not include a challenge");
  }

  return challengeBody.challenge;
}

export async function authenticateTeeChallenge(
  config: AppConfig,
  payload: {
    publicKey: string;
    challenge: string;
    signature: string;
  },
): Promise<TeeAuthToken> {
  const authResponse = await fetch(
    joinUrl(config.magicblockTeeUrl, "/auth/login"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pubkey: payload.publicKey,
        challenge: payload.challenge,
        signature: payload.signature,
      }),
    },
  );

  if (!authResponse.ok) {
    throw new Error(
      `TEE auth request failed with status ${authResponse.status}: ${await authResponse.text()}`,
    );
  }

  const authBody = await parseJsonResponse<AuthenticateResponse>(authResponse);
  if (authBody.error) {
    throw new Error(`TEE auth request failed: ${authBody.error}`);
  }
  if (!authBody.token) {
    throw new Error("TEE auth response did not include a token");
  }

  return { token: authBody.token };
}

export async function buildTransfer(
  config: AppConfig,
  params: BuildTransferParams,
): Promise<BuiltTransferResponse> {
  const resolvedParams =
    params.visibility === "private"
      ? {
          ...params,
          validator: await resolvePrivateValidator(config, params.validator),
        }
      : params;

  const response = await fetch(
    `${config.magicblockPaymentsUrl}/v1/spl/transfer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resolvedParams),
    },
  );

  if (!response.ok) {
    throw new Error(
      `MagicBlock transfer build failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const payload = await parseJsonResponse<BuiltTransferResponse>(response);
  if (!payload.transactionBase64) {
    throw new Error(
      "MagicBlock transfer response did not include transactionBase64",
    );
  }

  return {
    ...payload,
    validator: payload.validator ?? resolvedParams.validator,
  };
}
