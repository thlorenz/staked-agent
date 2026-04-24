import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { buildDeposit } from "@/src/server/magicblock";

type DepositRequestBody = {
  owner?: string;
  amount?: number;
  mint?: string;
  cluster?: string;
  validator?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as DepositRequestBody;

    if (typeof body.owner !== "string" || body.owner.trim() === "") {
      return jsonError(400, "Invalid request body", "`owner` must be a non-empty string");
    }

    if (
      typeof body.amount !== "number" ||
      !Number.isFinite(body.amount) ||
      !Number.isInteger(body.amount) ||
      body.amount <= 0
    ) {
      return jsonError(400, "Invalid request body", "`amount` must be a positive integer");
    }

    const config = loadConfig();
    const response = await buildDeposit(config, {
      owner: body.owner.trim(),
      amount: body.amount,
      mint: body.mint?.trim() || config.usdcMint,
      cluster: body.cluster?.trim() || config.cluster,
      validator: body.validator?.trim() || undefined
    });

    return jsonOk(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (details.startsWith("MagicBlock deposit build failed")) {
      return jsonError(502, "Upstream MagicBlock request failed", details);
    }

    return jsonError(500, "Unable to build deposit transaction", details);
  }
}
