export function parseVerifierOutput(value) {
  const raw = String(value ?? "").trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const verdict = ["PASS", "PARTIAL"].includes(String(parsed.verdict || "").toUpperCase())
        ? String(parsed.verdict).toUpperCase()
        : undefined;
      const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
      return { verdict, answer: answer || undefined };
    }
  } catch {
    // Keep compatibility with the legacy line-based verifier response.
  }
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const verdictLine = lines.find((line) => /^VERDICT:\s*(PASS|PARTIAL)\b/i.test(line));
  const verdict = verdictLine?.match(/^VERDICT:\s*(PASS|PARTIAL)\b/i)?.[1]?.toUpperCase();
  const answerStart = lines.findIndex((line) => /^ANSWER:\s*/i.test(line));

  if (answerStart < 0) return { verdict, answer: undefined };

  const firstAnswerLine = lines[answerStart].replace(/^ANSWER:\s*/i, "");
  const answerLines = [firstAnswerLine, ...lines.slice(answerStart + 1)];
  const findingsStart = answerLines.findIndex((line) => /^FINDINGS:\s*/i.test(line));
  const answer = answerLines.slice(0, findingsStart < 0 ? undefined : findingsStart).join("\n").trim();

  return { verdict, answer: answer || undefined };
}

export function buildVerifierEvidenceSummary(searchResults, maxChars = 9500) {
  const sources = (Array.isArray(searchResults) ? searchResults : [])
    .slice(0, 5)
    .map((source) => ({
      title: String(source?.title || "Web source").slice(0, 180),
      url: String(source?.url || "").slice(0, 500),
      evidence_mode: source?.contentMode === "full_page" ? "full_page" : "snippet",
      evidence: String(source?.content || source?.snippet || "").replace(/\s+/g, " ").slice(0, 1800),
    }));
  if (!sources.length) return "No web source content was collected.";
  return JSON.stringify({ untrusted_source_data: sources }).slice(0, maxChars);
}

const RETRYABLE_VERIFIER_STATUSES = new Set([408, 425, 500, 502, 503, 504]);
const RETRYABLE_VERIFIER_CODES = new Set([
  "GROQ_REQUEST_TIMEOUT",
  "GROQ_PROVIDER_UNAVAILABLE",
]);

function isRetryableVerifierError(error) {
  const rawStatus = error?.providerStatus ?? error?.status;
  if (rawStatus != null && rawStatus !== "") {
    const status = Number(rawStatus);
    if (Number.isInteger(status) && status > 0) {
      if (status === 429) return Number.isFinite(error?.retryAfterMs) && error.retryAfterMs > 0;
      return RETRYABLE_VERIFIER_STATUSES.has(status);
    }
  }
  return RETRYABLE_VERIFIER_CODES.has(String(error?.code || ""));
}

function waitForVerifierRetry(ms, signal) {
  if (signal?.aborted) {
    return Promise.reject(signal.reason || new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(signal.reason || new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/**
 * Retry the independent verifier once for transient provider failures only.
 * Validation/authentication errors and explicit aborts are never retried.
 */
export async function runVerifierWithRetry(run, { signal, maxRetries = 1, delayMs = 800, maxRetryAfterMs = 10_000, sleep = waitForVerifierRetry, onRetry } = {}) {
  const retries = Math.max(0, Math.min(2, Number.isInteger(maxRetries) ? maxRetries : 1));
  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");
    try {
      return await run(attempt);
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted || attempt >= retries || !isRetryableVerifierError(error)) {
        throw error;
      }
      const retryAfterMs = Number(error?.retryAfterMs);
      const boundedRetryAfter = Number.isFinite(retryAfterMs) && retryAfterMs > 0
        ? Math.min(Math.max(0, maxRetryAfterMs), retryAfterMs)
        : 0;
      const waitMs = Math.max(Math.max(0, delayMs) * (attempt + 1), boundedRetryAfter);
      if (typeof onRetry === "function") onRetry({ attempt: attempt + 1, waitMs, status: error?.providerStatus ?? error?.status ?? null, code: String(error?.code || "UNKNOWN").slice(0, 80) });
      await sleep(waitMs, signal);
    }
  }
}
