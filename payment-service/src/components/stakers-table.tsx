import type { StakerLeaderboardEntry } from "@/src/server/types";

type StakersTableProps = {
  stakers: StakerLeaderboardEntry[];
};

const amountFormatter = new Intl.NumberFormat("en-US");
const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function StakersTable({ stakers }: StakersTableProps) {
  if (stakers.length === 0) {
    return (
      <section className="panel">
        <p className="empty-state">No stakers recorded yet.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="table-scroll">
        <table className="stakers-table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Staker</th>
              <th scope="col">Share</th>
              <th scope="col">Stakes</th>
              <th scope="col">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {stakers.map((staker, index) => (
              <tr key={staker.displayName}>
                <td>{index + 1}</td>
                <td>{staker.displayName}</td>
                <td className="numeric-cell">
                  {percentageFormatter.format(staker.percentageOfTotal)}
                </td>
                <td className="numeric-cell">{staker.stakeCount}</td>
                <td className="numeric-cell">
                  {amountFormatter.format(staker.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
