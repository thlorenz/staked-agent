import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { submitSignedTransactionBase64 } from "@/src/server/payments/submit";

type SubmitRequestBody = {
  signedTransactionBase64?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as SubmitRequestBody;

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

    const response = await submitSignedTransactionBase64(
      loadConfig(),
      body.signedTransactionBase64.trim(),
    );

    return jsonOk(response);
  } catch (error) {
    return jsonError(
      500,
      "Unable to submit signed transaction",
      error instanceof Error ? error.message : String(error),
    );
  }
}
