const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 10;
const MAX_BUCKETS = 5_000;

export function getClientIdentifier(headers) {
  const direct = headers?.get?.("x-real-ip")?.trim();
  if (direct) return direct.slice(0, 128);

  const forwarded = headers?.get?.("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }

  return "unknown";
}

export function createRateLimiter({
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
  maxBuckets = MAX_BUCKETS,
  now = Date.now,
} = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("limit must be a positive integer");
  if (!Number.isInteger(windowMs) || windowMs < 1) throw new TypeError("windowMs must be a positive integer");
  if (!Number.isInteger(maxBuckets) || maxBuckets < 1) throw new TypeError("maxBuckets must be a positive integer");

  const buckets = new Map();

  return {
    check(identifier) {
      const key = String(identifier || "unknown").slice(0, 128);
      const timestamp = now();
      let bucket = buckets.get(key);

      if (!bucket || timestamp >= bucket.resetAt) {
        bucket = { count: 0, resetAt: timestamp + windowMs };
      }

      if (bucket.count >= limit) {
        buckets.set(key, bucket);
        return {
          allowed: false,
          limit,
          remaining: 0,
          retryAfterMs: Math.max(1, bucket.resetAt - timestamp),
        };
      }

      bucket.count += 1;
      buckets.delete(key);
      buckets.set(key, bucket);

      while (buckets.size > maxBuckets) {
        buckets.delete(buckets.keys().next().value);
      }

      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - bucket.count),
        retryAfterMs: 0,
      };
    },
  };
}

// This in-memory limiter is best-effort per running server instance.
// Use a shared Redis/KV limiter before relying on it across multiple serverless instances.
