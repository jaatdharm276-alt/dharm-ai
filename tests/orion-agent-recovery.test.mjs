import test from "node:test";
import assert from "node:assert/strict";
import { buildPartialRecoveryAnswer } from "../lib/orion-agent-recovery.mjs";

test("preserves a useful draft when a later agent step fails", () => {
  const answer = buildPartialRecoveryAnswer({ draft: "The calculation result is 42." });
  assert.match(answer, /The calculation result is 42\./);
  assert.match(answer, /partial result/i);
});

test("returns bounded summaries of completed tool results when no draft exists", () => {
  const answer = buildPartialRecoveryAnswer({
    failureStage: "finalization",
    toolResults: [{ name: "calculate", result: { result: 42 } }],
  });
  assert.match(answer, /calculate/);
  assert.match(answer, /42/);
  assert.match(answer, /retry/i);
});

test("does not invent a result when no partial work exists", () => {
  const answer = buildPartialRecoveryAnswer();
  assert.match(answer, /could not complete/i);
  assert.doesNotMatch(answer, /successfully completed/i);
});

test("ignores malformed tool result entries", () => {
  const answer = buildPartialRecoveryAnswer({ toolResults: [null, {}, { name: "search_web" }] });
  assert.match(answer, /no completed result/i);
});
