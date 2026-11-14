import test from "node:test";
import assert from "node:assert/strict";
import { mergeRecognizedSegments } from "../lib/orion-voice.mjs";

test("replaces cumulative Hindi speech hypotheses instead of repeating them", () => {
  assert.equal(
    mergeRecognizedSegments(["तुम्हें", "तुम्हें किसने", "तुम्हें किसने बनाया"]),
    "तुम्हें किसने बनाया",
  );
});

test("ignores exact duplicate finalized segments", () => {
  assert.equal(
    mergeRecognizedSegments(["मेरा नाम धर्म है", "मेरा नाम धर्म है"]),
    "मेरा नाम धर्म है",
  );
});

test("merges adjacent speech segments without losing words", () => {
  assert.equal(
    mergeRecognizedSegments(["मेरा नाम", "धर्म है", "और मैं राजस्थान से हूँ"]),
    "मेरा नाम धर्म है और मैं राजस्थान से हूँ",
  );
});

test("removes overlapping word boundaries", () => {
  assert.equal(
    mergeRecognizedSegments(["आज मौसम बहुत", "बहुत अच्छा है"]),
    "आज मौसम बहुत अच्छा है",
  );
});

test("handles empty and non-array input", () => {
  assert.equal(mergeRecognizedSegments([]), "");
  assert.equal(mergeRecognizedSegments(null), "");
});

test("collapses repeated cumulative Hindi phrases inside one recognition chunk", () => {
  assert.equal(
    mergeRecognizedSegments(["तुम्हें तुम्हें किसने तुम्हें किसने बनाया तुम्हें किसने बनाया"]),
    "तुम्हें किसने बनाया",
  );
});
