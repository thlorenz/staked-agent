const LAMPORTS_PER_SOL = 1_000_000_000n;

export type BuySizingInput = {
  solHeldLamports: bigint;
  priceUsdcPerSol: number;
  buyPercent: number; // (0, 100]
};

/**
 * Returns the SOL amount (in lamports) to buy. The buy size is
 * `buyPercent` of the USDC value of currently held SOL, converted
 * back to lamports using the latest price.
 */
export function computeBuySolAmount(input: BuySizingInput): bigint {
  if (input.priceUsdcPerSol <= 0) {
    return 0n;
  }
  if (input.solHeldLamports <= 0n) {
    return 0n;
  }
  const heldSol = Number(input.solHeldLamports) / Number(LAMPORTS_PER_SOL);
  const usdcValueOfHeld = heldSol * input.priceUsdcPerSol;
  const usdcToSpend = usdcValueOfHeld * (input.buyPercent / 100);
  const solToBuy = usdcToSpend / input.priceUsdcPerSol;
  const lamports = BigInt(Math.floor(solToBuy * Number(LAMPORTS_PER_SOL)));
  return lamports > 0n ? lamports : 0n;
}

export type SellSizingInput = {
  solHeldLamports: bigint;
  sellPercent: number; // (0, 100]
  feeReserveLamports: bigint;
};

/**
 * Returns the SOL amount (in lamports) to sell. The amount is
 * `sellPercent` of currently held SOL, then capped so that
 * `solHeldLamports - sellAmount >= feeReserveLamports`.
 * Returns 0n if there is nothing safe to sell.
 */
export function computeSellSolAmount(input: SellSizingInput): bigint {
  if (input.solHeldLamports <= input.feeReserveLamports) {
    return 0n;
  }
  const sellable = input.solHeldLamports - input.feeReserveLamports;
  const percentNumerator = BigInt(Math.floor(input.sellPercent * 100));
  const desired = (input.solHeldLamports * percentNumerator) / 10_000n;
  const capped = desired > sellable ? sellable : desired;
  return capped > 0n ? capped : 0n;
}
