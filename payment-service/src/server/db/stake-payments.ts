import type Database from "better-sqlite3";

export type StakePaymentStatus = "confirmed";

export type StakePaymentRecord = {
  id: number;
  signature: string;
  stakerPubkey: string;
  agentPubkey: string;
  amount: number;
  slot: number;
  blockTime: number | null;
  stakedAt: string;
  status: StakePaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type InsertStakePaymentInput = {
  signature: string;
  stakerPubkey: string;
  agentPubkey: string;
  amount: number;
  slot: number;
  blockTime: number | null;
  stakedAt: string;
  status: StakePaymentStatus;
};

type StakePaymentRow = {
  id: number;
  signature: string;
  staker_pubkey: string;
  agent_pubkey: string;
  amount: number;
  slot: number;
  block_time: number | null;
  staked_at: string;
  status: StakePaymentStatus;
  created_at: string;
  updated_at: string;
};

function mapStakePaymentRow(row: StakePaymentRow): StakePaymentRecord {
  return {
    id: row.id,
    signature: row.signature,
    stakerPubkey: row.staker_pubkey,
    agentPubkey: row.agent_pubkey,
    amount: row.amount,
    slot: row.slot,
    blockTime: row.block_time,
    stakedAt: row.staked_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getStakePaymentBySignature(
  db: Database.Database,
  signature: string,
): StakePaymentRecord | null {
  const row = db
    .prepare(
      `
      SELECT
        id,
        signature,
        staker_pubkey,
        agent_pubkey,
        amount,
        slot,
        block_time,
        staked_at,
        status,
        created_at,
        updated_at
      FROM stake_payments
      WHERE signature = ?
      `,
    )
    .get(signature) as StakePaymentRow | undefined;

  return row ? mapStakePaymentRow(row) : null;
}

export function insertStakePayment(
  db: Database.Database,
  input: InsertStakePaymentInput,
): StakePaymentRecord {
  db.prepare(
    `
    INSERT INTO stake_payments (
      signature,
      staker_pubkey,
      agent_pubkey,
      amount,
      slot,
      block_time,
      staked_at,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(signature) DO NOTHING
    `,
  ).run(
    input.signature,
    input.stakerPubkey,
    input.agentPubkey,
    input.amount,
    input.slot,
    input.blockTime,
    input.stakedAt,
    input.status,
  );

  const record = getStakePaymentBySignature(db, input.signature);
  if (!record) {
    throw new Error(
      `Unable to load stake payment for signature ${input.signature}`,
    );
  }

  return record;
}
