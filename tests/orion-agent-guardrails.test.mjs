import test from "node:test";
import assert from "node:assert/strict";
import { validateAgentToolArgs, summarizeToolResult } from "../lib/orion-agent-guardrails.mjs";

test("accepts only the declared arguments for each available tool", () => {
  assert.deepEqual(validateAgentToolArgs("get_india_datetime", {}), {});
  assert.deepEqual(validateAgentToolArgs("calculate", { expression: "(2 + 3) * 4" }), { expression: "(2 + 3) * 4" });
  assert.deepEqual(validateAgentToolArgs("search_web", { query: "latest India news" }), { query: "latest India news" });
  assert.throws(() => validateAgentToolArgs("search_web", { query: "news", extra: "unexpected" }), /Unexpected tool argument/);
  assert.throws(() => validateAgentToolArgs("delete_files", {}), /not available/);
});

test("rejects malformed and oversized calculation or search arguments", () => {
  assert.throws(() => validateAgentToolArgs("calculate", { expression: "x".repeat(161) }), /160 character limit/);
  assert.throws(() => validateAgentToolArgs("calculate", { expression: 4 }), /must be a string/);
  assert.throws(() => validateAgentToolArgs("search_web", { query: "x".repeat(501) }), /500 character limit/);
  assert.throws(() => validateAgentToolArgs("search_web", { query: "  " }), /cannot be empty/);
});

test("bounds text and unit conversion inputs", () => {
  assert.throws(() => validateAgentToolArgs("analyze_text", { text: "x".repeat(50_001) }), /50,000 character limit/);
  assert.throws(() => validateAgentToolArgs("convert_units", { value: Infinity, from: "km", to: "m" }), /finite number/);
  assert.throws(() => validateAgentToolArgs("convert_units", { value: 1, from: "km".repeat(20), to: "m" }), /24 character limit/);
});

test("limits specialist roles, task sizes, and duplicate parallel roles", () => {
  assert.throws(() => validateAgentToolArgs("delegate_specialist", { role: "admin", task: "Do it" }), /Unsupported specialist role/);
  assert.throws(() => validateAgentToolArgs("delegate_specialist", { role: "coder", task: "x".repeat(5001) }), /5,000 character limit/);
  assert.throws(() => validateAgentToolArgs("coordinate_specialists", { roles: ["coder", "coder"], task: "Review" }), /distinct supported/);
  assert.deepEqual(validateAgentToolArgs("coordinate_specialists", { roles: ["coder", "security_reviewer"], task: "Review" }), { roles: ["coder", "security_reviewer"], task: "Review" });
});

test("tool output remains valid JSON when bounded", () => {
  const output = summarizeToolResult({ data: "x".repeat(5000) }, 1000);
  const parsed = JSON.parse(output);
  assert.equal(parsed.truncated, true);
  assert.equal(parsed.originalCharacters > 5000, true);
  assert.match(parsed.note, /truncated/);
});

test("preserves compact tool results without truncation", () => {
  assert.equal(summarizeToolResult({ result: 42 }), JSON.stringify({ result: 42 }));
});
