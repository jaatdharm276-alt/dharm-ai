import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentEvidenceAnswer,
  buildObjectiveSearchQuery,
  isRelevantAgentSource,
} from "../lib/orion-agent-evidence.mjs";

const objective = "भारत और जापान में Industry 5.0 के विकास की तुलना करो। 2022 से 2026 तक Robotics, AI और Automation के वास्तविक आँकड़े खोजो।";

test("builds a readable partial answer from relevant web evidence", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "get_india_datetime", result: { timezone: "Asia/Kolkata", current: "Saturday, 14 November 2026 at 7:06 pm IST" } },
    { name: "search_web", result: { results: [
      { title: "Japan Industry 5.0 robotics AI", url: "https://example.org/japan-industry", content: "Japan is investing in Industry 5.0 robotics and AI automation." },
    ] } },
  ] });
  assert.doesNotMatch(answer, /Japan is investing/);
  assert.match(answer, /कोई तथ्यात्मक दावा/);
  assert.match(answer, /Asia\/Kolkata/);
  assert.match(answer, /https:\/\/example\.org/);
  assert.match(answer, /आंशिक परिणाम/);
});

test("rejects unrelated general country pages for a specific research task", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "search_web", result: { results: [
      { title: "India - Wikipedia", url: "https://en.wikipedia.org/wiki/India", content: "India is a country in South Asia and the world's most populous country." },
    ] } },
  ] });
  assert.match(answer, /मुख्य विषय से मेल खाने वाला/);
  assert.doesNotMatch(answer, /wikipedia\.org/);
});

test("removes bracketed citation artifacts from snippets", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "search_web", result: { results: [
      { title: "Industry 5.0 India Japan", url: "https://example.org/i5", content: "Industry 5.0 [20] in India and Japan [[21]] supports robotics." },
    ] } },
  ] });
  assert.doesNotMatch(answer, /\[\[?\d+/);
});

test("builds search queries from both task topic and model suggestion", () => {
  const query = buildObjectiveSearchQuery(objective, "India general facts");
  assert.match(query, /Industry 5.0/);
  assert.match(query, /Japan/);
  assert.match(query, /India general facts/);
});

test("requires multiple overlapping topic terms, including source URL metadata", () => {
  assert.equal(isRelevantAgentSource({ title: "India", content: "India is a country." }, objective), false);
  assert.equal(isRelevantAgentSource({ title: "Industry 5.0 Japan robotics", content: "Japan uses robotics and AI automation." }, objective), true);
});

test("does not leak an unverified draft when the verifier fails", async () => {
  const { buildPartialRecoveryAnswer } = await import("../lib/orion-agent-recovery.mjs");
  const answer = buildPartialRecoveryAnswer({
    draft: "ABB opened a factory in 2022 and productivity increased by 40%.",
    failureStage: "verification",
    toolResults: [{ name: "search_web", result: { results: [
      { title: "Industry 5.0 market overview", url: "https://example.org/industry-5" },
    ] } }],
  });
  assert.doesNotMatch(answer, /ABB opened/);
  assert.doesNotMatch(answer, /40%/);
  assert.match(answer, /Verification पूरी न होने/);
  assert.match(answer, /https:\/\/example\.org\/industry-5/);
});

test("evidence fallback lists relevant sources without asserting their snippets as facts", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "search_web", result: { results: [
      { title: "Industry 5.0 Japan robotics", url: "https://example.org/japan", content: "Unsupported claim that output rose 99%." },
    ] } },
  ] });
  assert.match(answer, /https:\/\/example\.org\/japan/);
  assert.doesNotMatch(answer, /output rose 99%/);
  assert.match(answer, /कोई तथ्यात्मक दावा/);
});
