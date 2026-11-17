export const DEFAULT_AGENT_RUN_TIMEOUT_MS = 120_000;

export function createAgentDeadlineSignal(parentSignal, timeoutMs = DEFAULT_AGENT_RUN_TIMEOUT_MS) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) {
    throw new RangeError("Agent run timeout must be an integer between 1000 and 300000 milliseconds.");
  }
  const deadlineSignal = AbortSignal.timeout(timeoutMs);
  return parentSignal ? AbortSignal.any([parentSignal, deadlineSignal]) : deadlineSignal;
}

export function isAgentDeadlineExceeded(signal) {
  return signal?.aborted === true && signal.reason?.name === "TimeoutError";
}
