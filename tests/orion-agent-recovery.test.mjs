import test from "node:test";
import assert from "node:assert/strict";
import { buildPartialRecoveryAnswer } from "../lib/orion-agent-recovery.mjs";

test("withholds an unverified draft when a later agent step fails", () => {
  const answer = buildPartialRecoveryAnswer({ draft: "The calculation result is 42." });
  assert.ok(!answer.includes("The calculation result is 42."));
  assert.ok(answer.includes("कोई पूरा परिणाम उपलब्ध नहीं है"));
});

test("summarizes completed calculation results without raw JSON", () => {
  const answer = buildPartialRecoveryAnswer({
    failureStage: "finalization",
    toolResults: [{ name: "calculate", result: { result: 42 } }],
  });
  assert.ok(answer.includes("calculate"));
  assert.ok(answer.includes("42"));
  assert.ok(answer.includes("दोबारा प्रयास"));
  assert.ok(!answer.includes('"result":'));
});

test("renders web sources as readable titles and links without asserting snippets", () => {
  const answer = buildPartialRecoveryAnswer({
    failureStage: "finalization",
    toolResults: [{
      name: "search_web",
      result: { results: [{ title: "Industry 5.0 report", url: "https://example.org/report", content: "Relevant research excerpt" }] },
    }],
  });
  assert.ok(answer.includes("Industry 5.0 report"));
  assert.ok(answer.includes("https://example.org/report"));
  assert.ok(!answer.includes("Relevant research excerpt"));
  assert.ok(answer.includes("तथ्य सत्यापित नहीं"));
  assert.ok(!answer.includes('"results":'));
});

test("does not invent a result when no partial work exists", () => {
  const answer = buildPartialRecoveryAnswer();
  assert.ok(answer.includes("पूरा नहीं कर पाया"));
  assert.ok(!answer.includes("successfully completed"));
});

test("ignores malformed tool result entries", () => {
  const answer = buildPartialRecoveryAnswer({ toolResults: [null, {}, { name: "search_web" }] });
  assert.ok(answer.includes("कोई पूरा परिणाम उपलब्ध नहीं है"));
});

test("explains a failed web search instead of returning an empty recovery message", () => {
  const answer = buildPartialRecoveryAnswer({
    draft: "The movie budget may be around ₹100 crore.",
    toolResults: [{
      name: "search_web",
      result: { error: "Tavily HTTP 429; Bing RSS returned no topic-relevant sources." },
    }],
    failureStage: "tool",
  });
  assert.ok(answer.trim().length > 0);
  assert.match(answer, /वेब खोज पूरी नहीं हो सकी/);
  assert.match(answer, /Tavily HTTP 429/);
  assert.doesNotMatch(answer, /₹100 crore/);
});

test("reports search links without claiming that the facts were verified", () => {
  const answer = buildPartialRecoveryAnswer({
    toolResults: [{
      name: "search_web",
      result: { results: [{ title: "Example source", url: "https://example.com", snippet: "Relevant detail" }] },
    }],
    failureStage: "verification",
  });
  assert.match(answer, /प्रासंगिकता\/तथ्य सत्यापित नहीं/);
  assert.match(answer, /https:\/\/example.com/);
});
