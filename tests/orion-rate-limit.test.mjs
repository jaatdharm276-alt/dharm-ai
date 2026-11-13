import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter, getClientIdentifier } from "../lib/orion-rate-limit.mjs";

test("allows requests up to the configured limit and then blocks", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 100 });
  assert.deepEqual(limiter.check("client-a"), { allowed: true, limit: 2, remaining: 1, retryAfterMs: 0 });
  assert.deepEqual(limiter.check("client-a"), { allowed: true, limit: 2, remaining: 0, retryAfterMs: 0 });
  assert.deepEqual(limiter.check("client-a"), { allowed: false, limit: 2, remaining: 0, retryAfterMs: 1000 });
});

test("resets an expired window and isolates clients", () => {
  let time = 10;
  const limiter = createRateLimiter({ limit: 1, windowMs: 50, now: () => time });
  assert.equal(limiter.check("a").allowed, true);
  assert.equal(limiter.check("b").allowed, true);
  assert.equal(limiter.check("a").allowed, false);
  time = 60;
  assert.equal(limiter.check("a").allowed, true);
});

test("bounds bucket storage and validates configuration", () => {
  const limiter = createRateLimiter({ limit: 1, maxBuckets: 2, now: () => 1 });
  limiter.check("a");
  limiter.check("b");
  limiter.check("c");
  assert.equal(limiter.check("a").allowed, true);
  assert.throws(() => createRateLimiter({ limit: 0 }));
});

test("prefers the platform-provided real IP and falls back to forwarded IP", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.4, 10.0.0.1" });
  assert.equal(getClientIdentifier(headers), "203.0.113.7");
  assert.equal(getClientIdentifier(new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" })), "198.51.100.4");
  assert.equal(getClientIdentifier(new Headers()), "unknown");
});
