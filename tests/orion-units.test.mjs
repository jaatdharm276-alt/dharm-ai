import test from "node:test";
import assert from "node:assert/strict";
import { convertUnits } from "../lib/orion-units.mjs";

test("converts common length, mass, and volume units", () => {
  assert.equal(convertUnits(1, "km", "m").result, 1000);
  assert.equal(convertUnits(2, "lb", "kg").result, 0.90718474);
  assert.equal(convertUnits(1, "liter", "ml").result, 1000);
});
test("converts temperature in both directions", () => {
  assert.equal(convertUnits(0, "C", "F").result, 32);
  assert.equal(convertUnits(32, "fahrenheit", "C").result, 0);
  assert.equal(convertUnits(0, "C", "K").result, 273.15);
});
test("supports decimal and binary data units", () => {
  assert.equal(convertUnits(1, "GB", "MB").result, 1000);
  assert.equal(convertUnits(1, "GiB", "MiB").result, 1024);
});
test("rejects invalid values and incompatible or unsupported units", () => {
  assert.throws(() => convertUnits("nope", "km", "m"));
  assert.throws(() => convertUnits(1, "kg", "m"));
  assert.throws(() => convertUnits(1, "C", "kg"));
});
