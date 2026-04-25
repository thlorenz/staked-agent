import type { AppConfig } from "@/src/server/config";
import { getDatabase } from "@/src/db/client";
import { ensureStakePaymentsSchema } from "@/src/db/schema";
import {
  getStakeTimeline,
  listStakerTotalsAtTimestamp,
} from "@/src/db/stake-payments";
import type {
  StakersSnapshotResponse,
  StakersTimeline,
} from "@/src/server/types";

function getNowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function parseTimestampParam(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new RangeError(
      "`timestamp` must be a Unix timestamp in whole seconds.",
    );
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new RangeError(
      "`timestamp` must be a Unix timestamp in whole seconds.",
    );
  }

  return parsed;
}

function clampTimestamp(timestamp: number, timeline: StakersTimeline): number {
  if (
    timeline.firstStakeTimestamp === null ||
    timeline.lastStakeTimestamp === null
  ) {
    return timestamp;
  }

  return Math.min(
    timeline.lastStakeTimestamp,
    Math.max(timeline.firstStakeTimestamp, timestamp),
  );
}

export function getStakersSnapshot(
  config: AppConfig,
  requestedTimestamp?: string | null,
): StakersSnapshotResponse {
  const db = getDatabase(config.sqliteDbPath);
  ensureStakePaymentsSchema(db);

  const timeline = getStakeTimeline(db);
  const fallbackTimestamp =
    timeline.lastStakeTimestamp !== null
      ? timeline.lastStakeTimestamp
      : getNowUnixSeconds();
  const requestedOrDefaultTimestamp =
    requestedTimestamp === undefined ||
    requestedTimestamp === null ||
    requestedTimestamp === ""
      ? fallbackTimestamp
      : parseTimestampParam(requestedTimestamp);
  const effectiveTimestamp = clampTimestamp(
    requestedOrDefaultTimestamp,
    timeline,
  );
  const totals = listStakerTotalsAtTimestamp(db, effectiveTimestamp);
  const totalStake = totals.reduce((sum, row) => sum + row.totalAmount, 0);
  const stakers =
    totalStake === 0
      ? []
      : totals.map((row) => ({
          stakerPubkey: row.stakerPubkey,
          totalAmount: row.totalAmount,
          percentageOfTotal: row.totalAmount / totalStake,
        }));

  return {
    ok: true,
    timestamp: effectiveTimestamp,
    totalStake,
    timeline,
    stakers,
  };
}
