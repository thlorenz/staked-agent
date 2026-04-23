import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { createRemoteTeeChallenge } from "@/src/server/payments/tee-auth";

type ChallengeRequestBody = {
  publicKey?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ChallengeRequestBody;
    if (typeof body.publicKey !== "string" || body.publicKey.trim() === "") {
      return jsonError(400, "Invalid request body", "`publicKey` must be a non-empty string");
    }

    const response = await createRemoteTeeChallenge(
      loadConfig(),
      body.publicKey.trim()
    );

    return jsonOk(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);

    if (details.startsWith("TEE challenge request failed")) {
      return jsonError(502, "Upstream MagicBlock request failed", details);
    }

    return jsonError(500, "Unable to create TEE challenge", details);
  }
}
