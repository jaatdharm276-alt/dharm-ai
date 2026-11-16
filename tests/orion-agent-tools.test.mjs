import test from "node:test";
import assert from "node:assert/strict";
import { getAvailableAgentTools } from "../lib/orion-agent-tools.mjs";

const tools = [
  { type: "function", function: { name: "calculate" } },
  { type: "function", function: { name: "search_web" } },
];

test("keeps the declared tool schema stable before and after search", () => {
  assert.deepEqual(getAvailableAgentTools(tools), tools);
  assert.deepEqual(getAvailableAgentTools(tools, { searchCalls: 1, maxSearchCalls: 1 }), tools);
  assert.deepEqual(getAvailableAgentTools(tools, { searchFailure: "provider unavailable" }), tools);
  assert.deepEqual(getAvailableAgentTools(tools, { searchResults: { results: [{ url: "https://example.com" }] } }), tools);
});

test("does not mutate the original tool definitions", () => {
  const result = getAvailableAgentTools(tools, { searchCalls: 1, maxSearchCalls: 1 });
  assert.equal(tools.length, 2);
  assert.equal(result.length, 2);
  assert.equal(result, tools);
});
