import type {
  ErrorResponse,
  StakersSnapshotResponse,
} from "@/src/server/types";

export const MINUTE_STEP_SECONDS = 60;
export const HOUR_STEP_SECONDS = 3600;
export const MINUTE_STEP_RANGE_THRESHOLD_SECONDS = 48 * 60 * 60;

export function getTimelineStepSeconds(
  firstStakeTimestamp: number | null,
  lastStakeTimestamp: number | null,
): number {
  if (firstStakeTimestamp === null || lastStakeTimestamp === null) {
    return MINUTE_STEP_SECONDS;
  }

  return lastStakeTimestamp - firstStakeTimestamp <=
    MINUTE_STEP_RANGE_THRESHOLD_SECONDS
    ? MINUTE_STEP_SECONDS
    : HOUR_STEP_SECONDS;
}

export function clampTimestamp(
  timestamp: number,
  minTimestamp: number,
  maxTimestamp: number,
): number {
  return Math.min(maxTimestamp, Math.max(minTimestamp, timestamp));
}

export function snapTimestampToStep(
  timestamp: number,
  minTimestamp: number,
  stepSeconds: number,
): number {
  const offset = timestamp - minTimestamp;
  const snappedOffset = Math.round(offset / stepSeconds) * stepSeconds;
  return minTimestamp + snappedOffset;
}

export async function fetchStakersSnapshot(
  timestamp: number,
): Promise<StakersSnapshotResponse> {
  const url = new URL("/api/stakers", window.location.origin);
  url.searchParams.set("timestamp", String(timestamp));

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const body = (await response.json()) as
    | StakersSnapshotResponse
    | ErrorResponse;

  if (!response.ok || !body.ok) {
    throw new Error(
      "details" in body && typeof body.details === "string"
        ? body.details
        : "Unable to load stakers.",
    );
  }

  return body;
}
