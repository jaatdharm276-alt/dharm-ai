import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry, RETRYABLE_STATUS_CODES } from "../lib/orion-retry.mjs";

test("retries transient server responses and returns the successful response", async () => {
  let calls = 0;
  const delays = [];
  const response = await fetchWithRetry("https://example.test", {}, {
    fetchImpl: async () => (++calls < 3 ? new Response("", { status: 503 }) : new Response("ok", { status: 200 })),
    sleep: async (ms) => delays.push(ms),
    baseDelayMs: 10,
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
});

test("does not retry non-transient client errors", async () => {
  let calls = 0;
  const response = await fetchWithRetry("https://example.test", {}, {
    fetchImpl: async () => { calls += 1; return new Response("", { status: 400 }); },
    sleep: async () => assert.fail("must not sleep"),
  });
  assert.equal(response.status, 400);
  assert.equal(calls, 1);
});

test("retries transient network failures but propagates aborts", async () => {
  let calls = 0;
  const response = await fetchWithRetry("https://example.test", {}, {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("network unavailable");
      return new Response("ok", { status: 200 });
    },
    sleep: async () => {},
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);

  const abort = new DOMException("Aborted", "AbortError");
  await assert.rejects(fetchWithRetry("https://example.test", {}, {
    fetchImpl: async () => { throw abort; },
    sleep: async () => {},
  }), (error) => error === abort);
});

test("bounds retry count and exposes the transient status policy", async () => {
  let calls = 0;
  await fetchWithRetry("https://example.test", {}, {
    maxRetries: 99,
    fetchImpl: async () => { calls += 1; return new Response("", { status: 503 }); },
    sleep: async () => {},
  });
  assert.equal(calls, 4);
  assert.ok(RETRYABLE_STATUS_CODES.has(429));
  assert.ok(!RETRYABLE_STATUS_CODES.has(404));
});

test("honors a bounded Retry-After header", async () => {
  const delays = [];
  await fetchWithRetry("https://example.test", {}, {
    fetchImpl: async () => new Response("", { status: 429, headers: { "retry-after": "2" } }),
    sleep: async (ms) => delays.push(ms),
    maxRetries: 1,
    baseDelayMs: 10,
    maxDelayMs: 100,
  });
  assert.deepEqual(delays, [100]);
});
