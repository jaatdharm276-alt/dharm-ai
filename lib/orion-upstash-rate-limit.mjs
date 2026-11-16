import { createRateLimiter } from "./orion-rate-limit.mjs";

const LUA_FIXED_WINDOW = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return { count, ttl }",
].join("\n");

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeUpstashConfig(rawUrl, rawToken) {
  const url = String(rawUrl || "").trim();
  const token = String(rawToken || "").trim();
  if (!url || !token || /[\r\n"'\s]/.test(token) || /[\r\n"'\s]/.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return null;
    }
    if (parsed.pathname !== "/" && parsed.pathname !== "") return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/$/, ""), token };
}

export function createUpstashRateLimiter({ limit, windowMs, prefix = "orion:rate" }) {
  const local = createRateLimiter({ limit, windowMs });
  return {
    async check(identifier) {
      const config = normalizeUpstashConfig(
        process.env.UPSTASH_REDIS_REST_URL,
        process.env.UPSTASH_REDIS_REST_TOKEN,
      );
      if (!config) {
        if (process.env.NODE_ENV !== "production") return local.check(identifier);
        return { allowed: false, unavailable: true, limit, remaining: 0, retryAfterMs: 0 };
      }

      try {
        const key = `${prefix}:${await digest(String(identifier || "unknown").slice(0, 128))}`;
        const response = await fetch(config.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(["EVAL", LUA_FIXED_WINDOW, "1", key, String(windowMs)]),
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Upstash returned HTTP ${response.status}`);
        const payload = await response.json();
        const result = payload?.result;
        if (!Array.isArray(result) || !Number.isFinite(Number(result[0]))) {
          throw new Error("Upstash returned an invalid rate-limit response");
        }
        const count = Number(result[0]);
        const ttl = Math.max(1, Number(result[1]) || windowMs);
        return {
          allowed: count <= limit,
          limit,
          remaining: Math.max(0, limit - count),
          retryAfterMs: count <= limit ? 0 : ttl,
        };
      } catch {
        // Do not log fetch exceptions: some runtimes include request headers,
        // which can contain the Upstash bearer token, in exception messages.
        console.error("ORION shared rate limiter unavailable (details redacted).");
        return { allowed: false, unavailable: true, limit, remaining: 0, retryAfterMs: 0 };
      }
    },
  };
}
