const MONEY_DECIMAL_PLACES = 2;
const MONEY_SCALE = BigInt(100);
const RATE_BASIS_POINT_SCALE = BigInt(100);
const PERCENT_DIVISOR = BigInt(100) * RATE_BASIS_POINT_SCALE;
const DECIMAL_MULTIPLIER_SCALE = BigInt(10000);

function normalizeDecimalInput(value: string | number) {
  return String(value).trim().replace(/\s/g, "").replace(",", ".");
}

function parseDecimalToScaledInteger(
  value: string | number,
  decimalPlaces: number,
) {
  const normalized = normalizeDecimalInput(value);
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(normalized);

  if (!match) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const sign = match[1] === "-" ? BigInt(-1) : BigInt(1);
  const whole = BigInt(match[2]);
  const decimals = match[3] ?? "";
  const scale = BigInt(10) ** BigInt(decimalPlaces);
  const paddedDecimals = decimals.padEnd(decimalPlaces + 1, "0");
  const keptDecimals = paddedDecimals.slice(0, decimalPlaces);
  const nextDecimal = paddedDecimals[decimalPlaces] ?? "0";
  const roundedDecimals =
    BigInt(keptDecimals || "0") + (nextDecimal >= "5" ? BigInt(1) : BigInt(0));

  return sign * (whole * scale + roundedDecimals);
}

function toSafeNumber(value: bigint) {
  const asNumber = Number(value);

  if (!Number.isSafeInteger(asNumber)) {
    throw new Error("Money value is outside the safe integer range.");
  }

  return asNumber;
}

function roundRatio(numerator: bigint, denominator: bigint) {
  if (denominator <= BigInt(0)) {
    throw new Error("Denominator must be positive.");
  }

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * BigInt(2) >= denominator ? quotient + BigInt(1) : quotient;
}

export function parseMoneyToCents(value: string | number | null | undefined) {
  if (value == null || normalizeDecimalInput(value) === "") {
    return 0;
  }

  return toSafeNumber(parseDecimalToScaledInteger(value, MONEY_DECIMAL_PLACES));
}

export function centsToDecimalString(amountCents: number) {
  const sign = amountCents < 0 ? "-" : "";
  const absoluteCents = BigInt(Math.abs(amountCents));
  const euros = absoluteCents / MONEY_SCALE;
  const cents = absoluteCents % MONEY_SCALE;
  return `${sign}${euros}.${cents.toString().padStart(2, "0")}`;
}

export function formatCurrencyCents(amountCents: number, locale = "sq-AL") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export function calculatePercentageCents(amountCents: number, percent: number) {
  const basisPoints = parseDecimalToScaledInteger(percent, 2);
  const numerator = BigInt(amountCents) * basisPoints;
  return toSafeNumber(roundRatio(numerator, PERCENT_DIVISOR));
}

export function multiplyCentsByDecimal(
  amountCents: number,
  multiplier: string | number,
) {
  const scaledMultiplier = parseDecimalToScaledInteger(multiplier, 4);
  const numerator = BigInt(amountCents) * scaledMultiplier;
  return toSafeNumber(roundRatio(numerator, DECIMAL_MULTIPLIER_SCALE));
}
