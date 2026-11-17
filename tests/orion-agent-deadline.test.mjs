import test from "node:test";
import assert from "node:assert/strict";
import {
  createAgentDeadlineSignal,
  DEFAULT_AGENT_RUN_TIMEOUT_MS,
  isAgentDeadlineExceeded,
} from "../lib/orion-agent-deadline.mjs";

test("uses a bounded default deadline for an Agent run", () => {
  assert.equal(DEFAULT_AGENT_RUN_TIMEOUT_MS, 120_000);
  assert.throws(() => createAgentDeadlineSignal(null, 999), /between 1000 and 300000/);
  assert.throws(() => createAgentDeadlineSignal(null, 300_001), /between 1000 and 300000/);
});

test("preserves a caller cancellation signal", () => {
  const controller = new AbortController();
  const signal = createAgentDeadlineSignal(controller.signal, 10_000);
  assert.equal(signal.aborted, false);
  controller.abort(new DOMException("Cancelled by caller", "AbortError"));
  assert.equal(signal.aborted, true);
  assert.equal(signal.reason.name, "AbortError");
  assert.equal(isAgentDeadlineExceeded(signal), false);
});

test("distinguishes the Agent deadline from user cancellation", async () => {
  const signal = createAgentDeadlineSignal(null, 1_000);
  assert.equal(isAgentDeadlineExceeded(signal), false);
  await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
  assert.equal(signal.aborted, true);
  assert.equal(isAgentDeadlineExceeded(signal), true);
});
