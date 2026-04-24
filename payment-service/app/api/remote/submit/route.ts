export const runtime = "nodejs";

import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { submitSignedTransactionBase64 } from "@/src/server/payments/submit";
import type { PublicStakeSubmitRequest } from "@/src/server/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PublicStakeSubmitRequest;

    if (
      typeof body.signedTransactionBase64 !== "string" ||
      body.signedTransactionBase64.trim() === ""
    ) {
      return jsonError(
        400,
        "Invalid request body",
        "`signedTransactionBase64` must be a non-empty string",
      );
    }

    if (
      typeof body.stakerPubkey !== "string" ||
      body.stakerPubkey.trim() === ""
    ) {
      return jsonError(
        400,
        "Invalid request body",
        "`stakerPubkey` must be a non-empty string",
      );
    }

    if (
      typeof body.destination !== "string" ||
      body.destination.trim() === ""
    ) {
      return jsonError(
        400,
        "Invalid request body",
        "`destination` must be a non-empty string",
      );
    }

    if (
      typeof body.amount !== "number" ||
      !Number.isInteger(body.amount) ||
      body.amount <= 0
    ) {
      return jsonError(
        400,
        "Invalid request body",
        "`amount` must be a positive integer",
      );
    }

    if (body.privacy !== "public") {
      return jsonError(
        400,
        "Invalid request body",
        "`privacy` must be `public`",
      );
    }

    const response = await submitSignedTransactionBase64(loadConfig(), {
      signedTransactionBase64: body.signedTransactionBase64.trim(),
      stakerPubkey: body.stakerPubkey.trim(),
      destination: body.destination.trim(),
      amount: body.amount,
      privacy: "public",
    });

    return jsonOk(response);
  } catch (error) {
    return jsonError(
      500,
      "Unable to submit signed transaction",
      error instanceof Error ? error.message : String(error),
    );
  }
}
