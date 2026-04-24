import { AppNav } from "@/src/components/app-nav";
import { loadConfig } from "@/src/server/config";
import { StakersSnapshotView } from "@/src/components/stakers-snapshot-view";
import { getStakersSnapshot } from "@/src/server/stakers/snapshot";

type StakersPageProps = {
  searchParams?: Promise<{
    timestamp?: string;
  }>;
};

export default async function StakersPage({ searchParams }: StakersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialSnapshot = getStakersSnapshot(
    loadConfig(),
    resolvedSearchParams.timestamp ?? null,
  );

  return (
    <main className="page-shell">
      <AppNav current="stakers" />
      <section className="panel">
        <p className="eyebrow">Stake distribution</p>
        <h1>Stakers</h1>
        <p className="lede">
          View how much of the recorded total stake each staker owned at a
          specific point in time.
        </p>
      </section>
      <StakersSnapshotView initialSnapshot={initialSnapshot} />
    </main>
  );
}
