import test from "node:test";
import assert from "node:assert/strict";
import { calculateSafely } from "../lib/orion-tools.mjs";

test("handles arithmetic precedence and parentheses", () => {
  assert.equal(calculateSafely("(1250 * 18) / 100").result, 225);
  assert.equal(calculateSafely("2 + 3 * 4").result, 14);
});

test("handles decimals, unary signs, modulo, and powers", () => {
  assert.equal(calculateSafely("-(2.5 + 1.5) * 2").result, -8);
  assert.equal(calculateSafely("10 % 4").result, 2);
  assert.equal(calculateSafely("2^3^2").result, 512);
});

test("rejects unsupported input and malformed expressions", () => {
  for (const expression of ["", "2 / 0", "1 % 0", "2 + process.exit()", "1 +", "()", "2 ** 3"]) {
    assert.throws(() => calculateSafely(expression));
  }
});

test("rejects excessive input and non-finite results", () => {
  assert.throws(() => calculateSafely("1".repeat(161)));
  assert.throws(() => calculateSafely("9^999"));
});
