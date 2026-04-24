export const runtime = "nodejs";

import { loadConfig } from "@/src/server/config";
import { jsonError, jsonOk } from "@/src/server/http";
import { getStakersSnapshot } from "@/src/server/stakers/snapshot";
import type { StakersSnapshotResponse } from "@/src/server/types";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const timestamp = url.searchParams.get("timestamp");
    const snapshot = getStakersSnapshot(loadConfig(), timestamp);
    return jsonOk<StakersSnapshotResponse>(snapshot);
  } catch (error) {
    if (error instanceof RangeError) {
      return jsonError(400, "Invalid timestamp", error.message);
    }

    return jsonError(
      500,
      "Unable to load stakers",
      error instanceof Error ? error.message : String(error),
    );
  }
}
