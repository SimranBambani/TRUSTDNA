import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Sliding-Window API Rate Limiter
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitTracker>();

/** Cleanup stale rate limit records every 5 minutes */
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, tracker] of store.entries()) {
    if (tracker.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

export function rateLimit(req: NextRequest, options: { maxRequests: number; windowMs: number; keyPrefix?: string }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const key = `${options.keyPrefix || "global"}:${ip}`;
  const now = Date.now();

  let tracker = store.get(key);

  if (!tracker || tracker.resetAt <= now) {
    tracker = { count: 1, resetAt: now + options.windowMs };
    store.set(key, tracker);
    return { success: true, remaining: options.maxRequests - 1, resetAt: tracker.resetAt };
  }

  tracker.count++;

  if (tracker.count > options.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: tracker.resetAt,
      response: NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfterMs: tracker.resetAt - now,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((tracker.resetAt - now) / 1000).toString(),
            "X-RateLimit-Limit": options.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(tracker.resetAt / 1000).toString(),
          },
        }
      ),
    };
  }

  return {
    success: true,
    remaining: options.maxRequests - tracker.count,
    resetAt: tracker.resetAt,
  };
}
