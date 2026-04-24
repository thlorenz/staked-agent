export const runtime = "nodejs";

import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { listStakers } from "@/src/server/stakers/list";
import type { StakersResponse } from "@/src/server/types";

export async function GET(): Promise<Response> {
  try {
    const stakers = listStakers(loadConfig());
    return jsonOk<StakersResponse>({ ok: true, stakers });
  } catch (error) {
    return jsonError(
      500,
      "Unable to load stakers",
      error instanceof Error ? error.message : String(error),
    );
  }
}
