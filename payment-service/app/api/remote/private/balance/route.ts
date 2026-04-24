import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { getPrivatePaymentBalance } from "@/src/server/payments/private-payment/balance";

type PrivateBalanceRequestBody = {
  address?: string;
  authToken?: string;
  mint?: string;
  cluster?: string;
  validator?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PrivateBalanceRequestBody;

    if (typeof body.address !== "string" || body.address.trim() === "") {
      return jsonError(
        400,
        "Invalid request body",
        "`address` must be a non-empty string",
      );
    }

    if (typeof body.authToken !== "string" || body.authToken.trim() === "") {
      return jsonError(
        400,
        "Invalid request body",
        "`authToken` must be a non-empty string",
      );
    }

    const config = loadConfig();
    const response = await getPrivatePaymentBalance(config, {
      address: body.address.trim(),
      authToken: body.authToken.trim(),
      mint: body.mint?.trim() || config.usdcMint,
      cluster: body.cluster?.trim() || config.cluster,
      validator: body.validator?.trim() || undefined,
    });

    return jsonOk(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (details.startsWith("MagicBlock private balance request failed")) {
      return jsonError(502, "Upstream MagicBlock request failed", details);
    }

    return jsonError(500, "Unable to query private balance", details);
  }
}
