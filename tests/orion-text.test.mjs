import test from "node:test";
import assert from "node:assert/strict";
import { analyzeText, MAX_ANALYZED_TEXT_CHARS } from "../lib/orion-text.mjs";

test("analyzes English text counts and reading time", () => {
  assert.deepEqual(analyzeText("Hello world.\nThis is ORION!"), {
    characters: 27,
    charactersWithoutWhitespace: 22,
    words: 5,
    sentences: 2,
    lines: 2,
    readingTimeMinutes: 1,
    readingSpeedWordsPerMinute: 200,
  });
});

test("counts Hindi words and danda sentence boundaries", () => {
  const result = analyzeText("नमस्ते दुनिया। आप कैसे हैं?");
  assert.equal(result.words, 5);
  assert.equal(result.sentences, 2);
});

test("handles empty text", () => {
  assert.deepEqual(analyzeText(""), {
    characters: 0,
    charactersWithoutWhitespace: 0,
    words: 0,
    sentences: 0,
    lines: 0,
    readingTimeMinutes: 0,
    readingSpeedWordsPerMinute: 200,
  });
});

test("counts Unicode code points rather than UTF-16 units", () => {
  const result = analyzeText("A😀 B");
  assert.equal(result.characters, 4);
  assert.equal(result.charactersWithoutWhitespace, 3);
  assert.equal(result.words, 2);
});

test("rejects invalid input and oversized text", () => {
  assert.throws(() => analyzeText(null), /string/);
  assert.throws(() => analyzeText("x".repeat(MAX_ANALYZED_TEXT_CHARS + 1)), /limit/);
});
