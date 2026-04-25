export function parseDecimalToAtomic(
  value: string,
  decimals: number,
  fieldName: string,
): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`${fieldName} must be a positive decimal.`);
  }

  const [wholePart, fractionPart = ""] = value.split(".");
  if (fractionPart.length > decimals) {
    throw new Error(`${fieldName} exceeds supported precision.`);
  }

  const whole = BigInt(wholePart);
  const paddedFraction = fractionPart.padEnd(decimals, "0");
  const atomic =
    whole * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");

  if (atomic <= 0n) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }

  return atomic;
}

export function formatAtomicToDecimal(
  amount: bigint,
  decimals: number,
): string {
  if (amount === 0n) {
    return "0";
  }

  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;
  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionString = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole.toString()}.${fractionString}`;
}

export function parseSignedSolCliAmount(value: string): {
  sign: 1 | -1;
  atomicAmount: bigint;
} {
  if (!/^[+-]\d+(\.\d+)?$/.test(value)) {
    throw new Error("Trade amount must be a signed decimal.");
  }

  const sign = value.startsWith("-") ? -1 : 1;
  const absoluteValue = value.slice(1);
  const atomicAmount = parseDecimalToAtomic(absoluteValue, 9, "trade amount");

  if (atomicAmount <= 0n) {
    throw new Error("Trade amount must be greater than zero.");
  }

  return { sign, atomicAmount };
}

export function parseUnsignedUsdcCliAmount(value: string): bigint {
  return parseDecimalToAtomic(value, 6, "fund amount");
}
