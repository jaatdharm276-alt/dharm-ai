import test from "node:test";
import assert from "node:assert/strict";
import { getAvailableAgentTools } from "../lib/orion-agent-tools.mjs";

const tools = [
  { type: "function", function: { name: "calculate" } },
  { type: "function", function: { name: "search_web" } },
];

test("keeps web search available before its per-task budget is used", () => {
  assert.deepEqual(getAvailableAgentTools(tools, { searchCalls: 0, maxSearchCalls: 1 }), tools);
});

test("removes web search after the per-task search budget is used", () => {
  assert.deepEqual(
    getAvailableAgentTools(tools, { searchCalls: 1, maxSearchCalls: 1 }),
    [tools[0]],
  );
});

test("removes web search after a search failure or successful result", () => {
  assert.deepEqual(getAvailableAgentTools(tools, { searchFailure: "provider unavailable" }), [tools[0]]);
  assert.deepEqual(getAvailableAgentTools(tools, { searchResults: { results: [{ url: "https://example.com" }] } }), [tools[0]]);
});

test("does not mutate the original tool definitions", () => {
  const result = getAvailableAgentTools(tools, { searchCalls: 1, maxSearchCalls: 1 });
  assert.equal(tools.length, 2);
  assert.equal(result.length, 1);
});
