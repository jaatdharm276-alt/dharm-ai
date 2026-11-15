import test from "node:test";
import assert from "node:assert/strict";
import { buildPartialRecoveryAnswer } from "../lib/orion-agent-recovery.mjs";

test("preserves a useful draft when a later agent step fails", () => {
  const answer = buildPartialRecoveryAnswer({ draft: "The calculation result is 42." });
  assert.match(answer, /The calculation result is 42\./);
  assert.match(answer, /आंशिक परिणाम/);
});

test("summarizes completed calculation results without raw JSON", () => {
  const answer = buildPartialRecoveryAnswer({
    failureStage: "finalization",
    toolResults: [{ name: "calculate", result: { result: 42 } }],
  });
  assert.match(answer, /calculate/);
  assert.match(answer, /42/);
  assert.match(answer, /दोबारा प्रयास/);
  assert.doesNotMatch(answer, /"result"\s*:/);
});

test("renders web sources as readable titles and links, not serialized payloads", () => {
  const answer = buildPartialRecoveryAnswer({
    failureStage: "finalization",
    toolResults: [{
      name: "search_web",
      result: { results: [{ title: "Industry 5.0 report", url: "https://example.org/report", content: "Relevant research excerpt" }] },
    }],
  });
  assert.match(answer, /Industry 5\.0 report/);
  assert.match(answer, /https:\/\/example\.org\/report/);
  assert.doesNotMatch(answer, /Relevant research excerpt/);
  assert.match(answer, /तथ्य सत्यापित नहीं/);
  assert.doesNotMatch(answer, /"results"\s*:/);
});

test("does not invent a result when no partial work exists", () => {
  const answer = buildPartialRecoveryAnswer();
  assert.match(answer, /पूरा नहीं कर पाया/);
  assert.doesNotMatch(answer, /successfully completed/i);
});

test("ignores malformed tool result entries", () => {
  const answer = buildPartialRecoveryAnswer({ toolResults: [null, {}, { name: "search_web" }] });
  assert.match(answer, /कोई पूरा परिणाम उपलब्ध नहीं है/);
});
