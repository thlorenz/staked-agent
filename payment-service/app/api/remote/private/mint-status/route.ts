import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { getMintInitializationStatus } from "@/src/server/magicblock";

type MintStatusRequestBody = {
  mint?: string;
  cluster?: string;
  validator?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as MintStatusRequestBody;
    const config = loadConfig();
    const response = await getMintInitializationStatus(config, {
      mint: body.mint?.trim() || config.usdcMint,
      cluster: body.cluster?.trim() || config.cluster,
      validator: body.validator?.trim() || undefined
    });

    return jsonOk(response);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (details.startsWith("MagicBlock mint status request failed")) {
      return jsonError(502, "Upstream MagicBlock request failed", details);
    }

    return jsonError(500, "Unable to query mint initialization status", details);
  }
}
