import test from "node:test";
import assert from "node:assert/strict";
import { getOfflineQuickAnswer } from "../lib/orion-quick-actions.mjs";

const fixed = new Date("2026-11-14T06:30:00.000Z");

test("answers India date and time without an external model", () => {
  assert.match(getOfflineQuickAnswer("aaj ki date kya hai", fixed), /भारत में आज की तारीख:/);
  assert.match(getOfflineQuickAnswer("abhi kitne baje", fixed), /भारत में अभी समय:/);
  assert.match(getOfflineQuickAnswer("what is today's date", fixed), /Asia\/Kolkata/);
});

test("calculates explicit and simple Hindi or symbolic arithmetic", () => {
  assert.equal(getOfflineQuickAnswer("calculate 25 * 4", fixed), "25 * 4 = 100.");
  assert.equal(getOfflineQuickAnswer("2 + 2", fixed), "2 + 2 = 4.");
  assert.equal(getOfflineQuickAnswer("8 plus 7", fixed), "8+7 = 15.");
  assert.equal(getOfflineQuickAnswer("9 गुना 3", fixed), "9*3 = 27.");
});

test("converts supported units offline", () => {
  assert.equal(getOfflineQuickAnswer("convert 5 km to m", fixed), "5 km = 5000 m.");
  assert.equal(getOfflineQuickAnswer("32 F in C", fixed), "32 F = 0 C.");
});

test("does not intercept normal questions or unsupported conversions", () => {
  assert.equal(getOfflineQuickAnswer("Mujhe Jaipur ka rasta batao", fixed), null);
  assert.equal(getOfflineQuickAnswer("convert 3 bananas to apples", fixed), null);
});
