// Do not automatically retry 429 responses: providers such as Tavily keyless mode\n// may impose IP-based cooldowns (Retry-After can be minutes). Return the response\n// immediately so callers can surface the actual limit and cooldown to the agent.\nconst RETRYABLE_STATUS_CODES = new Set([408, 425, 500, 502, 503, 504]);\nconst RETRYABLE_STATUS_CODES = new Set([408, 425, 500, 502, 503, 504]);

function retryAfterMs(response, fallbackMs, maxDelayMs) {
  const value = response?.headers?.get?.("retry-after");
  if (!value) return fallbackMs;
  const seconds = Number(value);
  const parsed = Number.isFinite(seconds) && seconds >= 0
    ? seconds * 1000
    : Math.max(0, Date.parse(value) - Date.now());
  return Math.min(maxDelayMs, Math.max(fallbackMs, parsed || fallbackMs));
}

function wait(ms, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason || new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    function done() { cleanup(); resolve(); }
    function abort() {
      cleanup();
      reject(signal.reason || new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function fetchWithRetry(input, init = {}, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const maxRetries = Number.isInteger(options.maxRetries) ? Math.max(0, Math.min(3, options.maxRetries)) : 2;
  const baseDelayMs = Number.isFinite(options.baseDelayMs) ? Math.max(0, options.baseDelayMs) : 250;
  const maxDelayMs = Number.isFinite(options.maxDelayMs) ? Math.max(baseDelayMs, options.maxDelayMs) : 1500;
  const sleep = options.sleep || wait;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (init.signal?.aborted) throw init.signal.reason || new DOMException("Aborted", "AbortError");
    try {
      const response = await fetchImpl(input, init);
      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === maxRetries) return response;
      await sleep(retryAfterMs(response, Math.min(maxDelayMs, baseDelayMs * (2 ** attempt)), maxDelayMs), init.signal);
    } catch (error) {
      if (error?.name === "AbortError" || init.signal?.aborted) throw error;
      lastError = error;
      if (attempt === maxRetries) throw error;
      await sleep(Math.min(maxDelayMs, baseDelayMs * (2 ** attempt)), init.signal);
    }
  }
  throw lastError || new Error("Request failed after retry attempts.");
}

export { RETRYABLE_STATUS_CODES };
