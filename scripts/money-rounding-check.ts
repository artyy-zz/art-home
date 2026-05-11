import assert from "node:assert/strict";
import {
  calculatePercentageCents,
  centsToDecimalString,
  formatCurrencyCents,
  multiplyCentsByDecimal,
  parseMoneyToCents,
} from "../src/lib/money";
import { calculateTotals } from "../src/lib/erp";

const exactMoneyExamples = ["19.98", "19.99", "20.00", "20.01", "105.50"];

for (const amount of exactMoneyExamples) {
  const cents = parseMoneyToCents(amount);
  assert.equal(centsToDecimalString(cents), amount);
}

assert.equal(formatCurrencyCents(parseMoneyToCents("19.98"), "en-GB"), "€19.98");
assert.equal(formatCurrencyCents(parseMoneyToCents("20"), "en-GB"), "€20.00");
assert.equal(formatCurrencyCents(parseMoneyToCents("105.50"), "en-GB"), "€105.50");

assert.equal(calculatePercentageCents(parseMoneyToCents("19.98"), 18), 360);
assert.deepEqual(calculateTotals(parseMoneyToCents("19.98"), true, 18), {
  subtotalCents: 1998,
  vatEnabled: true,
  vatRate: 18,
  vatAmountCents: 360,
  totalCents: 2358,
});

assert.equal(multiplyCentsByDecimal(parseMoneyToCents("19.99"), "3"), 5997);
assert.equal(multiplyCentsByDecimal(parseMoneyToCents("20.01"), "2"), 4002);

const discountCents = calculatePercentageCents(parseMoneyToCents("19.98"), 10);
const discountedSubtotalCents = parseMoneyToCents("19.98") - discountCents;
assert.equal(centsToDecimalString(discountCents), "2.00");
assert.equal(centsToDecimalString(discountedSubtotalCents), "17.98");
assert.equal(centsToDecimalString(calculatePercentageCents(discountedSubtotalCents, 18)), "3.24");

console.log("Money rounding checks passed.");
