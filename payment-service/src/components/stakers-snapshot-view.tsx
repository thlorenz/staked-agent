"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  clampTimestamp,
  fetchStakersSnapshot,
  getTimelineStepSeconds,
  snapTimestampToStep,
} from "@/src/lib/stakers/client";
import { StakersTable } from "@/src/components/stakers-table";
import type { StakersSnapshotResponse } from "@/src/server/types";

type StakersSnapshotViewProps = {
  initialSnapshot: StakersSnapshotResponse;
};

const amountFormatter = new Intl.NumberFormat("en-US");
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function StakersSnapshotView({
  initialSnapshot,
}: StakersSnapshotViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSnapshot(initialSnapshot);
    setError(null);
  }, [initialSnapshot]);

  const firstStakeTimestamp = snapshot.timeline.firstStakeTimestamp;
  const lastStakeTimestamp = snapshot.timeline.lastStakeTimestamp;
  const sliderEnabled =
    firstStakeTimestamp !== null && lastStakeTimestamp !== null;
  const stepSeconds = getTimelineStepSeconds(
    firstStakeTimestamp,
    lastStakeTimestamp,
  );

  async function handleSnapshotChange(event: ChangeEvent<HTMLInputElement>) {
    if (
      !sliderEnabled ||
      firstStakeTimestamp === null ||
      lastStakeTimestamp === null
    ) {
      return;
    }

    const nextRawTimestamp = Number.parseInt(event.target.value, 10);
    const nextTimestamp = snapTimestampToStep(
      clampTimestamp(nextRawTimestamp, firstStakeTimestamp, lastStakeTimestamp),
      firstStakeTimestamp,
      stepSeconds,
    );

    setIsLoading(true);
    setError(null);

    try {
      const nextSnapshot = await fetchStakersSnapshot(nextTimestamp);
      setSnapshot(nextSnapshot);

      const params = new URLSearchParams(searchParams.toString());
      params.set("timestamp", String(nextSnapshot.timestamp));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!sliderEnabled) {
    return (
      <>
        <section className="panel snapshot-summary">
          <div className="snapshot-metrics">
            <p className="eyebrow">Snapshot total</p>
            <h2>{amountFormatter.format(0)}</h2>
          </div>
          <p className="lede">No stakers have been recorded yet.</p>
        </section>
        <StakersTable stakers={snapshot.stakers} />
      </>
    );
  }

  return (
    <>
      <section className="panel snapshot-summary">
        <div className="snapshot-metrics">
          <p className="eyebrow">Snapshot total</p>
          <h2>{amountFormatter.format(snapshot.totalStake)}</h2>
          <p className="snapshot-range">
            Selected time: {timeFormatter.format(snapshot.timestamp * 1000)}
          </p>
          <p className="snapshot-range">
            Range: {timeFormatter.format(firstStakeTimestamp * 1000)} to{" "}
            {timeFormatter.format(lastStakeTimestamp * 1000)}
          </p>
        </div>
        <input
          className="timeline-slider"
          type="range"
          min={firstStakeTimestamp}
          max={lastStakeTimestamp}
          step={stepSeconds}
          value={snapshot.timestamp}
          onChange={handleSnapshotChange}
        />
        <p className="timeline-status">
          {isLoading ? "Loading snapshot..." : (error ?? null)}
        </p>
      </section>
      <StakersTable stakers={snapshot.stakers} />
    </>
  );
}
