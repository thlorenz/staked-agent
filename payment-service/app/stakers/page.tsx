import { AppNav } from "@/src/components/app-nav";
import { StakersTable } from "@/src/components/stakers-table";
import { loadConfig } from "@/src/server/config";
import { listStakers } from "@/src/server/stakers/list";

export default function StakersPage() {
  const stakers = listStakers(loadConfig());

  return (
    <main className="page-shell">
      <AppNav current="stakers" />
      <section className="panel">
        <p className="eyebrow">Stake leaderboard</p>
        <h1>Stakers</h1>
        <p className="lede">
          Anonymous stakers ranked by how many recorded public stakes they have
          made, with the total amount shown alongside the count.
        </p>
      </section>
      <StakersTable stakers={stakers} />
    </main>
  );
}
