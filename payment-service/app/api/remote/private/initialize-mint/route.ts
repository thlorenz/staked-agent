import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { buildPrivateInitializeMint } from "@/src/server/payments/private-payment/mint";

type InitializeMintRequestBody = {
  owner?: string;
  payer?: string;
  mint?: string;
  cluster?: string;
  validator?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as InitializeMintRequestBody;

    if (typeof body.owner !== "string" || body.owner.trim() === "") {
      return jsonError(
        400,
        "Invalid request body",
        "`owner` must be a non-empty string",
      );
    }

    const owner = body.owner.trim();
    const payer = body.payer?.trim() || owner;
    const config = loadConfig();

    const response = await buildPrivateInitializeMint(config, {
      owner,
      payer,
      mint: body.mint?.trim() || config.usdcMint,
      cluster: body.cluster?.trim() || config.cluster,
      validator: body.validator?.trim() || undefined,
    });

    return jsonOk(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (details.startsWith("MagicBlock initialize mint failed")) {
      return jsonError(502, "Upstream MagicBlock request failed", details);
    }

    return jsonError(
      500,
      "Unable to build initialize mint transaction",
      details,
    );
  }
}
