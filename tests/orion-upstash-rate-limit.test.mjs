import test from "node:test";
import assert from "node:assert/strict";
import { createUpstashRateLimiter, normalizeUpstashConfig } from "../lib/orion-upstash-rate-limit.mjs";

const originalFetch = globalThis.fetch;
const originalEnv = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  nodeEnv: process.env.NODE_ENV,
};

function restore() {
  globalThis.fetch = originalFetch;
  for (const [key, value] of [
    ["UPSTASH_REDIS_REST_URL", originalEnv.url],
    ["UPSTASH_REDIS_REST_TOKEN", originalEnv.token],
    ["NODE_ENV", originalEnv.nodeEnv],
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("uses an atomic Redis fixed-window script and enforces the shared limit", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.NODE_ENV = "production";
  let count = 0;
  globalThis.fetch = async (_url, options) => {
    const command = JSON.parse(options.body);
    assert.equal(command[0], "EVAL");
    assert.equal(command[2], "1");
    assert.equal(command[4], "60000");
    count += 1;
    return new Response(JSON.stringify({ result: [count, 59000] }), { status: 200 });
  };
  try {
    const limiter = createUpstashRateLimiter({ limit: 2, windowMs: 60_000 });
    assert.equal((await limiter.check("client")).allowed, true);
    assert.equal((await limiter.check("client")).allowed, true);
    const blocked = await limiter.check("client");
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterMs, 59000);
  } finally {
    restore();
  }
});

test("fails closed in production when Redis credentials are missing", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.NODE_ENV = "production";
  try {
    const result = await createUpstashRateLimiter({ limit: 2 }).check("client");
    assert.equal(result.allowed, false);
    assert.equal(result.unavailable, true);
  } finally {
    restore();
  }
});

test("fails closed when the Upstash service errors", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.NODE_ENV = "production";
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    const result = await createUpstashRateLimiter({ limit: 2 }).check("client");
    assert.equal(result.allowed, false);
    assert.equal(result.unavailable, true);
  } finally {
    restore();
  }
});

test("redacts fetch exceptions so bearer credentials cannot leak into logs", async () => {
  const secret = "super-secret-test-token";
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = secret;
  process.env.NODE_ENV = "production";
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(" "));
  globalThis.fetch = async () => {
    throw new TypeError(`Request failed with Authorization: Bearer ${secret}`);
  };
  try {
    const result = await createUpstashRateLimiter({ limit: 2 }).check("client");
    assert.equal(result.unavailable, true);
    assert.equal(logged.length, 1);
    assert.equal(logged.join(" ").includes(secret), false);
  } finally {
    console.error = originalError;
    restore();
  }
});

test("rejects pasted multi-line env blocks and quoted credential values without making a request", async () => {
  const originalError = console.error;
  let calls = 0;
  process.env.NODE_ENV = "production";
  process.env.UPSTASH_REDIS_REST_URL = 'UPSTASH_REDIS_REST_URL="https://example.upstash.io"\nUPSTASH_REDIS_REST_TOKEN="secret"';
  process.env.UPSTASH_REDIS_REST_TOKEN = '"secret"';
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ result: [1, 60000] }), { status: 200 });
  };
  console.error = () => {};
  try {
    assert.equal(normalizeUpstashConfig(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN), null);
    const result = await createUpstashRateLimiter({ limit: 2 }).check("client");
    assert.equal(result.unavailable, true);
    assert.equal(calls, 0);
  } finally {
    console.error = originalError;
    restore();
  }
});
