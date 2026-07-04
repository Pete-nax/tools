// Simple in-memory sliding-window rate limiter.
//
// Caveat: on serverless platforms each function instance has its own
// memory, so this limits abuse per warm instance rather than globally.
// It stops naive brute-force scripts and accidental retry loops. For
// stricter guarantees across all instances, back this with a shared
// store such as Upstash Redis or Vercel KV.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

export function checkRateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count += 1;
  return true;
}

// Periodically clear stale buckets so memory doesn't grow unbounded
// across a long-lived warm instance.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart > WINDOW_MS * 5) buckets.delete(key);
  }
}, WINDOW_MS * 5).unref?.();
