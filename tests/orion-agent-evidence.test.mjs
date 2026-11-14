import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentEvidenceAnswer } from "../lib/orion-agent-evidence.mjs";

test("builds a readable partial answer from date and web evidence", () => {
  const answer = buildAgentEvidenceAnswer({ toolResults: [
    { name: "get_india_datetime", result: { timezone: "Asia/Kolkata", current: "Saturday, 14 November 2026 at 7:06 pm IST" } },
    { name: "search_web", result: { results: [{ title: "New Delhi | Britannica", url: "https://www.britannica.com/place/New-Delhi", content: "New Delhi is the national capital of India." }] } },
  ] });
  assert.match(answer, /New Delhi is the national capital of India/);
  assert.match(answer, /Asia\/Kolkata/);
  assert.match(answer, /https:\/\/www\.britannica\.com/);
  assert.match(answer, /आंशिक परिणाम/);
});
test("does not invent sources when tools returned none", () => {
  const answer = buildAgentEvidenceAnswer({ toolResults: [] });
  assert.match(answer, /पर्याप्त सत्यापित जानकारी उपलब्ध नहीं हुई/);
  assert.doesNotMatch(answer, /https:\/\//);
});
