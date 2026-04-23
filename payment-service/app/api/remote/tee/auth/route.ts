import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { completeRemoteTeeAuth } from "@/src/server/payments/tee-auth";

type AuthRequestBody = {
  publicKey?: string;
  challenge?: string;
  signature?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as AuthRequestBody;

    if (typeof body.publicKey !== "string" || body.publicKey.trim() === "") {
      return jsonError(400, "Invalid request body", "`publicKey` must be a non-empty string");
    }

    if (typeof body.challenge !== "string" || body.challenge.trim() === "") {
      return jsonError(400, "Invalid request body", "`challenge` must be a non-empty string");
    }

    if (typeof body.signature !== "string" || body.signature.trim() === "") {
      return jsonError(400, "Invalid request body", "`signature` must be a non-empty string");
    }

    const response = await completeRemoteTeeAuth(loadConfig(), {
      publicKey: body.publicKey.trim(),
      challenge: body.challenge.trim(),
      signature: body.signature.trim()
    });

    return jsonOk(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);

    if (details.startsWith("TEE auth request failed")) {
      return jsonError(502, "Upstream MagicBlock request failed", details);
    }

    return jsonError(500, "Unable to complete TEE auth", details);
  }
}
