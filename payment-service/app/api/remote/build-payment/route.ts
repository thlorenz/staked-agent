import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { buildRemotePayment } from "@/src/server/payments/remote-build";
import type { PaymentRequestInput } from "@/src/server/payments/types";

function isBadRequest(details: string): boolean {
  return [
    "Invalid to",
    "Invalid from",
    "Missing from",
    "`to` must be a non-empty string",
    "`amount` must be a positive integer",
    "`privacy` must be either `public` or `private`",
    "Sender is not listed in requiredSigners",
  ].includes(details);
}

function isUpstreamError(details: string): boolean {
  return (
    details.startsWith("MagicBlock transfer build failed") ||
    details.startsWith("TEE challenge request failed") ||
    details.startsWith("TEE auth request failed") ||
    details.startsWith("TEE challenge response did not include a challenge") ||
    details.startsWith("TEE auth response did not include a token") ||
    details === "TEE verification is not implemented in this sample"
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PaymentRequestInput;
    const response = await buildRemotePayment(loadConfig(), body);
    return jsonOk(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);

    if (isBadRequest(details)) {
      return jsonError(400, "Invalid payment request", details);
    }

    if (isUpstreamError(details)) {
      return jsonError(502, "Upstream MagicBlock request failed", details);
    }

    return jsonError(500, "Unable to build payment", details);
  }
}
